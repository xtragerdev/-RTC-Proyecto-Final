import type { Metadata } from 'next';

import { ManagementDashboard } from '@/components/management-dashboard';

export const metadata: Metadata = { title: 'Gestión | ReNodo', description: 'Panel seguro para responsables de centro y administradores ReNodo.' };

export default function ManagementPage() { return <ManagementDashboard />; }
