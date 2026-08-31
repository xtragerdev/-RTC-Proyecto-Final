import type { Hub, Item, Reservation, User } from './types';

export const categoryLabels = {
  all: 'Todos',
  tools: 'Herramientas',
  kitchen: 'Cocina',
  outdoor: 'Aire libre',
  mobility: 'Movilidad',
  events: 'Eventos',
  technology: 'Tecnología',
} as const;

export const conditionLabels = {
  excellent: 'Excelente',
  good: 'Buen estado',
  fair: 'Uso visible',
} as const;

export const hubs: Hub[] = [
  ['001', 'Nodo Malasaña', 'malasana', 'Centro', 'Universidad', 'Calle Nodo Norte, 12', 'L-V 10:00–20:00 · S 10:00–14:00', -3.7071, 40.4251],
  ['002', 'Nodo Lavapiés', 'lavapies', 'Centro', 'Embajadores', 'Pasaje Red Vecinal, 18', 'L-V 09:00–19:30 · S 10:00–14:00', -3.7009, 40.4098],
  ['003', 'Nodo Palos de Moguer', 'palos-de-moguer', 'Arganzuela', 'Palos de Moguer', 'Calle Taller Abierto, 7', 'L-V 09:00–19:30 · S 10:00–14:00', -3.6942, 40.4035],
  ['004', 'Nodo Trafalgar', 'trafalgar', 'Chamberí', 'Trafalgar', 'Plaza del Intercambio, 4', 'L-V 10:00–20:00 · S 10:00–14:00', -3.7012, 40.4322],
  ['005', 'Nodo Bellas Vistas', 'bellas-vistas', 'Tetuán', 'Bellas Vistas', 'Calle Enlace, 23', 'L-V 09:00–19:30 · S 10:00–14:00', -3.7048, 40.4532],
  ['009', 'Nodo Pacífico', 'pacifico', 'Retiro', 'Pacífico', 'Calle Estación Circular, 5', 'L-V 10:00–20:00 · S 10:00–14:00', -3.6754, 40.4048],
].map(([suffix, name, slug, district, neighborhood, address, openingHours, longitude, latitude]) => ({
  id: `hub-${suffix}`,
  code: `HUB-MAD-${suffix}`,
  name: String(name),
  slug: String(slug),
  district: String(district),
  neighborhood: String(neighborhood),
  address: String(address),
  openingHours: String(openingHours),
  contactEmail: `hola.${String(slug)}@renodo.example`,
  coordinates: [Number(longitude), Number(latitude)] as [number, number],
  active: true,
}));

const itemBlueprints = [
  ['002', 'Vajilla para 24 personas', 'kitchen', 10, 4, 52, 2.5, 32, 1],
  ['003', 'Tienda de campaña 3P', 'outdoor', 20, 5, 69, 3.8, 28, 2],
  ['004', 'Bicicleta urbana', 'mobility', 30, 6, 186, 15.1, 41, 3],
  ['005', 'Proyector portátil', 'events', 0, 7, 203, 6.4, 19, 4],
  ['006', 'Escáner documental', 'technology', 10, 3, 120, 7.7, 16, 0],
  ['007', 'Lijadora orbital', 'tools', 20, 4, 137, 9, 53, 1],
  ['008', 'Robot de cocina', 'kitchen', 30, 5, 254, 8.8, 26, 2],
  ['009', 'Mochila de trekking 50L', 'outdoor', 0, 6, 171, 3.1, 34, 5],
  ['010', 'Carrito de carga plegable', 'mobility', 10, 7, 188, 4.4, 47, 0],
  ['011', 'Altavoz autoamplificado', 'events', 20, 3, 205, 5.7, 21, 3],
  ['012', 'Kit de podcast', 'technology', 30, 4, 322, 4.2, 14, 4],
  ['013', 'Taladro percutor 18V', 'tools', 0, 3, 135, 1.2, 67, 0],
] as const;

export const items: Item[] = itemBlueprints.map(
  ([code, name, category, deposit, maxLoanDays, replacementCost, waste, totalLoans, hubIndex], index) => {
    const slug = `${name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-itm-${code}`;
    const hub = hubs[hubIndex];
    return {
      id: `item-${code}`,
      code: `ITM-000${code}`,
      name,
      slug,
      description: `${name} revisado por el equipo de ${hub.name}, con accesorios básicos y una guía de uso clara incluida.`,
      category,
      condition: index % 4 === 0 ? 'excellent' : index % 3 === 0 ? 'fair' : 'good',
      status: 'available',
      deposit,
      maxLoanDays,
      replacementCost,
      estimatedWasteKg: waste,
      tags: [category, hub.district.toLowerCase(), 'revisado'],
      hub,
      totalLoans,
    };
  },
);

export const demoUsers: Record<'member' | 'manager' | 'admin', User> = {
  member: {
    id: 'demo-member',
    name: 'Lucía Martín',
    email: 'member@renodo.demo',
    role: 'member',
    district: 'Centro',
    favoriteItems: ['item-003', 'item-009'],
  },
  manager: {
    id: 'demo-manager',
    name: 'Bruno Prieto',
    email: 'manager@renodo.demo',
    role: 'manager',
    district: 'Arganzuela',
    favoriteItems: [],
  },
  admin: {
    id: 'demo-admin',
    name: 'Elena Ortega',
    email: 'admin@renodo.demo',
    role: 'admin',
    district: 'Centro',
    favoriteItems: [],
  },
};

export const demoReservations: Reservation[] = [
  {
    id: 'reservation-1',
    code: 'RSV-000241',
    item: items[1],
    hub: items[1].hub,
    startDate: '2026-09-04T09:00:00.000Z',
    endDate: '2026-09-07T09:00:00.000Z',
    status: 'approved',
    memberNote: 'Recogeré por la tarde.',
  },
  {
    id: 'reservation-2',
    code: 'RSV-000228',
    item: items[6],
    hub: items[6].hub,
    startDate: '2026-08-18T09:00:00.000Z',
    endDate: '2026-08-20T09:00:00.000Z',
    status: 'returned',
  },
];
