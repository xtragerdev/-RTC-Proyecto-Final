import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { app } from '../src/app.js';
import { Hub } from '../src/models/Hub.js';
import { Item } from '../src/models/Item.js';
import { Reservation } from '../src/models/Reservation.js';
import { User } from '../src/models/User.js';
import { seedDatabase } from '../src/seeds/seedDatabase.js';
import { signAccessToken } from '../src/utils/jwt.js';

const futureDate = (days, hours = 0) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setUTCHours(hours, 0, 0, 0);
  return date;
};

const createUser = async ({ role = 'member', email } = {}) =>
  User.create({
    name: `Usuario ${role}`,
    email: email ?? `${role}-${crypto.randomUUID()}@example.com`,
    password: 'Password123!',
    role,
    active: true,
  });

const tokenFor = (user) => signAccessToken(user._id.toString());

const createHub = async ({ managers = [], name = 'Nodo Centro' } = {}) =>
  Hub.create({
    code: `HUB-${crypto.randomUUID().slice(0, 8)}`,
    name,
    slug: `${name.toLowerCase().replaceAll(' ', '-')}-${crypto.randomUUID().slice(0, 6)}`,
    district: 'Centro',
    address: 'Calle de la Comunidad, 10',
    description: 'Nodo comunitario preparado para compartir objetos de forma responsable.',
    location: { type: 'Point', coordinates: [-3.7, 40.4] },
    openingHours: 'L-V 09:00-20:00',
    contactEmail: `${crypto.randomUUID()}@renodo.example`,
    managers,
    active: true,
  });

const createItem = async (hub, overrides = {}) =>
  Item.create({
    code: `ITM-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Taladro comunitario',
    slug: `taladro-${crypto.randomUUID().slice(0, 8)}`,
    description: 'Taladro revisado con accesorios y manual para uso doméstico responsable.',
    category: 'tools',
    hub: hub._id,
    condition: 'good',
    status: 'available',
    replacementCostEuros: 80,
    maxLoanDays: 7,
    ...overrides,
  });

const reserve = (token, item, startDate, endDate) =>
  request(app).post('/api/v1/reservations').set('Authorization', `Bearer ${token}`).send({
    item: item._id.toString(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

const transition = (token, reservationId, status) =>
  request(app)
    .patch(`/api/v1/reservations/${reservationId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status });

beforeAll(async () => {
  await Promise.all([User.init(), Hub.init(), Item.init(), Reservation.init()]);
});

describe('health y autenticación', () => {
  it('expone health y ready sin filtrar secretos', async () => {
    const health = await request(app).get('/api/v1/health').expect(200);
    const ready = await request(app).get('/api/v1/ready').expect(200);
    expect(health.body.data.service).toBe('renodo-api');
    expect(ready.body.data.database).toBe('connected');
  });

  it('fuerza member aunque el registro intente inyectar role admin', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Ada Vecina',
      email: 'ada@example.com',
      password: 'Password123!',
      role: 'admin',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('member');
    expect(response.body.data.user).not.toHaveProperty('password');
    expect(await User.countDocuments({ role: 'admin' })).toBe(0);
  });

  it('rechaza credenciales incorrectas y tokens de cuentas desactivadas', async () => {
    const user = await createUser({ email: 'login@example.com' });
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'incorrecta' })
      .expect(401);

    const token = tokenFor(user);
    user.active = false;
    await user.save();
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(response.body.error.code).toBe('INACTIVE_ACCOUNT');
  });

  it('devuelve un error uniforme ante JSON malformado', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_JSON' },
    });
  });
});

