import mongoose from 'mongoose';

import { ROLES } from '../constants/domain.js';
import { Hub } from '../models/Hub.js';
import { Item } from '../models/Item.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';
import { deleteImage, uploadBuffer } from '../services/cloudinaryService.js';
import { lockActiveHub, lockActiveUsers, lockAdminGuard } from '../services/lifecycleService.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const publicUserQuery = (query) =>
  query
    .select('-externalCode')
    .populate('preferredHub', 'name slug district image')
    .populate('favoriteItems', 'name slug image category status');

const assertSelfOrAdmin = (actor, targetId) => {
  if (actor.role !== ROLES.ADMIN && String(actor._id) !== String(targetId)) {
    throw new AppError('Solo puedes gestionar tu propia cuenta', 403, 'USER_FORBIDDEN');
  }
};

const assertAdminCanExit = async (user, session) => {
  if (user.role !== ROLES.ADMIN || !user.active) return;
  const activeAdmins = await User.countDocuments({ role: ROLES.ADMIN, active: true }).session(
    session,
  );
  if (activeAdmins <= 1) {
    throw new AppError('No se puede desactivar al último administrador', 409, 'LAST_ADMIN');
  }
};

export const listUsers = async (req, res) => {
  const query = req.validated.query;
  const { page, limit, skip } = getPagination(query);
  const filter = { deletedAt: null };
  if (query.role) filter.role = query.role;
  if (query.active !== undefined) filter.active = query.active;
  if (query.q) {
    const expression = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: expression }, { email: expression }];
  }

  const [users, total] = await Promise.all([
    publicUserQuery(User.find(filter)).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return sendSuccess(res, { data: users, meta: paginationMeta({ page, limit, total }) });
};

export const getUser = async (req, res) => {
  assertSelfOrAdmin(req.user, req.validated.params.id);
  const user = await publicUserQuery(User.findById(req.validated.params.id));
  if (!user) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  return sendSuccess(res, { data: user });
};

export const updateUser = async (req, res) => {
  const id = req.validated.params.id;
  assertSelfOrAdmin(req.user, id);
  const changes = { ...req.validated.body };

  let nextAvatar;
  if (req.file) nextAvatar = await uploadBuffer(req.file.buffer, 'avatars');
  let oldPublicId;
  let updatedUser;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const locked = await lockActiveUsers([req.user._id, id], session);
      const actor = locked.get(String(req.user._id));
      const user = locked.get(String(id));
      if (!user) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
      if (actor.role !== ROLES.ADMIN && String(actor._id) !== String(user._id)) {
        throw new AppError('Solo puedes gestionar tu propia cuenta', 403, 'USER_FORBIDDEN');
      }
      if (changes.preferredHub) await lockActiveHub(changes.preferredHub, session);
      oldPublicId = user.avatar?.publicId;
      Object.assign(user, changes);
      if (nextAvatar) user.avatar = nextAvatar;
      await user.save({ session });
      updatedUser = user;
    });
  } catch (error) {
    if (nextAvatar?.publicId) await deleteImage(nextAvatar.publicId);
    throw error;
  } finally {
    await session.endSession();
  }

  if (nextAvatar && oldPublicId) await deleteImage(oldPublicId);
  return sendSuccess(res, { message: 'Perfil actualizado', data: updatedUser });
};

export const updateRole = async (req, res) => {
  const id = req.validated.params.id;
  const { role } = req.validated.body;
  const session = await mongoose.startSession();
  let updatedUser;
  try {
    await session.withTransaction(async () => {
      const snapshot = await User.findById(id).session(session);
      if (!snapshot) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
      if (!snapshot.active) {
        throw new AppError(
          'No puedes cambiar el rol de una cuenta inactiva',
          409,
          'INACTIVE_ACCOUNT',
        );
      }
      if (snapshot.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
        await lockAdminGuard(session);
      }
      const locked = await lockActiveUsers([req.user._id, id], session);
      const actor = locked.get(String(req.user._id));
      const user = locked.get(String(id));
      if (actor.role !== ROLES.ADMIN) {
        throw new AppError('Solo un admin puede cambiar roles', 403, 'FORBIDDEN');
      }
      if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
        await assertAdminCanExit(user, session);
      }
      if (role === ROLES.MEMBER) {
        const assigned = await Hub.exists({ managers: user._id }).session(session);
        if (assigned) {
          throw new AppError(
            'Desasigna primero al responsable de todos sus nodos',
            409,
            'MANAGER_STILL_ASSIGNED',
          );
        }
      }
      user.role = role;
      await user.save({ session });
      updatedUser = user;
    });
  } finally {
    await session.endSession();
  }
  return sendSuccess(res, { message: 'Rol actualizado', data: updatedUser });
};

