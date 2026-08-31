import mongoose from 'mongoose';

import { ROLES } from '../constants/domain.js';
import { Hub } from '../models/Hub.js';
import { Item } from '../models/Item.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { deleteImage, uploadBuffer } from '../services/cloudinaryService.js';
import { lockActiveUsers, lockManagedHub } from '../services/lifecycleService.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createCode, slugify } from '../utils/identifiers.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hubPopulation = [{ path: 'managers', select: 'name avatar role' }];

const validateManagers = async (managerIds = []) => {
  const unique = [...new Set(managerIds.map(String))];
  if (!unique.length) return [];
  const count = await User.countDocuments({
    _id: { $in: unique },
    role: { $in: [ROLES.MANAGER, ROLES.ADMIN] },
    active: true,
  });
  if (count !== unique.length) {
    throw new AppError(
      'Todos los responsables deben ser managers o admins activos',
      422,
      'INVALID_MANAGER',
    );
  }
  return unique;
};

export const listHubs = async (req, res) => {
  const query = req.validated.query;
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  const canSeeInactive = req.user?.role === ROLES.ADMIN && query.includeInactive;
  if (!canSeeInactive) filter.active = true;
  if (query.district) filter.district = new RegExp(`^${escapeRegex(query.district)}$`, 'i');
  if (query.q) {
    const expression = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: expression }, { district: expression }, { description: expression }];
  }

  const [hubs, total] = await Promise.all([
    Hub.find(filter).populate(hubPopulation).sort({ name: 1 }).skip(skip).limit(limit),
    Hub.countDocuments(filter),
  ]);
  return sendSuccess(res, { data: hubs, meta: paginationMeta({ page, limit, total }) });
};

export const getHub = async (req, res) => {
  const value = req.validated.params.idOrSlug;
  const selector = mongoose.isValidObjectId(value)
    ? { _id: value }
    : { $or: [{ slug: value.toLowerCase() }, { code: value.toUpperCase() }] };
  if (req.user?.role !== ROLES.ADMIN) selector.active = true;

  const hub = await Hub.findOne(selector).populate(hubPopulation);
  if (!hub) throw new AppError('Nodo no encontrado', 404, 'HUB_NOT_FOUND');
  return sendSuccess(res, { data: hub });
};

export const createHub = async (req, res) => {
  const input = { ...req.validated.body };
  input.managers = await validateManagers(input.managers);
  let image;
  if (req.file) image = await uploadBuffer(req.file.buffer, 'hubs');
  const session = await mongoose.startSession();
  let hubId;

  try {
    await session.withTransaction(async () => {
      const locked = await lockActiveUsers([req.user._id, ...input.managers], session);
      const actor = locked.get(String(req.user._id));
      if (actor.role !== ROLES.ADMIN) {
        throw new AppError('Solo un admin puede crear nodos', 403, 'FORBIDDEN');
      }
      for (const managerId of input.managers) {
        const manager = locked.get(String(managerId));
        if (![ROLES.MANAGER, ROLES.ADMIN].includes(manager.role)) {
          throw new AppError(
            'Los responsables deben ser managers o admins',
            422,
            'INVALID_MANAGER',
          );
        }
      }
      const [hub] = await Hub.create(
        [
          {
            ...input,
            active: true,
            code: input.code ?? createCode('HUB'),
            slug: input.slug ?? `${slugify(input.name)}-${createCode('N').slice(-6).toLowerCase()}`,
            location: { type: 'Point', coordinates: [input.longitude, input.latitude] },
            image,
            createdBy: actor._id,
          },
        ],
        { session },
      );
      hubId = hub._id;
    });
  } catch (error) {
    if (image?.publicId) await deleteImage(image.publicId);
    throw error;
  } finally {
    await session.endSession();
  }
  const hub = await Hub.findById(hubId).populate(hubPopulation);
  return sendSuccess(res, { statusCode: 201, message: 'Nodo creado', data: hub });
};

