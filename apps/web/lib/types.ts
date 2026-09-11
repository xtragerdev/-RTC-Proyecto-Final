export type UserRole = 'member' | 'manager' | 'admin';

export type ItemCategory =
  | 'tools'
  | 'kitchen'
  | 'outdoor'
  | 'mobility'
  | 'events'
  | 'technology';

export type ItemStatus = 'available' | 'reserved' | 'maintenance' | 'retired';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  district?: string;
  avatar?: { url: string; publicId?: string };
  favoriteItems?: string[];
}

export interface Hub {
  id: string;
  code: string;
  name: string;
  slug: string;
  district: string;
  neighborhood: string;
  address: string;
  openingHours: string;
  contactEmail: string;
  coordinates: [number, number];
  active: boolean;
  managers?: Array<{ id: string; name: string; role: UserRole } | string>;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string;
  category: ItemCategory;
  condition: 'excellent' | 'good' | 'fair';
  status: ItemStatus;
  deposit: number;
  maxLoanDays: number;
  replacementCost: number;
  estimatedWasteKg: number;
  tags: string[];
  hub: Hub;
  totalLoans: number;
}

export interface Reservation {
  id: string;
  code: string;
  item: Item;
  user?: User;
  hub: Hub;
  startDate: string;
  endDate: string;
  status:
    | 'requested'
    | 'approved'
    | 'collected'
    | 'returned'
    | 'cancelled'
    | 'rejected'
    | 'overdue';
  memberNote?: string;
}

export interface ItemFilters {
  search: string;
  category: ItemCategory | 'all';
  hub: string;
  availableOnly: boolean;
}
