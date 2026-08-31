'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  Leaf,
  MapPin,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { CategoryIcon } from '@/components/category-icon';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';
import { createReservationRequest, getItem } from '@/lib/api';
import { categoryLabels, conditionLabels } from '@/lib/demo-data';

const dateValue = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export function ItemDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, token, demoMode } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const [reserved, setReserved] = useState(false);
  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : String(params.slug ?? '');
  const {
    data: item,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['item', slug],
    queryFn: () => getItem(slug),
    enabled: Boolean(slug),
  });

  const schema = useMemo(
    () =>
      z
        .object({
          startDate: z.string().min(1, 'Elige la fecha de recogida.'),
          endDate: z.string().min(1, 'Elige la fecha de devolución.'),
          memberNote: z.string().max(300, 'Máximo 300 caracteres.').optional(),
        })
        .refine(
          (values) => new Date(values.endDate) > new Date(values.startDate),
          {
            path: ['endDate'],
            message: 'La devolución debe ser posterior a la recogida.',
          },
        )
        .refine(
          (values) =>
            !item ||
            (new Date(values.endDate).getTime() -
              new Date(values.startDate).getTime()) /
              86_400_000 <=
              item.maxLoanDays,
          {
            path: ['endDate'],
            message: `El préstamo máximo es de ${item?.maxLoanDays ?? 7} días.`,
          },
        ),
    [item],
  );
  type ReservationValues = z.infer<typeof schema>;
  const form = useForm<ReservationValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: dateValue(2),
      endDate: dateValue(4),
      memberNote: '',
    },
  });

  if (isLoading) {
    return (
      <main id="contenido" className="page-content missing-page" aria-busy="true">
        <PackageCheck aria-hidden="true" />
        <h1>Preparando el objeto…</h1>
        <p>Estamos comprobando su disponibilidad y condiciones de préstamo.</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main id="contenido" className="page-content missing-page" role="alert">
        <PackageCheck aria-hidden="true" />
        <h1>No hemos podido cargar este objeto.</h1>
        <p>
          {error instanceof Error
            ? error.message
            : 'Revisa tu conexión e inténtalo de nuevo.'}
        </p>
        <Button type="button" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </main>
    );
  }

  if (!item) {
    return (
      <main id="contenido" className="page-content missing-page">
        <PackageCheck aria-hidden="true" />
        <h1>Este objeto ya no está en el catálogo.</h1>
        <p>Puede que haya cambiado de centro o esté en mantenimiento.</p>
        <Button asChild>
          <Link href="/explorar">Volver al catálogo</Link>
        </Button>
      </main>
    );
  }

  const favorite = favorites.includes(item.id);
  const selectedItem = item;

  async function submitReservation(values: ReservationValues) {
    if (!user || !token) {
      toast.info('Entra para completar la reserva.');
      router.push(`/acceso?volver=/objetos/${selectedItem.slug}`);
      return;
    }
    try {
      if (!demoMode) {
        await createReservationRequest(token, {
          item: selectedItem.id,
          startDate: new Date(`${values.startDate}T09:00:00`).toISOString(),
          endDate: new Date(`${values.endDate}T09:00:00`).toISOString(),
          memberNote: values.memberNote,
        });
      }
      setReserved(true);
      toast.success('Solicitud registrada. El centro la revisará pronto.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo completar la reserva.',
      );
    }
  }

  return (
    <main id="contenido" className="page-content item-detail-page">
      <Link className="back-link" href="/explorar">
        <ArrowLeft aria-hidden="true" /> Volver al catálogo
      </Link>
      <div className="item-detail-layout">
        <section className="item-detail-main">
          <div className={`detail-visual item-media--${item.category}`}>
            <CategoryIcon category={item.category} aria-hidden="true" />
            <span>{categoryLabels[item.category]}</span>
            <button
              className={favorite ? 'is-favorite' : undefined}
              type="button"
              aria-pressed={favorite}
              onClick={() => toggleFavorite(item.id)}
            >
              <Heart aria-hidden="true" /> {favorite ? 'Guardado' : 'Guardar'}
            </button>
          </div>
          <div className="detail-heading">
            <div>
              <p className="eyebrow">
                {item.code} · {conditionLabels[item.condition]}
              </p>
              <h1>{item.name}</h1>
              <p>{item.description}</p>
            </div>
            <span className="available-pill">
              <CheckCircle2 aria-hidden="true" /> Disponible
            </span>
          </div>
          <dl className="item-facts">
            <div>
              <dt>
                <Clock3 aria-hidden="true" /> Préstamo
              </dt>
              <dd>Hasta {item.maxLoanDays} días</dd>
            </div>
            <div>
              <dt>
                <ShieldCheck aria-hidden="true" /> Fianza
              </dt>
              <dd>
                {item.deposit
                  ? `${item.deposit} € reembolsables`
                  : 'Sin fianza'}
              </dd>
            </div>
            <div>
              <dt>
                <Leaf aria-hidden="true" /> Impacto
              </dt>
              <dd>{item.estimatedWasteKg} kg evitados</dd>
            </div>
            <div>
              <dt>
                <PackageCheck aria-hidden="true" /> Historial
              </dt>
              <dd>{item.totalLoans} préstamos</dd>
            </div>
          </dl>
          <section className="pickup-card">
            <MapPin aria-hidden="true" />
            <div>
              <span>Recogida y devolución</span>
              <h2>{item.hub.name}</h2>
              <p>
                {item.hub.address} · {item.hub.neighborhood}
              </p>
              <small>{item.hub.openingHours}</small>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/centros">Ver centro</Link>
            </Button>
          </section>
        </section>

        <aside
          className="reservation-panel"
          aria-labelledby="reservation-title"
        >
          {reserved ? (
            <div className="reservation-success">
              <CheckCircle2 aria-hidden="true" />
              <p className="section-kicker">Solicitud enviada</p>
              <h2 id="reservation-title">Ya está en manos del centro.</h2>
              <p>
                Recibirás una confirmación cuando el equipo revise la
                disponibilidad y el estado del objeto.
              </p>
              <Button asChild>
                <Link href="/cuenta">Ver mis reservas</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(submitReservation)} noValidate>
              <p className="section-kicker">Reserva gratuita</p>
              <h2 id="reservation-title">Elige tus fechas</h2>
              <p>El centro suele responder en menos de 24 horas.</p>
              <label>
                Recogida
                <div>
                  <CalendarDays aria-hidden="true" />
                  <input
                    type="date"
                    min={dateValue(1)}
                    {...form.register('startDate')}
                  />
                </div>
                {form.formState.errors.startDate && (
                  <small>{form.formState.errors.startDate.message}</small>
                )}
              </label>
              <label>
                Devolución
                <div>
                  <CalendarDays aria-hidden="true" />
                  <input
                    type="date"
                    min={form.watch('startDate') || dateValue(2)}
                    {...form.register('endDate')}
                  />
                </div>
                {form.formState.errors.endDate && (
                  <small>{form.formState.errors.endDate.message}</small>
                )}
              </label>
              <label>
                Nota para el centro <span>Opcional</span>
                <textarea
                  rows={3}
                  placeholder="Por ejemplo, recogeré por la tarde."
                  {...form.register('memberNote')}
                />
                {form.formState.errors.memberNote && (
                  <small>{form.formState.errors.memberNote.message}</small>
                )}
              </label>
              <div className="reservation-summary">
                <span>
                  Coste del préstamo<strong>0 €</strong>
                </span>
                <span>
                  Fianza reembolsable<strong>{item.deposit} €</strong>
                </span>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? 'Comprobando…'
                  : user
                    ? 'Solicitar reserva'
                    : 'Entrar y reservar'}
              </Button>
              <small className="privacy-note">
                <ShieldCheck aria-hidden="true" /> La solicitud no bloquea el
                objeto hasta ser confirmada.
              </small>
            </form>
          )}
        </aside>
      </div>
    </main>
  );
}