export const updateHub = async (req, res) => {
  const { id } = req.validated.params;
  const input = { ...req.validated.body };
  if (input.active !== undefined) {
    throw new AppError(
      'Usa DELETE para archivar un nodo; la reactivación requiere una operación administrativa dedicada',
      409,
      'USE_HUB_DELETE',
    );
  }
  if (input.managers !== undefined) {
    throw new AppError('Usa las rutas de asignación de responsables', 409, 'USE_MANAGER_ENDPOINT');
  }
  let image;
  if (req.file) image = await uploadBuffer(req.file.buffer, 'hubs');
  let oldPublicId;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const locked = await lockActiveUsers([req.user._id], session);
      const actor = locked.get(String(req.user._id));
      const hub = await lockManagedHub(id, actor, session);
      if (actor.role !== ROLES.ADMIN) {
        const protectedFields = ['code', 'slug', 'active'];
        if (protectedFields.some((field) => input[field] !== undefined)) {
          throw new AppError(
            'Solo un admin puede modificar campos administrativos',
            403,
            'PROTECTED_HUB_FIELDS',
          );
        }
      }
      oldPublicId = hub.image?.publicId;
      const { latitude, longitude, ...fields } = input;
      Object.assign(hub, fields);
      if (latitude !== undefined || longitude !== undefined) {
        hub.location = {
          type: 'Point',
          coordinates: [
            longitude ?? hub.location.coordinates[0],
            latitude ?? hub.location.coordinates[1],
          ],
        };
      }
      if (image) hub.image = image;
      await hub.save({ session });
    });
  } catch (error) {
    if (image?.publicId) await deleteImage(image.publicId);
    throw error;
  } finally {
    await session.endSession();
  }
  if (image && oldPublicId) await deleteImage(oldPublicId);
  const hub = await Hub.findById(id);
  await hub.populate(hubPopulation);
  return sendSuccess(res, { message: 'Nodo actualizado', data: hub });
};

export const deleteHub = async (req, res) => {
  const { id } = req.validated.params;
  const session = await mongoose.startSession();
  let hubImagePublicId;
  let itemImagePublicIds = [];
  let itemIds = [];

  try {
    await session.withTransaction(async () => {
      const locked = await lockActiveUsers([req.user._id], session);
      const actor = locked.get(String(req.user._id));
      if (actor.role !== ROLES.ADMIN) {
        throw new AppError('Solo un admin puede archivar nodos', 403, 'FORBIDDEN');
      }
      const hub = await lockManagedHub(id, actor, session);
      const items = await Item.find({ hub: id, deletedAt: null })
        .select('_id image')
        .session(session);
      hubImagePublicId = hub.image?.publicId;
      itemImagePublicIds = items.map((item) => item.image?.publicId).filter(Boolean);
      itemIds = items.map((item) => item._id);
      const futureReservation = await Reservation.exists({
        hub: id,
        $or: [
          { status: { $in: ['collected', 'overdue'] } },
          { status: { $in: ['requested', 'approved'] }, endDate: { $gt: new Date() } },
        ],
      }).session(session);
      if (futureReservation) {
        throw new AppError('El nodo tiene reservas activas o futuras', 409, 'HUB_HAS_RESERVATIONS');
      }
      hub.active = false;
      hub.deletedAt = new Date();
      hub.managers = [];
      hub.image = {};
      await hub.save({ session });
      await Item.updateMany(
        { hub: id, deletedAt: null },
        {
          $set: { status: 'retired', deletedAt: new Date(), image: {} },
          $inc: { bookingVersion: 1 },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  await Promise.all([
    User.updateMany({ preferredHub: id }, { $set: { preferredHub: null } }),
    itemIds.length
      ? User.updateMany(
          { favoriteItems: { $in: itemIds } },
          { $pull: { favoriteItems: { $in: itemIds } } },
        )
      : Promise.resolve(),
    deleteImage(hubImagePublicId),
    ...itemImagePublicIds.map((publicId) => deleteImage(publicId)),
  ]);
  res.status(204).end();
};

export const addManager = async (req, res) => {
  const { id, userId } = req.validated.params;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const locked = await lockActiveUsers([req.user._id, userId], session);
      const actor = locked.get(String(req.user._id));
      const user = locked.get(String(userId));
      if (actor.role !== ROLES.ADMIN) {
        throw new AppError('Solo un admin puede asignar responsables', 403, 'FORBIDDEN');
      }
      if (![ROLES.MANAGER, ROLES.ADMIN].includes(user.role)) {
        throw new AppError('El usuario debe ser manager o admin activo', 422, 'INVALID_MANAGER');
      }
      const hub = await lockManagedHub(id, actor, session);
      hub.managers.addToSet(user._id);
      await hub.save({ session });
    });
  } finally {
    await session.endSession();
  }
  const hub = await Hub.findById(id).populate(hubPopulation);
  return sendSuccess(res, { message: 'Responsable asignado', data: hub });
};

export const removeManager = async (req, res) => {
  const { id, userId } = req.validated.params;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const locked = await lockActiveUsers([req.user._id, userId], session);
      const actor = locked.get(String(req.user._id));
      if (actor.role !== ROLES.ADMIN) {
        throw new AppError('Solo un admin puede desasignar responsables', 403, 'FORBIDDEN');
      }
      const hub = await lockManagedHub(id, actor, session);
      hub.managers.pull(userId);
      await hub.save({ session });
    });
  } finally {
    await session.endSession();
  }
  const hub = await Hub.findById(id).populate(hubPopulation);
  return sendSuccess(res, { message: 'Responsable desasignado', data: hub });
};
