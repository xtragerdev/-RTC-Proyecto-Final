import type { Metadata } from 'next';

import { ItemDetail } from '@/components/item-detail';

export const metadata: Metadata = {
  title: 'Detalle del objeto | ReNodo',
  description: 'Consulta condiciones, centro y fechas disponibles antes de reservar.',
};

export default function ItemPage() {
  return <ItemDetail />;
}
