import { ROLES } from '../constants/domain.js';
import { Hub } from '../models/Hub.js';
import { Reservation } from '../models/Reservation.js';
import {
  canAccessReservation,
  canManageHub,
  getManagedHubIds,
} from '../services/authorizationService.js';
import {
  createReservationSafely,
  transitionReservation,
  updateReservationSafely,
} from '../services/reservationService.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';

const populateReservation = (query) =>
  query
    .populate('user', 'name email avatar district')
    .populate('item', 'name slug image category status maxLoanDays')
    .populate('hub', 'name slug district image');

const getReservationOrThrow = async (id) => {
  const reservation = await Reservation.findById(id);
  if (!reservation) throw new AppError('Reserva no encontrada', 404, 'RESERVATION_NOT_FOUND');
  return reservation;
};

export const createReservation = async (req, res) => {
  const { item, startDate, endDate, memberNote } = req.validated.body;
  const reservation = await createReservationSafely({
    userId: req.user._id,
    itemIdentifier: item,
    startDate,
    endDate,
    memberNote,
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Solicitud de reserva creada',
    data: reservation,
  });
};

export const listReservations = async (req, res) => {
  const query = req.validated.query;
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (req.user.role === ROLES.MEMBER) {
    filter.user = req.user._id;
  } else if (req.user.role === ROLES.MANAGER) {
    const managedHubIds = await getManagedHubIds(req.user);
    filter.$or = [{ user: req.user._id }, { hub: { $in: managedHubIds } }];
  }

  if (query.status) filter.status = query.status;
  if (query.hub) {
    if (req.user.role === ROLES.MANAGER && !(await canManageHub(req.user, query.hub))) {
      throw new AppError('No gestionas este nodo', 403, 'HUB_FORBIDDEN');
    }
    if (req.user.role === ROLES.MEMBER) {
      throw new AppError('No puedes filtrar reservas de un nodo', 403, 'RESERVATION_FORBIDDEN');
    }
    filter.hub = query.hub;
  }
  if (query.user) {
    if (req.user.role !== ROLES.ADMIN && String(query.user) !== String(req.user._id)) {
      throw new AppError('No puedes consultar las reservas de otro usuario', 403, 'USER_FORBIDDEN');
    }
    filter.user = query.user;
  }
  if (query.from || query.to) {
    filter.startDate = {};
    if (query.from) filter.startDate.$gte = query.from;
    if (query.to) filter.startDate.$lt = query.to;
  }

  const [reservations, total] = await Promise.all([
    populateReservation(Reservation.find(filter)).sort({ startDate: -1 }).skip(skip).limit(limit),
    Reservation.countDocuments(filter),
  ]);
  return sendSuccess(res, {
    data: reservations,
    meta: paginationMeta({ page, limit, total }),
  });
};

export const getReservation = async (req, res) => {
  const reservation = await getReservationOrThrow(req.validated.params.id);
  if (!(await canAccessReservation(req.user, reservation))) {
    throw new AppError('No puedes consultar esta reserva', 403, 'RESERVATION_FORBIDDEN');
  }
  const populated = await populateReservation(Reservation.findById(reservation._id));
  return sendSuccess(res, { data: populated });
};

export const updateReservation = async (req, res) => {
  const updated = await updateReservationSafely({
    reservationId: req.validated.params.id,
    actor: req.user,
    changes: req.validated.body,
  });
  return sendSuccess(res, { message: 'Reserva actualizada', data: updated });
};

export const updateReservationStatus = async (req, res) => {
  const { status, managerNote } = req.validated.body;
  const updated = await transitionReservation({
    reservationId: req.validated.params.id,
    nextStatus: status,
    actor: req.user,
    managerNote,
    requireManager: true,
  });
  return sendSuccess(res, { message: 'Estado actualizado', data: updated });
};

export const cancelReservation = async (req, res) => {
  await transitionReservation({
    reservationId: req.validated.params.id,
    nextStatus: 'cancelled',
    actor: req.user,
  });
  res.status(204).end();
};

export const reservationSummary = async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.MEMBER) filter.user = req.user._id;
  if (req.user.role === ROLES.MANAGER) {
    const managedHubIds = await getManagedHubIds(req.user);
    filter.$or = [{ user: req.user._id }, { hub: { $in: managedHubIds } }];
  }
  const rows = await Reservation.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(rows.map((row) => [row._id, row.count]));
  const hubs =
    req.user.role === ROLES.MANAGER
      ? await Hub.countDocuments({ managers: req.user._id, active: true })
      : undefined;
  return sendSuccess(res, { data: { byStatus, managedHubs: hubs } });
};
