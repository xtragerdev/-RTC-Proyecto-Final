import { createReadStream } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import {
  BLOCKING_RESERVATION_STATUSES,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUSES,
  RESERVATION_STATUSES,
  ROLE_VALUES,
} from '../constants/domain.js';
import { Hub } from '../models/Hub.js';
import { Item } from '../models/Item.js';
import { Reservation } from '../models/Reservation.js';
import { User } from '../models/User.js';

const CSV_DIRECTORY = path.resolve(process.cwd(), process.env.SEED_CSV_DIR ?? '../../data/csv');

const csvFile = (name) => path.join(CSV_DIRECTORY, `${name}.csv`);

const readCsv = async (name) => {
  const rows = [];
  const parser = createReadStream(csvFile(name), { encoding: 'utf8' }).pipe(
    parse({ columns: true, bom: true, skip_empty_lines: true, trim: true }),
  );
  for await (const row of parser) rows.push(row);
  return rows;
};

const required = (row, field, source, line) => {
  const value = row[field]?.trim();
  if (!value) throw new Error(`${source}.csv línea ${line}: falta ${field}`);
  return value;
};

const enumValue = (row, field, allowed, source, line) => {
  const value = required(row, field, source, line);
  if (!allowed.includes(value)) {
    throw new Error(`${source}.csv línea ${line}: ${field}=${value} no es válido`);
  }
  return value;
};

const numberValue = (row, field, source, line) => {
  const value = Number(required(row, field, source, line));
  if (!Number.isFinite(value)) {
    throw new Error(`${source}.csv línea ${line}: ${field} no es numérico`);
  }
  return value;
};

const boundedNumber = (row, field, source, line, { min, max, integer = false }) => {
  const value = numberValue(row, field, source, line);
  if (value < min || value > max || (integer && !Number.isInteger(value))) {
    const type = integer ? 'entero' : 'número';
    throw new Error(
      `${source}.csv línea ${line}: ${field} debe ser un ${type} entre ${min} y ${max}`,
    );
  }
  return value;
};