describe('roles, alcance y favoritos', () => {
  it('impide que un member cree hubs', async () => {
    const member = await createUser();
    await request(app)
      .post('/api/v1/hubs')
      .set('Authorization', `Bearer ${tokenFor(member)}`)
      .send({})
      .expect(403);
  });

  it('permite al manager editar solo objetos de sus hubs', async () => {
    const manager = await createUser({ role: 'manager' });
    const ownHub = await createHub({ managers: [manager._id], name: 'Nodo Propio' });
    const otherHub = await createHub({ name: 'Nodo Ajeno' });
    const ownItem = await createItem(ownHub);
    const otherItem = await createItem(otherHub);
    const token = tokenFor(manager);

    await request(app)
      .patch(`/api/v1/items/${ownItem._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ condition: 'fair' })
      .expect(200);
    const forbidden = await request(app)
      .patch(`/api/v1/items/${otherItem._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ condition: 'fair' })
      .expect(403);
    expect(forbidden.body.error.code).toBe('HUB_FORBIDDEN');
  });

  it('añade favoritos con $addToSet y nunca duplica el item', async () => {
    const member = await createUser();
    const hub = await createHub();
    const item = await createItem(hub);
    const token = tokenFor(member);
    const path = `/api/v1/users/me/favorites/${item._id}`;

    await request(app).put(path).set('Authorization', `Bearer ${token}`).expect(200);
    await request(app).put(path).set('Authorization', `Bearer ${token}`).expect(200);

    const updated = await User.findById(member._id);
    expect(updated.favoriteItems.map(String)).toEqual([item._id.toString()]);
  });

  it('impide degradar al último administrador activo', async () => {
    const admin = await createUser({ role: 'admin' });
    const response = await request(app)
      .patch(`/api/v1/users/${admin._id}/role`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ role: 'member' })
      .expect(409);
    expect(response.body.error.code).toBe('LAST_ADMIN');
  });

  it('serializa dos degradaciones concurrentes y conserva siempre un admin activo', async () => {
    const [firstAdmin, secondAdmin] = await Promise.all([
      createUser({ role: 'admin' }),
      createUser({ role: 'admin' }),
    ]);
    const responses = await Promise.all([
      request(app)
        .patch(`/api/v1/users/${firstAdmin._id}/role`)
        .set('Authorization', `Bearer ${tokenFor(firstAdmin)}`)
        .send({ role: 'member' }),
      request(app)
        .patch(`/api/v1/users/${secondAdmin._id}/role`)
        .set('Authorization', `Bearer ${tokenFor(secondAdmin)}`)
        .send({ role: 'member' }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await User.countDocuments({ role: 'admin', active: true })).toBe(1);
    expect(responses.find((response) => response.status === 409).body.error.code).toBe(
      'LAST_ADMIN',
    );
  });

  it('no permite degradar a member a un responsable todavía asignado', async () => {
    const [admin, manager] = await Promise.all([
      createUser({ role: 'admin' }),
      createUser({ role: 'manager' }),
    ]);
    await createHub({ managers: [manager._id] });

    const response = await request(app)
      .patch(`/api/v1/users/${manager._id}/role`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ role: 'member' })
      .expect(409);
    expect(response.body.error.code).toBe('MANAGER_STILL_ASSIGNED');
    expect((await User.findById(manager._id)).role).toBe('manager');
  });
});

describe('contrato público de catálogo', () => {
  it('acepta filtros del frontend, devuelve alias DTO y resuelve slug/código demo', async () => {
    const hub = await createHub({ name: 'Nodo Chamberí' });
    const item = await createItem(hub, {
      code: 'ITM-000002',
      name: 'Taladro silencioso',
      slug: 'taladro-silencioso',
      depositEuros: 12,
      replacementCostEuros: 95,
    });

    const listed = await request(app)
      .get('/api/v1/items')
      .query({ search: 'silencioso', centro: hub.slug, available: 'true' })
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0]).toMatchObject({
      id: item._id.toString(),
      deposit: 12,
      replacementCost: 95,
    });
    expect(listed.body.data[0]).not.toHaveProperty('bookingVersion');

    const bySlug = await request(app).get(`/api/v1/items/${item.slug}`).expect(200);
    const byDemoCode = await request(app).get('/api/v1/items/item-002').expect(200);
    expect(bySlug.body.data.id).toBe(item._id.toString());
    expect(byDemoCode.body.data.id).toBe(item._id.toString());

    const hubDto = await request(app).get(`/api/v1/hubs/${hub.slug}`).expect(200);
    expect(hubDto.body.data.coordinates).toEqual([-3.7, 40.4]);
  });

  it('oculta un objeto retirado y evita que una ruta posterior lo resucite', async () => {
    const [manager, member] = await Promise.all([createUser({ role: 'manager' }), createUser()]);
    const hub = await createHub({ managers: [manager._id] });
    const item = await createItem(hub);
    const token = tokenFor(manager);
    await request(app)
      .put(`/api/v1/users/me/favorites/${item._id}`)
      .set('Authorization', `Bearer ${tokenFor(member)}`)
      .expect(200);

    await request(app)
      .delete(`/api/v1/items/${item._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(app).get(`/api/v1/items/${item.slug}`).expect(404);
    await request(app)
      .patch(`/api/v1/items/${item._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'available' })
      .expect(404);
    expect((await Item.findById(item._id)).status).toBe('retired');
    expect((await User.findById(member._id)).favoriteItems).toHaveLength(0);
  });
});

