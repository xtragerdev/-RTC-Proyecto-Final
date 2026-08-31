import type { Metadata } from 'next';
import { Building2, PackageCheck, UsersRound } from 'lucide-react';

import { CenterDirectory } from '@/components/center-directory';

export const metadata: Metadata = {
  title: 'Centros comunitarios | ReNodo',
  description: 'Consulta dónde recoger y devolver objetos de la red ReNodo en Madrid.',
};

export default function CentersPage() {
  return (
    <main id="contenido" className="page-content inner-page">
      <header className="page-hero centers-hero">
        <div>
          <p className="eyebrow">12 nodos · 11 distritos</p>
          <h1>Un punto de encuentro en cada barrio.</h1>
          <p>Los centros cuidan el inventario, validan las reservas y hacen posible cada préstamo.</p>
        </div>
        <div className="hero-stats">
          <span><Building2 aria-hidden="true" /><strong>12</strong><small>centros activos</small></span>
          <span><PackageCheck aria-hidden="true" /><strong>180</strong><small>objetos revisados</small></span>
          <span><UsersRound aria-hidden="true" /><strong>6,3 k</strong><small>personas en red</small></span>
        </div>
      </header>
      <CenterDirectory />
    </main>
  );
}
