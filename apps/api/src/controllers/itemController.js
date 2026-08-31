import mongoose from 'mongoose';

import { BLOCKING_RESERVATION_STATUSES } from '../constants/domain.js';
import { User } from '../models/User.js';
import { Hub } from '../models/Hub.js';
import { Item } from '../models/Item.js';
import { Reservation } from '../models/Reservation.js';
import { deleteImage, uploadBuffer } from '../services/cloudinaryService.js';
import { lockActiveUsers, lockManagedHub } from '../services/lifecycleService.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createCode, slugify } from '../utils/identifiers.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { itemSelector } from '../utils/resourceSelectors.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const itemPopulation = { path: 'hub', select: 'name slug district address image active' };

export const listItems = async (req, res) => {
  const query = req.validated.query;
  if ((query.from && !query.to) || (!query.from && query.to)) {
    throw new AppError('Debes indicar from y to juntos', 422, 'INCOMPLETE_DATE_RANGE');
  }
  if (query.from && query.to <= query.from) {
    throw new AppError('El intervalo de disponibilidad no es válido', 422, 'INVALID_DATE_RANGE');
  }

  const { page, limit, skip } = getPagination(query);
  const activeHubIds = await Hub.find({ active: true }).distinct('_id');
  const hubIdentifier = query.hub ?? query.centro;
  let selectedHubId;
  if (hubIdentifier) {
    const selectedHub = mongoose.isValidObjectId(hubIdentifier)
      ? await Hub.findOne({ _id: hubIdentifier, active: true }).select('_id')
      : await Hub.findOne({
          active: true,
          $or: [{ slug: hubIdentifier.toLowerCase() }, { code: hubIdentifier.toUpperCase() }],
        }).select('_id');
    selectedHubId = selectedHub?._id;
  }
  const filter = {
    deletedAt: null,
    hub: selectedHubId ?? (hubIdentifier ? { $exists: false } : { $in: activeHubIds }),
  };
  if (hubIdentifier && !selectedHubId) {
    filter._id = { $exists: false };
  }
  if (query.category) filter.category = query.category;
  filter.status = query.status ?? { $ne: 'retired' };
  if (query.available === true) filter.status = 'available';
  const search = query.q ?? query.search;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: expression }, { description: expression }, { tags: expression }];
  }
  if (query.from && query.to) {
    const occupied = await Reservation.find({
      status: { $in: BLOCKING_RESERVATION_STATUSES },
      startDate: { $lt: query.to },
      endDate: { $gt: query.from },
    }).distinct('item');
    filter._id = { ...(filter._id ?? {}), $nin: occupied };
    filter.status = 'available';
  }

  const sorts = {
    newest: { createdAt: -1 },
    name: { name: 1 },
    loans: { totalLoans: -1, name: 1 },
  };
  const sort = sorts[query.sort] ?? { createdAt: -1 };
  const [items, total] = await Promise.all([
    Item.find(filter).populate(itemPopulation).sort(sort).skip(skip).limit(limit),
    Item.countDocuments(filter),
  ]);
  return sendSuccess(res, { data: items, meta: paginationMeta({ page, limit, total }) });
};

export const getItem = async (req, res) => {
  const item = await Item.findOne({
    ...itemSelector(req.validated.params.id),
    deletedAt: null,
    status: { $ne: 'retired' },
  }).populate(itemPopulation);
  if (!item || !item.hub?.active) throw new AppError('Objeto no encontrado', 404, 'ITEM_NOT_FOUND');
  return sendSuccess(res, { data: item });
};

export const createItem = async (req, res) => {
  const { hubId } = req.validated.params;
  const input = req.validated.body;
  let image;
  if (req.file) image = await uploadBuffer(req.file.buffer, 'items');
  const session = await mongoose.startSession();
  let itemId;

  try {
    await session.withTransaction(async () => {
      const locked = await lockActiveUsers([req.user._id], session);
      const actor = locked.get(String(req.user._id));
      const hub = await lockManagedHub(hubId, actor, session);
      const [item] = await Item.create(
        [
          {
            ...input,
            code: input.code ?? createCode('ITM'),
            slug: input.slug ?? `${slugify(input.name)}-${createCode('I').slice(-6).toLowerCase()}`,
            hub: hub._id,
            image,
            createdBy: actor._id,
          },
        ],
        { session },
      );
      itemId = item._id;
    });
  } catch (error) {
    if (image?.publicId) await deleteImage(image.publicId);
    throw error;
  } finally {
    await session.endSession();
  }
  const item = await Item.findById(itemId).populate(itemPopulation);
  return sendSuccess(res, { statusCode: 201, message: 'Objeto creado', data: item });
};