describe('invariantes de reserva', () => {
  it('admite solicitudes solapadas y serializa su aprobación: solo una bloquea el intervalo', async () => {
    const [firstUser, secondUser, manager] = await Promise.all([
      createUser(),
      createUser(),
      createUser({ role: 'manager' }),
    ]);
    const hub = await createHub({ managers: [manager._id] });
    const item = await createItem(hub);
    const start = futureDate(2, 10);
    const end = futureDate(3, 10);

    const requests = await Promise.all([
      reserve(tokenFor(firstUser), item, start, end),
      reserve(tokenFor(secondUser), item, start, end),
    ]);
    expect(requests.map((response) => response.status)).toEqual([201, 201]);

    const approvals = await Promise.all(
      requests.map((response) => transition(tokenFor(manager), response.body.data._id, 'approved')),
    );
    expect(approvals.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await Reservation.countDocuments({ status: 'approved' })).toBe(1);
    expect(approvals.find((response) => response.status === 409).body.error.code).toBe(
      'RESERVATION_OVERLAP',
    );
  });

  it('considera compatibles dos intervalos que solo se tocan', async () => {
    const [firstUser, secondUser, manager] = await Promise.all([
      createUser(),
      createUser(),
      createUser({ role: 'manager' }),
    ]);
    const hub = await createHub({ managers: [manager._id] });
    const item = await createItem(hub);
    const start = futureDate(2, 10);
    const boundary = futureDate(3, 10);
    const end = futureDate(4, 10);

    const first = await reserve(tokenFor(firstUser), item, start, boundary).expect(201);
    const second = await reserve(tokenFor(secondUser), item, boundary, end).expect(201);
    await transition(tokenFor(manager), first.body.data._id, 'approved').expect(200);
    await transition(tokenFor(manager), second.body.data._id, 'approved').expect(200);
    expect(await Reservation.countDocuments({ status: 'approved' })).toBe(2);
  });

  it('libera el intervalo cuando el titular cancela', async () => {
    const [firstUser, secondUser, manager] = await Promise.all([
      createUser(),
      createUser(),
      createUser({ role: 'manager' }),
    ]);
    const hub = await createHub({ managers: [manager._id] });
    const item = await createItem(hub);
    const start = futureDate(2, 10);
    const end = futureDate(3, 10);
    const first = await reserve(tokenFor(firstUser), item, start, end).expect(201);
    await transition(tokenFor(manager), first.body.data._id, 'approved').expect(200);
    await reserve(tokenFor(secondUser), item, start, end).expect(409);

    await request(app)
      .delete(`/api/v1/reservations/${first.body.data._id}`)
      .set('Authorization', `Bearer ${tokenFor(firstUser)}`)
      .expect(204);
    await reserve(tokenFor(secondUser), item, start, end).expect(201);
  });

  it('rechaza duración excesiva e items en mantenimiento', async () => {
    const member = await createUser();
    const hub = await createHub();
    const item = await createItem(hub, { maxLoanDays: 2 });
    const long = await reserve(tokenFor(member), item, futureDate(2, 10), futureDate(5, 10)).expect(
      422,
    );
    expect(long.body.error.code).toBe('LOAN_TOO_LONG');

    item.status = 'maintenance';
    await item.save();
    const unavailable = await reserve(
      tokenFor(member),
      item,
      futureDate(2, 10),
      futureDate(3, 10),
    ).expect(409);
    expect(unavailable.body.error.code).toBe('ITEM_NOT_BOOKABLE');
  });

  it('impide que un member consulte una reserva ajena', async () => {
    const [owner, stranger] = await Promise.all([createUser(), createUser()]);
    const hub = await createHub();
    const item = await createItem(hub);
    const created = await reserve(
      tokenFor(owner),
      item,
      futureDate(2, 10),
      futureDate(3, 10),
    ).expect(201);

    await request(app)
      .get(`/api/v1/reservations/${created.body.data._id}`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`)
      .expect(403);
  });

  it('rechaza una reprogramación solapada y conserva las fechas originales', async () => {
    const [firstUser, secondUser, manager] = await Promise.all([
      createUser(),
      createUser(),
      createUser({ role: 'manager' }),
    ]);
    const hub = await createHub({ managers: [manager._id] });
    const item = await createItem(hub);
    const firstStart = futureDate(2, 10);
    const firstEnd = futureDate(3, 10);
    const secondStart = futureDate(4, 10);
    const secondEnd = futureDate(5, 10);
    const first = await reserve(tokenFor(firstUser), item, firstStart, firstEnd).expect(201);
    await transition(tokenFor(manager), first.body.data._id, 'approved').expect(200);
    const second = await reserve(tokenFor(secondUser), item, secondStart, secondEnd).expect(201);

    const conflict = await request(app)
      .patch(`/api/v1/reservations/${second.body.data._id}`)
      .set('Authorization', `Bearer ${tokenFor(secondUser)}`)
      .send({ startDate: futureDate(2, 12), endDate: futureDate(3, 12) })
      .expect(409);
    expect(conflict.body.error.code).toBe('RESERVATION_OVERLAP');

    const unchanged = await Reservation.findById(second.body.data._id);
    expect(unchanged.startDate.toISOString()).toBe(secondStart.toISOString());
    expect(unchanged.endDate.toISOString()).toBe(secondEnd.toISOString());
  });

  it('limita las transiciones al manager del nodo', async () => {
    const [owner, manager, outsider] = await Promise.all([
      createUser(),
      createUser({ role: 'manager' }),
      createUser({ role: 'manager' }),
    ]);
    const hub = await createHub({ managers: [manager._id] });
    const item = await createItem(hub);
    const created = await reserve(
      tokenFor(owner),
      item,
      futureDate(2, 10),
      futureDate(3, 10),
    ).expect(201);
    const path = `/api/v1/reservations/${created.body.data._id}/status`;

    await request(app)
      .patch(path)
      .set('Authorization', `Bearer ${tokenFor(outsider)}`)
      .send({ status: 'approved' })
      .expect(403);
    const approved = await request(app)
      .patch(path)
      .set('Authorization', `Bearer ${tokenFor(manager)}`)
      .send({ status: 'approved' })
      .expect(200);
    expect(approved.body.data.status).toBe('approved');
  });

  it('no permite retirar un objeto con reservas futuras', async () => {
    const [member, manager] = await Promise.all([createUser(), createUser({ role: 'manager' })]);
    const hub = await createHub({ managers: [manager._id] });
    const item = await createItem(hub);
    await reserve(tokenFor(member), item, futureDate(2, 10), futureDate(3, 10)).expect(201);

    const response = await request(app)
      .delete(`/api/v1/items/${item._id}`)
      .set('Authorization', `Bearer ${tokenFor(manager)}`)
      .expect(409);
    expect(response.body.error.code).toBe('ITEM_HAS_RESERVATIONS');
    expect((await Item.findById(item._id)).status).toBe('available');
  });

  it('no permite borrar una cuenta con un objeto todavía recogido', async () => {
    const member = await createUser();
    const hub = await createHub();
    const item = await createItem(hub);
    await Reservation.create({
      code: `RSV-${crypto.randomUUID().slice(0, 8)}`,
      user: member._id,
      item: item._id,
      hub: hub._id,
      startDate: futureDate(-2, 10),
      endDate: futureDate(-1, 10),
      status: 'collected',
    });

    const response = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenFor(member)}`)
      .expect(409);
    expect(response.body.error.code).toBe('USER_HAS_ACTIVE_LOAN');
    expect((await User.findById(member._id)).active).toBe(true);
  });

  it('mantiene la invariante al competir una reserva con la baja de su usuario', async () => {
    const member = await createUser();
    const hub = await createHub();
    const item = await createItem(hub);
    const token = tokenFor(member);
    const [reservationResponse, deletionResponse] = await Promise.all([
      reserve(token, item, futureDate(2, 10), futureDate(3, 10)),
      request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`),
    ]);

    expect(deletionResponse.status).toBe(204);
    expect([201, 401, 409]).toContain(reservationResponse.status);
    expect((await User.findById(member._id)).active).toBe(false);
    expect(
      await Reservation.countDocuments({
        user: member._id,
        status: { $in: ['requested', 'approved', 'collected', 'overdue'] },
      }),
    ).toBe(0);
  });

  it('serializa el archivado de un nodo con la creación de objetos', async () => {
    const [admin, manager] = await Promise.all([
      createUser({ role: 'admin' }),
      createUser({ role: 'manager' }),
    ]);
    const hub = await createHub({ managers: [manager._id] });
    const itemBody = {
      name: 'Carretilla comunitaria',
      description: 'Carretilla robusta para transportar materiales en proyectos del barrio.',
      category: 'tools',
      replacementCostEuros: 110,
    };
    const [created, archived] = await Promise.all([
      request(app)
        .post(`/api/v1/hubs/${hub._id}/items`)
        .set('Authorization', `Bearer ${tokenFor(manager)}`)
        .send(itemBody),
      request(app)
        .delete(`/api/v1/hubs/${hub._id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`),
    ]);

    expect(archived.status).toBe(204);
    expect([201, 403]).toContain(created.status);
    expect((await Hub.findById(hub._id)).active).toBe(false);
    expect(await Item.countDocuments({ hub: hub._id, status: { $ne: 'retired' } })).toBe(0);
  });
});

describe('semilla CSV', () => {
  it('crea las 512 relaciones y es idempotente', async () => {
    const first = await seedDatabase();
    const second = await seedDatabase();

    expect(first).toEqual({ users: 60, hubs: 12, items: 180, reservations: 260, totalRows: 512 });
    expect(second).toEqual(first);
    expect(await User.countDocuments({ preferredHub: { $ne: null } })).toBe(60);
    expect(await Reservation.countDocuments({ hub: { $ne: null }, item: { $ne: null } })).toBe(260);

    const activeSeedUser = await User.findOne({ externalCode: { $exists: true }, active: true });
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: activeSeedUser.email, password: 'ReNodoDemo2026!' })
      .expect(200);
  });
});
