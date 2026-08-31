import { ROLES } from '../constants/domain.js';
import { Hub } from '../models/Hub.js';
import { AppError } from '../utils/AppError.js';

export const getManagedHubIds = async (user) => {
  if (user.role === ROLES.ADMIN) return null;
  return Hub.find({ managers: user._id, active: true }).distinct('_id');
};

export const canManageHub = async (user, hubId) => {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role !== ROLES.MANAGER) return false;
  return Boolean(await Hub.exists({ _id: hubId, managers: user._id, active: true }));
};

export const requireHubManagement = async (user, hubId) => {
  if (!(await canManageHub(user, hubId))) {
    throw new AppError('No gestionas este nodo', 403, 'HUB_FORBIDDEN');
  }
};

export const canAccessReservation = async (user, reservation) => {
  if (user.role === ROLES.ADMIN || String(reservation.user) === String(user._id)) return true;
  return canManageHub(user, reservation.hub);
};