export const updateItem = async (req, res) => {
  const { id } = req.validated.params;
  const snapshot = await Item.findOne({
    _id: id,
    deletedAt: null,
    status: { $ne: 'retired' },
  }).select('_id hub');
  if (!snapshot) throw new AppError('Objeto no encontrado', 404, 'ITEM_NOT_FOUND');

  const input = req.validated.body;
  let image;
  if (req.file) image = await uploadBuffer(req.file.buffer, 'items');
  let oldPublicId;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const users = await lockActiveUsers([req.user._id], session);
      const actor = users.get(String(req.user._id));
      await lockManagedHub(snapshot.hub, actor, session);
      const locked = await Item.findOneAndUpdate(
        {
          _id: id,
          hub: snapshot.hub,
          deletedAt: null,
          status: { $ne: 'retired' },
        },
        { $inc: { bookingVersion: 1 } },
        { returnDocument: 'after', session },
      ).select('+bookingVersion');
      if (!locked) throw new AppError('Objeto no encontrado', 404, 'ITEM_NOT_FOUND');
      oldPublicId = locked.image?.publicId;

      if (input.status && input.status !== 'available') {
        const futureReservation = await Reservation.exists({
          item: id,
          $or: [
            { status: { $in: ['collected', 'overdue'] } },
            { status: { $in: ['requested', 'approved'] }, endDate: { $gt: new Date() } },
          ],
        }).session(session);
        if (futureReservation) {
          throw new AppError(
            'No puedes retirar un objeto con reservas activas o futuras',
            409,
            'ITEM_HAS_RESERVATIONS',
          );
        }
      }

      Object.assign(locked, input);
      if (image) locked.image = image;
      await locked.save({ session });
    });
  } catch (error) {
    if (image?.publicId) await deleteImage(image.publicId);
    throw error;
  } finally {
    await session.endSession();
  }

  if (image && oldPublicId) await deleteImage(oldPublicId);
  const updated = await Item.findById(id).populate(itemPopulation);
  return sendSuccess(res, { message: 'Objeto actualizado', data: updated });
};

export const deleteItem = async (req, res) => {
  const { id } = req.validated.params;
  const snapshot = await Item.findOne({
    _id: id,
    deletedAt: null,
    status: { $ne: 'retired' },
  }).select('_id hub');
  if (!snapshot) throw new AppError('Objeto no encontrado', 404, 'ITEM_NOT_FOUND');
  const session = await mongoose.startSession();
  let imagePublicId;

  try {
    await session.withTransaction(async () => {
      const users = await lockActiveUsers([req.user._id], session);
      const actor = users.get(String(req.user._id));
      await lockManagedHub(snapshot.hub, actor, session);
      const item = await Item.findOneAndUpdate(
        {
          _id: id,
          hub: snapshot.hub,
          deletedAt: null,
          status: { $ne: 'retired' },
        },
        { $inc: { bookingVersion: 1 } },
        { returnDocument: 'after', session },
      ).select('+bookingVersion');
      if (!item) throw new AppError('Objeto no encontrado', 404, 'ITEM_NOT_FOUND');
      imagePublicId = item.image?.publicId;
      const futureReservation = await Reservation.exists({
        item: id,
        $or: [
          { status: { $in: ['collected', 'overdue'] } },
          { status: { $in: ['requested', 'approved'] }, endDate: { $gt: new Date() } },
        ],
      }).session(session);
      if (futureReservation) {
        throw new AppError(
          'El objeto tiene reservas activas o futuras',
          409,
          'ITEM_HAS_RESERVATIONS',
        );
      }
      item.status = 'retired';
      item.deletedAt = new Date();
      item.image = {};
      await item.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await Promise.all([
    User.updateMany({ favoriteItems: id }, { $pull: { favoriteItems: id } }),
    deleteImage(imagePublicId),
  ]);
  res.status(204).end();
};
