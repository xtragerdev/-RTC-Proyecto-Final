import type { Metadata } from 'next';

import { AccountDashboard } from '@/components/account-dashboard';

export const metadata: Metadata = { title: 'Mi cuenta | ReNodo', description: 'Reservas, favoritos e impacto personal en ReNodo.' };

export default function AccountPage() { return <AccountDashboard />; }
