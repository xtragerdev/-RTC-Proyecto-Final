import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CatalogExplorer } from '@/components/catalog-explorer';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Explorar objetos | ReNodo',
  description: 'Busca y filtra el inventario comunitario de ReNodo por categoría y centro.',
};

export default function ExplorePage() {
  return (
    <main id="contenido" className="page-content inner-page">
      <header className="page-hero compact-hero">
        <p className="eyebrow">Catálogo compartido · 180 objetos</p>
        <h1>Encuentra lo que necesitas, cerca.</h1>
        <p>Filtra por categoría o centro. Cada objeto muestra sus condiciones antes de reservar.</p>
      </header>
      <Suspense fallback={<Skeleton className="workspace-skeleton" />}>
        <CatalogExplorer />
      </Suspense>
    </main>
  );
}
