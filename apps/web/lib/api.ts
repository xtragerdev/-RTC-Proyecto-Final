import { items as demoItems } from './demo-data';
import type { Item, ItemFilters, Reservation, User } from './types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

type ApiEnvelope<T> = { success?: boolean; data: T; meta?: Record<string, unknown> } | T;

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  if (!API_URL) throw new ApiError('La API no está configurada en este entorno.', 503);

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
    error?: { message?: string; details?: unknown };
  };
  if (!response.ok) {
    throw new ApiError(
      payload.error?.message ?? payload.message ?? 'No se pudo completar la solicitud.',
      response.status,
      payload.error?.details,
    );
  }
  return ('data' in payload ? payload.data : payload) as T;
}

export async function getItems(filters: ItemFilters): Promise<Item[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.hub !== 'all') params.set('hub', filters.hub);
  if (filters.availableOnly) params.set('available', 'true');

  if (!API_URL) {
    const query = filters.search.trim().toLocaleLowerCase('es');
    return demoItems.filter((item) => {
      const matchesSearch =
        !query ||
        `${item.name} ${item.description} ${item.tags.join(' ')}`
          .toLocaleLowerCase('es')
          .includes(query);
      const matchesCategory =
        filters.category === 'all' || item.category === filters.category;
      const matchesHub =
        filters.hub === 'all' || item.hub.slug === filters.hub;
      const matchesAvailability =
        !filters.availableOnly || item.status === 'available';
      return (
        matchesSearch &&
        matchesCategory &&
        matchesHub &&
        matchesAvailability
      );
    });
  }

  const result = await apiRequest<ApiEnvelope<Item[]>>(
    `/api/v1/items?${params}`,
  );
  if (Array.isArray(result)) return result;
  return result.data;
}

export async function getItem(idOrSlug: string): Promise<Item | null> {
  if (!API_URL) {
    return (
      demoItems.find(
        (item) => item.id === idOrSlug || item.slug === idOrSlug,
      ) ?? null
    );
  }

  try {
    const result = await apiRequest<ApiEnvelope<Item>>(
      `/api/v1/items/${encodeURIComponent(idOrSlug)}`,
    );
    if ('data' in (result as { data?: Item })) {
      return (result as { data: Item }).data;
    }
    return result as Item;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function loginRequest(email: string, password: string) {
  return apiRequest<{ token: string; user: User }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(formData: FormData) {
  return apiRequest<{ token: string; user: User }>('/api/v1/auth/register', {
    method: 'POST',
    body: formData,
  });
}

export async function createReservationRequest(
  token: string,
  payload: { item: string; startDate: string; endDate: string; memberNote?: string },
) {
  return apiRequest<Reservation>('/api/v1/reservations', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function getMyReservations(token: string): Promise<Reservation[]> {
  const result = await apiRequest<ApiEnvelope<Reservation[]>>(
    '/api/v1/reservations?mine=true',
    { token },
  );
  if (Array.isArray(result)) return result;
  return result.data;
}

export async function cancelReservationRequest(token: string, id: string) {
  return apiRequest<Reservation>(`/api/v1/reservations/${id}`, {
    method: 'DELETE',
    token,
  });
}

export { API_URL };
