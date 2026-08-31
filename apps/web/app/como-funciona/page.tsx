import type { Metadata } from 'next';
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Database,
  Handshake,
  Leaf,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Cómo funciona | ReNodo',
  description: 'Conoce las reglas, la seguridad y el impacto del modelo de préstamo ReNodo.',
};

const steps = [
  { number: '01', title: 'Encuentra', copy: 'Busca por necesidad, categoría o centro y revisa las condiciones.', icon: CalendarDays },
  { number: '02', title: 'Solicita', copy: 'Elige fechas. El sistema evita reservas que se solapen.', icon: CircleCheck },
  { number: '03', title: 'Recoge', copy: 'El equipo del centro valida el estado y registra la entrega.', icon: PackageCheck },
  { number: '04', title: 'Devuelve', copy: 'La devolución libera el objeto para el siguiente vecino.', icon: RotateCcw },
];

export default function HowItWorksPage() {
  return (
    <main id="contenido" className="page-content inner-page how-page">
      <header className="page-hero how-hero">
        <p className="eyebrow">Reglas claras · Objetos que circulan</p>
        <h1>Compartir funciona cuando sabemos qué esperar.</h1>
        <p>ReNodo combina tecnología, cuidado comunitario y trazabilidad para que cada préstamo sea sencillo y seguro.</p>
        <Button asChild size="lg"><Link href="/explorar">Explorar catálogo <ArrowRight aria-hidden="true" /></Link></Button>
      </header>

      <section className="how-steps" aria-labelledby="steps-title">
        <div className="section-heading"><div><p className="section-kicker">El recorrido</p><h2 id="steps-title">Cuatro pasos, cero dudas</h2></div></div>
        <ol>
          {steps.map(({ number, title, copy, icon: Icon }) => (
            <li key={number}>
              <span>{number}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="trust-section" aria-labelledby="trust-title">
        <div className="trust-copy">
          <p className="section-kicker">Confianza por diseño</p>
          <h2 id="trust-title">Cada rol hace lo justo.</h2>
          <p>Los miembros reservan y gestionan su cuenta. Los responsables actúan solo sobre sus centros. Los administradores coordinan la red.</p>
          <ul>
            <li><ShieldCheck aria-hidden="true" /><span><strong>Permisos comprobados</strong> en cada ruta del servidor.</span></li>
            <li><Handshake aria-hidden="true" /><span><strong>Historial de estados</strong> para saber quién hizo qué.</span></li>
            <li><Leaf aria-hidden="true" /><span><strong>Impacto medible</strong> por objeto y préstamo.</span></li>
          </ul>
        </div>
        <div className="role-stack" aria-label="Roles de ReNodo">
          <article><span>Miembro</span><h3>Busca, reserva y cuida</h3><p>Puede editar y eliminar su propia cuenta, nunca la de otra persona.</p></article>
          <article><span>Responsable</span><h3>Gestiona su nodo</h3><p>Aprueba solicitudes y mantiene el inventario del centro asignado.</p></article>
          <article><span>Administrador</span><h3>Coordina la red</h3><p>Asigna roles y supervisa centros, usuarios y actividad global.</p></article>
        </div>
      </section>

      <section className="data-section" id="transparencia" aria-labelledby="data-title">
        <Database aria-hidden="true" />
        <div>
          <p className="section-kicker">Transparencia del dato</p>
          <h2 id="data-title">La base nace de un Excel verificable.</h2>
          <p>512 registros sintéticos, cuatro colecciones relacionadas y controles automáticos de claves y fechas. La semilla lee los CSV con Node.js y fs antes de insertar en MongoDB.</p>
        </div>
        <dl>
          <div><dt>Usuarios</dt><dd>60</dd></div><div><dt>Centros</dt><dd>12</dd></div><div><dt>Objetos</dt><dd>180</dd></div><div><dt>Reservas</dt><dd>260</dd></div>
        </dl>
      </section>
    </main>
  );
}