const dateValue = (row, field, source, line, optional = false) => {
  if (optional && !row[field]?.trim()) return undefined;
  const value = new Date(required(row, field, source, line));
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${source}.csv línea ${line}: ${field} no es una fecha válida`);
  }
  return value;
};

const booleanValue = (row, field, source, line) => {
  const value = required(row, field, source, line).toLowerCase();
  if (!['true', 'false'].includes(value)) {
    throw new Error(`${source}.csv línea ${line}: ${field} debe ser true o false`);
  }
  return value === 'true';
};

const buildMap = (documents, field) =>
  new Map(documents.map((document) => [String(document[field]).toUpperCase(), document]));

const assertUniqueColumn = (rows, column, source) => {
  const seen = new Set();
  rows.forEach((row, index) => {
    const value = required(row, column, source, index + 2).toLowerCase();
    if (seen.has(value)) {
      throw new Error(`${source}.csv línea ${index + 2}: ${column} duplicado (${value})`);
    }
    seen.add(value);
  });
};

const seedUsers = async (rows, passwordHash, session) => {
  const operations = rows.map((row, index) => {
    const line = index + 2;
    const externalCode = required(row, 'external_code', 'users', line).toUpperCase();
    const role = enumValue(row, 'role', ROLE_VALUES, 'users', line);
    return {
      updateOne: {
        filter: { externalCode },
        update: {
          $set: {
            externalCode,
            name: `${required(row, 'first_name', 'users', line)} ${required(row, 'last_name', 'users', line)}`,
            email: required(row, 'email', 'users', line).toLowerCase(),
            role,
            district: required(row, 'district', 'users', line),
            active: booleanValue(row, 'is_active', 'users', line),
          },
          $setOnInsert: {
            password: passwordHash,
            createdAt: dateValue(row, 'created_at', 'users', line),
          },
        },
        upsert: true,
      },
    };
  });
  return User.bulkWrite(operations, { session });
};

const seedHubs = async (rows, session) => {
  const users = await User.find({}).select('_id email role active').session(session);
  const userByEmail = new Map(users.map((user) => [user.email, user]));
  const operations = rows.map((row, index) => {
    const line = index + 2;
    const managerEmail = required(row, 'manager_email', 'hubs', line).toLowerCase();
    const manager = userByEmail.get(managerEmail);
    if (!manager) throw new Error(`hubs.csv línea ${line}: manager ${managerEmail} no encontrado`);
    if (!manager.active || !['manager', 'admin'].includes(manager.role)) {
      throw new Error(
        `hubs.csv línea ${line}: manager ${managerEmail} debe ser manager/admin activo`,
      );
    }
    const code = required(row, 'external_code', 'hubs', line).toUpperCase();
    const name = required(row, 'name', 'hubs', line);
    const district = required(row, 'district', 'hubs', line);
    return {
      updateOne: {
        filter: { code },
        update: {
          $set: {
            code,
            name,
            slug: required(row, 'slug', 'hubs', line).toLowerCase(),
            district,
            neighborhood: required(row, 'neighborhood', 'hubs', line),
            address: required(row, 'address', 'hubs', line),
            postalCode: required(row, 'postal_code', 'hubs', line),
            description: `${name} conecta al vecindario de ${district} con objetos compartidos, reparación y consumo responsable.`,
            location: {
              type: 'Point',
              coordinates: [
                boundedNumber(row, 'longitude', 'hubs', line, { min: -180, max: 180 }),
                boundedNumber(row, 'latitude', 'hubs', line, { min: -90, max: 90 }),
              ],
            },
            openingHours: required(row, 'opening_hours', 'hubs', line),
            contactEmail: required(row, 'contact_email', 'hubs', line).toLowerCase(),
            managers: [manager._id],
            active: booleanValue(row, 'is_active', 'hubs', line),
          },
          $setOnInsert: { createdAt: dateValue(row, 'created_at', 'hubs', line) },
        },
        upsert: true,
      },
    };
  });
  return Hub.bulkWrite(operations, { session });
};

const linkPreferredHubs = async (rows, session) => {
  const hubs = await Hub.find({}).select('_id code').session(session);
  const hubByCode = buildMap(hubs, 'code');
  const operations = rows.map((row, index) => {
    const line = index + 2;
    const hubCode = required(row, 'preferred_hub_code', 'users', line).toUpperCase();
    const hub = hubByCode.get(hubCode);
    if (!hub) throw new Error(`users.csv línea ${line}: preferred hub ${hubCode} no encontrado`);
    return {
      updateOne: {
        filter: { externalCode: required(row, 'external_code', 'users', line).toUpperCase() },
        update: { $set: { preferredHub: hub._id } },
      },
    };
  });
  return User.bulkWrite(operations, { session });
};

const seedItems = async (rows, session) => {
  const hubs = await Hub.find({}).select('_id code').session(session);
  const hubByCode = buildMap(hubs, 'code');
  const operations = rows.map((row, index) => {
    const line = index + 2;
    const hubCode = required(row, 'hub_code', 'items', line).toUpperCase();
    const hub = hubByCode.get(hubCode);
    if (!hub) throw new Error(`items.csv línea ${line}: hub ${hubCode} no encontrado`);
    const code = required(row, 'external_code', 'items', line).toUpperCase();
    return {
      updateOne: {
        filter: { code },
        update: {
          $set: {
            code,
            hub: hub._id,
            name: required(row, 'name', 'items', line),
            slug: required(row, 'slug', 'items', line).toLowerCase(),
            category: enumValue(row, 'category', ITEM_CATEGORIES, 'items', line),
            description: required(row, 'description', 'items', line),
            condition: enumValue(row, 'condition', ITEM_CONDITIONS, 'items', line),
            status: enumValue(row, 'status', ITEM_STATUSES, 'items', line),
            depositEuros: boundedNumber(row, 'deposit_eur', 'items', line, {
              min: 0,
              max: 10_000,
            }),
            maxLoanDays: boundedNumber(row, 'max_loan_days', 'items', line, {
              min: 1,
              max: 30,
              integer: true,
            }),
            replacementCostEuros: boundedNumber(row, 'replacement_cost_eur', 'items', line, {
              min: 0,
              max: 100_000,
            }),
            estimatedWasteKg: boundedNumber(row, 'estimated_waste_kg', 'items', line, {
              min: 0,
              max: 10_000,
            }),
            tags: required(row, 'tags', 'items', line).split('|').filter(Boolean),
            acquiredAt: dateValue(row, 'acquired_at', 'items', line),
          },
        },
        upsert: true,
      },
    };
  });
  return Item.bulkWrite(operations, { session });
};

const seedReservations = async (rows, session) => {
  const [users, items, hubs] = await Promise.all([
    User.find({}).select('_id externalCode active').session(session),
    Item.find({}).select('_id code hub maxLoanDays').session(session),
    Hub.find({}).select('_id code').session(session),
  ]);
  const userByCode = buildMap(users, 'externalCode');
  const itemByCode = buildMap(items, 'code');
  const hubByCode = buildMap(hubs, 'code');

  const preparedReservations = [];
  const operations = rows.map((row, index) => {
    const line = index + 2;
    const userCode = required(row, 'user_code', 'reservations', line).toUpperCase();
    const itemCode = required(row, 'item_code', 'reservations', line).toUpperCase();
    const hubCode = required(row, 'pickup_hub_code', 'reservations', line).toUpperCase();
    const user = userByCode.get(userCode);
    const item = itemByCode.get(itemCode);
    const hub = hubByCode.get(hubCode);
    if (!user) throw new Error(`reservations.csv línea ${line}: user ${userCode} no encontrado`);
    if (!item) throw new Error(`reservations.csv línea ${line}: item ${itemCode} no encontrado`);
    if (!hub) throw new Error(`reservations.csv línea ${line}: hub ${hubCode} no encontrado`);
    if (String(item.hub) !== String(hub._id)) {
      throw new Error(`reservations.csv línea ${line}: el pickup hub no coincide con el item`);
    }

    const startDate = dateValue(row, 'starts_at', 'reservations', line);
    const endDate = dateValue(row, 'ends_at', 'reservations', line);
    if (endDate <= startDate) {
      throw new Error(`reservations.csv línea ${line}: ends_at debe ser posterior a starts_at`);
    }
    if (endDate - startDate > item.maxLoanDays * 24 * 60 * 60 * 1000) {
      throw new Error(
        `reservations.csv línea ${line}: supera los ${item.maxLoanDays} días de ${itemCode}`,
      );
    }
    const status = enumValue(row, 'status', RESERVATION_STATUSES, 'reservations', line);
    const requestedAt = dateValue(row, 'requested_at', 'reservations', line);
    if (requestedAt > startDate) {
      throw new Error(`reservations.csv línea ${line}: requested_at es posterior a starts_at`);
    }
    const update = {
      code: required(row, 'external_code', 'reservations', line).toUpperCase(),
      user: user._id,
      item: item._id,
      hub: item.hub,
      requestedAt,
      startDate,
      endDate,
      status,
      memberNote: row.member_note?.trim() || null,
      returnedAt: dateValue(row, 'returned_at', 'reservations', line, true) ?? null,
    };
    if (status === 'returned' && !update.returnedAt) {
      throw new Error(`reservations.csv línea ${line}: returned_at es obligatorio al devolver`);
    }
    preparedReservations.push(update);
    return {
      updateOne: { filter: { code: update.code }, update: { $set: update }, upsert: true },
    };
  });

  const blocking = new Set(BLOCKING_RESERVATION_STATUSES);
  const now = new Date();
  for (const reservation of preparedReservations) {
    const user = users.find((entry) => String(entry._id) === String(reservation.user));
    const isActiveOrFuture =
      ['collected', 'overdue'].includes(reservation.status) ||
      (['requested', 'approved'].includes(reservation.status) && reservation.endDate > now);
    if (isActiveOrFuture && !user?.active) {
      throw new Error(
        `reservations.csv: ${reservation.code} referencia un usuario inactivo en una reserva activa o futura`,
      );
    }
  }

  const seedCodes = preparedReservations.map((entry) => entry.code);
  const existingBlocking = await Reservation.find({
    code: { $nin: seedCodes },
    status: { $in: BLOCKING_RESERVATION_STATUSES },
  })
    .select('code item startDate endDate status')
    .session(session);
  const byItem = new Map();
  const candidates = [
    ...existingBlocking,
    ...preparedReservations.filter((entry) => blocking.has(entry.status)),
  ];
  for (const reservation of candidates) {
    const key = String(reservation.item);
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key).push(reservation);
  }
  for (const reservations of byItem.values()) {
    reservations.sort((left, right) => left.startDate - right.startDate);
    for (let index = 1; index < reservations.length; index += 1) {
      const previous = reservations[index - 1];
      const current = reservations[index];
      if (previous.endDate > current.startDate) {
        throw new Error(
          `reservations.csv: ${previous.code} y ${current.code} se solapan para el mismo objeto`,
        );
      }
    }
  }
  return Reservation.bulkWrite(operations, { session });
};

const updateLoanCounters = async (session) => {
  await Item.updateMany({}, { $set: { totalLoans: 0 } }, { session });
  const counts = await Reservation.aggregate([
    { $match: { status: 'returned' } },
    { $group: { _id: '$item', count: { $sum: 1 } } },
  ]).session(session);
  if (counts.length) {
    await Item.bulkWrite(
      counts.map((row) => ({
        updateOne: { filter: { _id: row._id }, update: { $set: { totalLoans: row.count } } },
      })),
      { session },
    );
  }
};

export const seedDatabase = async () => {
  const [userRows, hubRows, itemRows, reservationRows] = await Promise.all([
    readCsv('users'),
    readCsv('hubs'),
    readCsv('items'),
    readCsv('reservations'),
  ]);
  const totalRows = userRows.length + hubRows.length + itemRows.length + reservationRows.length;
  if (totalRows < 100) throw new Error(`El dataset solo contiene ${totalRows} filas`);
  assertUniqueColumn(userRows, 'external_code', 'users');
  assertUniqueColumn(userRows, 'email', 'users');
  assertUniqueColumn(hubRows, 'external_code', 'hubs');
  assertUniqueColumn(hubRows, 'slug', 'hubs');
  assertUniqueColumn(itemRows, 'external_code', 'items');
  assertUniqueColumn(itemRows, 'slug', 'items');
  assertUniqueColumn(reservationRows, 'external_code', 'reservations');

  const seedPassword = process.env.SEED_USER_PASSWORD ?? 'ReNodoDemo2026!';
  if (env.nodeEnv === 'production' && !process.env.SEED_USER_PASSWORD) {
    throw new Error('SEED_USER_PASSWORD es obligatoria al sembrar producción');
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  await Promise.all([User.init(), Hub.init(), Item.init(), Reservation.init()]);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await seedUsers(userRows, passwordHash, session);
      await seedHubs(hubRows, session);
      await linkPreferredHubs(userRows, session);
      await seedItems(itemRows, session);
      await seedReservations(reservationRows, session);
      await updateLoanCounters(session);
    });
  } finally {
    await session.endSession();
  }

  const counts = await Promise.all([
    User.countDocuments({ externalCode: /^USR-\d{4}$/ }),
    Hub.countDocuments({ code: /^HUB-MAD-\d{3}$/ }),
    Item.countDocuments({ code: /^ITM-\d{6}$/ }),
    Reservation.countDocuments({ code: /^RSV-\d{6}$/ }),
  ]);
  return {
    users: counts[0],
    hubs: counts[1],
    items: counts[2],
    reservations: counts[3],
    totalRows,
  };
};

const isExecutedDirectly =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isExecutedDirectly) {
  if (!env.mongoUri) throw new Error('Configura MONGO_URI o MONGODB_URI para ejecutar la semilla');
  try {
    await connectDatabase();
    const summary = await seedDatabase();
    console.info('Semilla ReNodo completada:', summary);
  } finally {
    await disconnectDatabase();
  }
}