export const deleteUser = async (req, res) => {
  const id = req.validated.params.id;
  assertSelfOrAdmin(req.user, id);
  const session = await mongoose.startSession();
  let deletedAvatarPublicId;
  try {
    await session.withTransaction(async () => {
      const snapshot = await User.findById(id).session(session);
      if (!snapshot) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
      if (snapshot.role === ROLES.ADMIN && snapshot.active) await lockAdminGuard(session);
      const locked = await lockActiveUsers([req.user._id, id], session);
      const actor = locked.get(String(req.user._id));
      const user = locked.get(String(id));
      if (actor.role !== ROLES.ADMIN && String(actor._id) !== String(user._id)) {
        throw new AppError('Solo puedes gestionar tu propia cuenta', 403, 'USER_FORBIDDEN');
      }
      await assertAdminCanExit(user, session);
      deletedAvatarPublicId = user.avatar?.publicId;
      const checkedOut = await Reservation.exists({
        user: user._id,
        status: { $in: ['collected', 'overdue'] },
      }).session(session);
      if (checkedOut) {
        throw new AppError(
          'La cuenta tiene un préstamo pendiente de devolución',
          409,
          'USER_HAS_ACTIVE_LOAN',
        );
      }
      const itemIds = await Reservation.find({
        user: user._id,
        status: { $in: ['requested', 'approved'] },
        endDate: { $gt: new Date() },
      })
        .session(session)
        .distinct('item');
      await Hub.updateMany(
        { managers: user._id },
        { $pull: { managers: user._id }, $inc: { lifecycleVersion: 1 } },
        { session },
      );
      await Reservation.updateMany(
        {
          user: user._id,
          status: { $in: ['requested', 'approved'] },
          endDate: { $gt: new Date() },
        },
        { status: 'cancelled', cancelledAt: new Date(), cancelledBy: req.user._id },
        { session },
      );
      if (itemIds.length) {
        await Item.updateMany(
          { _id: { $in: itemIds } },
          { $inc: { bookingVersion: 1 } },
          { session },
        );
      }
      await User.updateOne(
        { _id: user._id },
        {
          $set: { active: false, deletedAt: new Date(), favoriteItems: [] },
          $unset: { avatar: 1 },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  if (deletedAvatarPublicId) await deleteImage(deletedAvatarPublicId);
  res.status(204).end();
};

export const updateMe = (req, res) => {
  req.validated.params = { id: req.user._id.toString() };
  return updateUser(req, res);
};

export const deleteMe = (req, res) => {
  req.validated = { body: {}, query: {}, params: { id: req.user._id.toString() } };
  return deleteUser(req, res);
};

export const addFavorite = async (req, res) => {
  const { itemId } = req.validated.params;
  const snapshot = await Item.findOne({
    _id: itemId,
    deletedAt: null,
    status: { $ne: 'retired' },
  }).select('_id hub');
  if (!snapshot) throw new AppError('Objeto no encontrado', 404, 'ITEM_NOT_FOUND');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await lockActiveUsers([req.user._id], session);
      await lockActiveHub(snapshot.hub, session);
      const item = await Item.findOneAndUpdate(
        {
          _id: itemId,
          hub: snapshot.hub,
          deletedAt: null,
          status: { $ne: 'retired' },
        },
        { $inc: { bookingVersion: 1 } },
        { returnDocument: 'after', session },
      ).select('+bookingVersion');
      if (!item) throw new AppError('Objeto no encontrado', 404, 'ITEM_NOT_FOUND');
      await User.updateOne(
        { _id: req.user._id, active: true },
        { $addToSet: { favoriteItems: itemId } },
        { runValidators: true, session },
      );
    });
  } finally {
    await session.endSession();
  }
  const user = await User.findById(req.user._id).populate(
    'favoriteItems',
    'name slug image category status',
  );
  return sendSuccess(res, { message: 'Añadido a favoritos', data: user.favoriteItems });
};

export const removeFavorite = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await lockActiveUsers([req.user._id], session);
      await User.updateOne(
        { _id: req.user._id, active: true },
        { $pull: { favoriteItems: req.validated.params.itemId } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  const user = await User.findById(req.user._id).populate(
    'favoriteItems',
    'name slug image category status',
  );
  return sendSuccess(res, { message: 'Eliminado de favoritos', data: user.favoriteItems });
};
