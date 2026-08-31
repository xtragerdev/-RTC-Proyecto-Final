import { ROLES } from '../constants/domain.js';
import { Hub } from '../models/Hub.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const lockActiveUsers = async (userIds, session) => {
  const ids = [...new Set(userIds.map(String))].sort();
  const lockedUsers = new Map();

  for (const id of ids) {
    const user = await User.findOneAndUpdate(
      { _id: id, active: true },
      { $inc: { lifecycleVersion: 1 } },
      { returnDocument: 'after', session },
    ).select('+lifecycleVersion');
    if (!user) {
      throw new AppError('La cuenta ya no está activa', 409, 'INACTIVE_ACCOUNT');
    }
    lockedUsers.set(id, user);
  }

  return lockedUsers;
};

export const lockAdminGuard = async (session) => {
  const guard = await User.findOneAndUpdate(
    { role: ROLES.ADMIN, active: true },
    { $inc: { lifecycleVersion: 1 } },
    { sort: { _id: 1 }, returnDocument: 'after', session },
  ).select('+lifecycleVersion');
  if (!guard) throw new AppError('No queda ningún administrador activo', 409, 'LAST_ADMIN');
  return guard;
};

export const lockActiveHub = async (hubId, session) => {
  const hub = await Hub.findOneAndUpdate(
    { _id: hubId, active: true },
    { $inc: { lifecycleVersion: 1 } },
    { returnDocument: 'after', session },
  ).select('+lifecycleVersion');
  if (!hub) throw new AppError('El nodo ya no está activo', 409, 'HUB_NOT_ACTIVE');
  return hub;
};

export const lockManagedHub = async (hubId, actor, session) => {
  const filter = { _id: hubId, active: true };
  if (actor.role === ROLES.MANAGER) filter.managers = actor._id;
  if (![ROLES.MANAGER, ROLES.ADMIN].includes(actor.role)) {
    throw new AppError('No tienes permisos para gestionar este nodo', 403, 'HUB_FORBIDDEN');
  }

  const hub = await Hub.findOneAndUpdate(
    filter,
    { $inc: { lifecycleVersion: 1 } },
    { returnDocument: 'after', session },
  ).select('+lifecycleVersion');
  if (!hub) throw new AppError('No gestionas este nodo activo', 403, 'HUB_FORBIDDEN');
  return hub;
};
