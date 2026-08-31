import { randomUUID } from 'node:crypto';

export const createCode = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`.toUpperCase();

export const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
