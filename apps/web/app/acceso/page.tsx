import type { Metadata } from 'next';
import { Leaf, PackageCheck, ShieldCheck } from 'lucide-react';
import { Suspense } from 'react';

import { AuthPanel } from '@/components/auth-panel';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Acceso | ReNodo',
  description: 'Entra o crea una cuenta de miembro para reservar objetos en ReNodo.',
};

export default function AccessPage() {
  return (
    <main id="contenido" className="auth-page">
      <aside className="auth-story">
        <div><p className="eyebrow">Bienvenido a ReNodo</p><h2>Lo útil no tiene por qué pertenecer a una sola persona.</h2><p>Accede a objetos revisados y a una red de centros que acompaña cada préstamo.</p></div>
        <ul><li><PackageCheck aria-hidden="true" /><span><strong>180 objetos</strong> listos para circular</span></li><li><ShieldCheck aria-hidden="true" /><span><strong>Reservas protegidas</strong> contra solapamientos</span></li><li><Leaf aria-hidden="true" /><span><strong>Impacto visible</strong> en cada devolución</span></li></ul>
      </aside>
      <Suspense fallback={<Skeleton className="auth-skeleton" />}><AuthPanel /></Suspense>
    </main>
  );
}
