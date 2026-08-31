import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Leaf,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { CategoryIcon } from '@/components/category-icon';
import { HomeSearch } from '@/components/home-search';
import { ItemCard } from '@/components/item-card';
import { Button } from '@/components/ui/button';
import { categoryLabels, items } from '@/lib/demo-data';

const categories = ['tools', 'kitchen', 'outdoor', 'mobility', 'events', 'technology'] as const;

export default function Home() {
  return (
    <main id="contenido" className="page-content home-page">
      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">
            <MapPin aria-hidden="true" /> Biblioteca de objetos · Madrid
          </p>
          <h1 id="page-title">
            Pide prestado. <span>Compra menos.</span> Comparte más.
          </h1>
          <p className="intro-copy">
            Reserva objetos útiles cerca de casa, recógelos en tu centro comunitario y
            devuélvelos para que sigan circulando.
          </p>
        </div>
        <aside className="impact-note" aria-label="Impacto de la comunidad">
          <Sparkles aria-hidden="true" />
          <div>
            <strong>12.840 compras evitadas</strong>
            <span>por la comunidad este año</span>
          </div>
        </aside>
      </section>

      <HomeSearch />

      <section className="home-visual" aria-label="La comunidad ReNodo">
        <Image
          src="/og.png"
          width={1200}
          height={630}
          priority
          alt="Objetos compartidos en ReNodo: herramientas, material de acampada, vajilla y bicicleta"
        />
        <div className="visual-facts">
          <span>
            <ShieldCheck aria-hidden="true" /> Objetos revisados
          </span>
          <span>
            <UsersRound aria-hidden="true" /> 6.300 vecinos
          </span>
          <span>
            <Leaf aria-hidden="true" /> 19 t evitadas
          </span>
        </div>
      </section>

      <section className="category-band" aria-labelledby="categories-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Una solución para cada ocasión</p>
            <h2 id="categories-title">¿Qué te vendría bien?</h2>
          </div>
          <Link href="/explorar">
            Ver catálogo <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="home-categories">
          {categories.map((category) => (
            <Link href={`/explorar?categoria=${category}`} key={category}>
              <CategoryIcon category={category} aria-hidden="true" />
              <span>{categoryLabels[category]}</span>
              <small>30 objetos</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="catalogue home-catalogue" aria-labelledby="catalogue-title">
        <div className="catalogue-main">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Disponible esta semana</p>
              <h2 id="catalogue-title">Empieza por algo cercano</h2>
            </div>
            <Link href="/explorar">
              Ver los 180 objetos <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="item-grid home-item-grid">
            {items.slice(0, 3).map((item) => (
              <ItemCard item={item} key={item.id} />
            ))}
          </div>
        </div>
        <aside className="side-panel" aria-label="Cómo funciona">
          <span className="side-panel-number">01</span>
          <h2>Una red hecha para circular</h2>
          <p>
            Reserva en segundos y recoge en el centro de tu barrio. Sin cuotas y con
            trazabilidad en cada préstamo.
          </p>
          <ol>
            <li>
              <span>1</span> Busca lo que necesitas
            </li>
            <li>
              <span>2</span> Elige fechas disponibles
            </li>
            <li>
              <span>3</span> Recoge y devuelve en tu nodo
            </li>
          </ol>
          <Link href="/como-funciona">
            Conoce el modelo <ArrowRight aria-hidden="true" />
          </Link>
        </aside>
      </section>

      <section className="process-section" aria-labelledby="process-title">
        <div className="process-intro">
          <p className="section-kicker">De la necesidad a la devolución</p>
          <h2 id="process-title">Compartir sin complicaciones</h2>
          <p>
            Cada reserva deja claro qué pasa después. El centro confirma, prepara el objeto y
            te acompaña hasta su devolución.
          </p>
          <Button asChild>
            <Link href="/acceso?modo=registro">Únete a la red</Link>
          </Button>
        </div>
        <ol className="process-steps">
          <li>
            <CalendarCheck2 aria-hidden="true" />
            <div><span>01</span><h3>Reserva</h3><p>Elige un objeto y un rango de fechas disponible.</p></div>
          </li>
          <li>
            <PackageCheck aria-hidden="true" />
            <div><span>02</span><h3>Recoge</h3><p>El centro revisa la solicitud y prepara todo.</p></div>
          </li>
          <li>
            <RotateCcw aria-hidden="true" />
            <div><span>03</span><h3>Devuelve</h3><p>Otro vecino podrá darle el siguiente uso.</p></div>
          </li>
        </ol>
      </section>

      <section className="home-cta">
        <div>
          <BadgeCheck aria-hidden="true" />
          <p className="section-kicker">Circular también es cuidar</p>
          <h2>¿Tu trastero puede ayudar al barrio?</h2>
          <p>Los centros validan cada donación antes de incorporarla al inventario compartido.</p>
        </div>
        <Button asChild variant="secondary" size="lg">
          <Link href="mailto:hola@renodo.example">
            Proponer un objeto <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
