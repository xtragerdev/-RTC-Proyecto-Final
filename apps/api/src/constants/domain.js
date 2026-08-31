export const ROLES = Object.freeze({
  MEMBER: 'member',
  MANAGER: 'manager',
  ADMIN: 'admin',
});

export const ROLE_VALUES = Object.values(ROLES);

export const ITEM_CATEGORIES = Object.freeze([
  'tools',
  'kitchen',
  'outdoor',
  'mobility',
  'events',
  'technology',
]);

export const ITEM_STATUSES = Object.freeze(['available', 'reserved', 'maintenance', 'retired']);

export const ITEM_CONDITIONS = Object.freeze(['excellent', 'good', 'fair']);

export const RESERVATION_STATUSES = Object.freeze([
  'requested',
  'approved',
  'collected',
  'returned',
  'cancelled',
  'rejected',
  'overdue',
]);

export const BLOCKING_RESERVATION_STATUSES = Object.freeze(['approved', 'collected', 'overdue']);
