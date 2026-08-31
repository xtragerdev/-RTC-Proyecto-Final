import mongoose from 'mongoose';

import { BLOCKING_RESERVATION_STATUSES, ROLES } from '../constants/domain.js';
import { Item } from '../models/Item.js';
import { Reservation } from '../models/Reservation.js';
import { AppError } from '../utils/AppError.js';
import { createCode } from '../utils/identifiers.js';
import { itemSelector } from '../utils/resourceSelectors.js';
import { lockActiveHub, lockActiveUsers, lockManagedHub } from './lifecycleService.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const reservationPopulation = (query) =>
  query
    .populate('user', 'name email avatar district')
    .populate('item', 'name slug code image category status maxLoanDays depositEuros')
    .populate('hub', 'name slug code district address neighborhood openingHours image location');

const assertBookableDates = (item, startDate, endDate) => {
  if (startDate < new Date()) {
    throw new AppError('La reserva debe comenzar en el futuro', 422, 'START_DATE_IN_PAST');
  }
  if (endDate <= startDate) {
    throw new AppError(
      'La fecha de fin debe ser posterior a la de inicio',
      422,
      'INVALID_DATE_RANGE',
    );
  }
  if (endDate - startDate > item.maxLoanDays * DAY_IN_MS) {
    throw new AppError(
      `Este objeto admite préstamos de hasta ${item.maxLoanDays} días`,
      422,
      'LOAN_TOO_LONG',
    );
  }
};

const lockItem = async (itemId, session, { bookable = false } = {}) => {
  const filter = { _id: itemId };
  if (bookable) Object.assign(filter, { status: 'available', deletedAt: null });
  const item = await Item.findOneAndUpdate(
    filter,
    { $inc: { bookingVersion: 1 } },
    { returnDocument: 'after', session },
  ).select('+bookingVersion');
  if (!item) {
    throw new AppError('El objeto no está disponible para reservas', 409, 'ITEM_NOT_BOOKABLE');
  }
  return item;
};

const assertNoOverlap = async ({ itemId, startDate, endDate, excludeId, session }) => {
  const query = {
    item: itemId,
    status: { $in: BLOCKING_RESERVATION_STATUSES },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const conflict = await Reservation.exists(query).session(session);
  if (conflict) {
    throw new AppError(
      'El objeto ya está reservado durante parte de ese intervalo',
      409,
      'RESERVATION_OVERLAP',
    );
  }
};

const resolveItem = async (identifier) => {
  const item = await Item.findOne(itemSelector(identifier)).select('_id hub');
  if (!item) throw new AppError('Objeto no encontrado', 404, 'ITEM_NOT_FOUND');
  return item;
};

export const createReservationSafely = async ({
  userId,
  itemIdentifier,
  startDate,
  endDate,
  memberNote,
}) => {
  const snapshot = await resolveItem(itemIdentifier);
  const session = await mongoose.startSession();
  let reservationId;

  try {
    await session.withTransaction(async () => {
      await lockActiveUsers([userId], session);
      await lockActiveHub(snapshot.hub, session);
      const item = await lockItem(snapshot._id, session, { bookable: true });
      if (String(item.hub) !== String(snapshot.hub)) {
        throw new AppError('El objeto ha cambiado de nodo', 409, 'ITEM_HUB_CHANGED');
      }
      assertBookableDates(item, startDate, endDate);
      // Las solicitudes no bloquean entre sí, pero no se crean sobre un préstamo ya aprobado.
      await assertNoOverlap({ itemId: item._id, startDate, endDate, session });

      const [reservation] = await Reservation.create(
        [
          {
            code: createCode('RSV'),
            user: userId,
            item: item._id,
            hub: item.hub,
            startDate,
            endDate,
            status: 'requested',
            memberNote,
          },
        ],
        { session },
      );
      reservationId = reservation._id;
    });
  } finally {
    await session.endSession();
  }

  return reservationPopulation(Reservation.findById(reservationId));
};

export const updateReservationSafely = async ({ reservationId, actor, changes }) => {
  const snapshot = await Reservation.findById(reservationId).select('user item hub');
  if (!snapshot) throw new AppError('Reserva no encontrada', 404, 'RESERVATION_NOT_FOUND');
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await lockActiveUsers([actor._id, snapshot.user], session);
      const snapshotOwner = String(snapshot.user) === String(actor._id);
      const hub = snapshotOwner
        ? await lockActiveHub(snapshot.hub, session)
        : await lockManagedHub(snapshot.hub, actor, session);
      const item = await lockItem(snapshot.item, session, { bookable: true });
      const current = await Reservation.findById(reservationId).session(session);
      if (!current) throw new AppError('Reserva no encontrada', 404, 'RESERVATION_NOT_FOUND');

      const isOwner = String(current.user) === String(actor._id);
      const managesHub =
        actor.role === ROLES.ADMIN ||
        (actor.role === ROLES.MANAGER &&
          hub.managers.some((id) => String(id) === String(actor._id)));
      if (!isOwner && !managesHub) {
        throw new AppError('No puedes editar esta reserva', 403, 'RESERVATION_FORBIDDEN');
      }
      if (isOwner && !managesHub && current.status !== 'requested') {
        throw new AppError('Solo puedes editar solicitudes pendientes', 409, 'RESERVATION_LOCKED');
      }
      if (changes.managerNote !== undefined && !managesHub) {
        throw new AppError(
          'Solo el equipo del nodo puede añadir notas internas',
          403,
          'MANAGER_NOTE_FORBIDDEN',
        );
      }
      if (changes.memberNote !== undefined && !isOwner && actor.role !== ROLES.ADMIN) {
        throw new AppError('Solo el titular puede modificar su nota', 403, 'MEMBER_NOTE_FORBIDDEN');
      }

      if (changes.startDate || changes.endDate) {
        if (!['requested', 'approved'].includes(current.status)) {
          throw new AppError('Esta reserva ya no se puede reprogramar', 409, 'RESERVATION_LOCKED');
        }
        const startDate = changes.startDate ?? current.startDate;
        const endDate = changes.endDate ?? current.endDate;
        assertBookableDates(item, startDate, endDate);
        await assertNoOverlap({
          itemId: current.item,
          startDate,
          endDate,
          excludeId: current._id,
          session,
        });
        current.startDate = startDate;
        current.endDate = endDate;
      }
      if (changes.memberNote !== undefined) current.memberNote = changes.memberNote;
      if (changes.managerNote !== undefined) current.managerNote = changes.managerNote;
      await current.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return reservationPopulation(Reservation.findById(reservationId));
};

export const transitionReservation = async ({
  reservationId,
  nextStatus,
  actor,
  managerNote,
  requireManager = false,
}) => {
  const allowedTransitions = {
    requested: ['approved', 'rejected', 'cancelled'],
    approved: ['collected', 'cancelled', 'overdue'],
    collected: ['returned', 'overdue'],
    overdue: ['returned'],
    returned: [],
    cancelled: [],
    rejected: [],
  };
  const snapshot = await Reservation.findById(reservationId).select('user item hub');
  if (!snapshot) throw new AppError('Reserva no encontrada', 404, 'RESERVATION_NOT_FOUND');
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await lockActiveUsers([actor._id, snapshot.user], session);
      const isSnapshotOwner = String(snapshot.user) === String(actor._id);
      const hub =
        !requireManager && isSnapshotOwner
          ? await lockActiveHub(snapshot.hub, session)
          : await lockManagedHub(snapshot.hub, actor, session);
      const item = await lockItem(snapshot.item, session, { bookable: nextStatus === 'approved' });
      const reservation = await Reservation.findById(reservationId).session(session);
      if (!reservation) throw new AppError('Reserva no encontrada', 404, 'RESERVATION_NOT_FOUND');

      const isOwner = String(reservation.user) === String(actor._id);
      const managesHub =
        actor.role === ROLES.ADMIN ||
        (actor.role === ROLES.MANAGER &&
          hub.managers.some((id) => String(id) === String(actor._id)));
      if (requireManager && !managesHub) {
        throw new AppError('No gestionas esta reserva', 403, 'RESERVATION_FORBIDDEN');
      }
      if (!requireManager && !isOwner && !managesHub) {
        throw new AppError('No puedes cancelar esta reserva', 403, 'RESERVATION_FORBIDDEN');
      }
      if (!allowedTransitions[reservation.status]?.includes(nextStatus)) {
        throw new AppError(
          `No se puede pasar de ${reservation.status} a ${nextStatus}`,
          409,
          'INVALID_STATUS_TRANSITION',
        );
      }
      if (nextStatus === 'approved') {
        assertBookableDates(item, reservation.startDate, reservation.endDate);
        await assertNoOverlap({
          itemId: reservation.item,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          excludeId: reservation._id,
          session,
        });
      }
      if (nextStatus === 'collected' && reservation.startDate > new Date()) {
        throw new AppError('El préstamo todavía no ha comenzado', 409, 'RESERVATION_NOT_STARTED');
      }
      if (nextStatus === 'overdue' && reservation.endDate > new Date()) {
        throw new AppError('La reserva aún no ha vencido', 409, 'RESERVATION_NOT_DUE');
      }

      reservation.status = nextStatus;
      if (managerNote !== undefined) reservation.managerNote = managerNote;
      if (nextStatus === 'collected') reservation.collectedAt = new Date();
      if (nextStatus === 'returned') reservation.returnedAt = new Date();
      if (nextStatus === 'cancelled') {
        reservation.cancelledAt = new Date();
        reservation.cancelledBy = actor._id;
      }
      await reservation.save({ session });

      if (nextStatus === 'returned') item.totalLoans += 1;
      await item.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return reservationPopulation(Reservation.findById(reservationId));
};
