'use client';

import {
  CalendarDays,
  Clock3,
  Heart,
  Leaf,
  LogOut,
  MapPin,
  PackageOpen,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { ItemCard } from '@/components/item-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/hooks/use-favorites';
import { demoReservations, items } from '@/lib/demo-data';
import type { Reservation } from '@/lib/types';

const statusLabels = {
  requested: 'Pendiente',
  approved: 'Confirmada',
  collected: 'En préstamo',
  returned: 'Devuelta',
  cancelled: 'Cancelada',
  rejected: 'Rechazada',
  overdue: 'Con retraso',
};

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function AccountDashboard() {
  const { user, ready, demoMode, logout } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const [tab, setTab] = useState<'reservations' | 'favorites' | 'profile'>(
    'reservations',
  );
  const [reservations, setReservations] =
    useState<Reservation[]>(demoReservations);
  const [isPending, startTransition] = useTransition();
  const [optimisticReservations, cancelOptimistically] = useOptimistic(
    reservations,
    (current, id: string) =>
      current.map((reservation) =>
        reservation.id === id
          ? { ...reservation, status: 'cancelled' as const }
          : reservation,
      ),
  );
  const favoriteItems = useMemo(
    () => items.filter((item) => favorites.includes(item.id)),
    [favorites],
  );

  if (!ready)
    return <div className="dashboard-loading">Preparando tu espacio…</div>;
  if (!user) {
    return (
      <div className="account-guard">
        <UserRound aria-hidden="true" />
        <h1>Tu cuenta reúne todo lo que compartes.</h1>
        <p>Entra para ver reservas, favoritos e impacto personal.</p>
        <Button asChild size="lg">
          <Link href="/acceso">Entrar en ReNodo</Link>
        </Button>
      </div>
    );
  }

  function cancelReservation(id: string) {
    startTransition(() => {
      cancelOptimistically(id);
      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === id
            ? { ...reservation, status: 'cancelled' }
            : reservation,
        ),
      );
    });
    toast.success('Reserva cancelada. El objeto vuelve a estar disponible.');
  }

  function deleteDemoAccount() {
    if (!demoMode) {
      toast.info(
        'La eliminación real exige confirmar la contraseña en la API.',
      );
      return;
    }
    if (window.confirm('¿Cerrar y borrar esta sesión demostrativa?')) {
      logout();
      toast.success('Sesión demostrativa eliminada.');
    }
  }

  return (
    <main id="contenido" className="page-content account-page">
      <header className="account-header">
        <div className="profile-avatar">
          {user.name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div>
          <p className="eyebrow">Tu espacio en la red</p>
          <h1>Hola, {user.name.split(' ')[0]}.</h1>
          <p>
            {user.district ?? 'Madrid'} · {user.email}
          </p>
        </div>
        {demoMode && (
          <span className="demo-pill">
            <ShieldCheck aria-hidden="true" /> Modo demostración
          </span>
        )}
      </header>

      <section className="account-impact" aria-label="Resumen de impacto">
        <div>
          <PackageOpen aria-hidden="true" />
          <span>
            <strong>7</strong> préstamos completados
          </span>
        </div>
        <div>
          <Leaf aria-hidden="true" />
          <span>
            <strong>28,4 kg</strong> de residuos evitados
          </span>
        </div>
        <div>
          <Heart aria-hidden="true" />
          <span>
            <strong>{favorites.length}</strong> objetos guardados
          </span>
        </div>
      </section>

      <div
        className="account-tabs"
        role="tablist"
        aria-label="Secciones de cuenta"
      >
        <button
          className={tab === 'reservations' ? 'is-active' : undefined}
          role="tab"
          aria-selected={tab === 'reservations'}
          type="button"
          onClick={() => setTab('reservations')}
        >
          Mis reservas
        </button>
        <button
          className={tab === 'favorites' ? 'is-active' : undefined}
          role="tab"
          aria-selected={tab === 'favorites'}
          type="button"
          onClick={() => setTab('favorites')}
        >
          Favoritos <span>{favorites.length}</span>
        </button>
        <button
          className={tab === 'profile' ? 'is-active' : undefined}
          role="tab"
          aria-selected={tab === 'profile'}
          type="button"
          onClick={() => setTab('profile')}
        >
          Perfil y seguridad
        </button>
      </div>

      {tab === 'reservations' && (
        <section
          className={`reservation-list${isPending ? ' is-updating' : ''}`}
          role="tabpanel"
        >
          <div className="dashboard-section-heading">
            <div>
              <h2>Reservas recientes</h2>
              <p>
                Sigue cada solicitud desde la aprobación hasta la devolución.
              </p>
            </div>
            <Button asChild>
              <Link href="/explorar">Buscar otro objeto</Link>
            </Button>
          </div>
          {optimisticReservations.map((reservation) => (
            <article className="reservation-row" key={reservation.id}>
              <div
                className={`reservation-icon item-media--${reservation.item.category}`}
              >
                <PackageOpen aria-hidden="true" />
              </div>
              <div className="reservation-info">
                <span className={`status-badge status-${reservation.status}`}>
                  {statusLabels[reservation.status]}
                </span>
                <h3>{reservation.item.name}</h3>
                <p>
                  <MapPin aria-hidden="true" /> {reservation.hub.name}
                </p>
              </div>
              <div className="reservation-dates">
                <span>
                  <CalendarDays aria-hidden="true" /> Recogida
                  <strong>
                    {dateFormatter.format(new Date(reservation.startDate))}
                  </strong>
                </span>
                <span>
                  <Clock3 aria-hidden="true" /> Devolución
                  <strong>
                    {dateFormatter.format(new Date(reservation.endDate))}
                  </strong>
                </span>
              </div>
              <div className="reservation-actions">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/objetos/${reservation.item.slug}`}>
                    Ver objeto
                  </Link>
                </Button>
                {['requested', 'approved'].includes(reservation.status) && (
                  <button
                    type="button"
                    onClick={() => cancelReservation(reservation.id)}
                  >
                    <XCircle aria-hidden="true" /> Cancelar
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'favorites' && (
        <section role="tabpanel">
          <div className="dashboard-section-heading">
            <div>
              <h2>Objetos guardados</h2>
              <p>
                Tu lista no admite duplicados y se conserva en este dispositivo.
              </p>
            </div>
          </div>
          {favoriteItems.length ? (
            <div className="catalog-grid account-favorites">
              {favoriteItems.map((item) => (
                <ItemCard
                  item={item}
                  key={item.id}
                  favorite
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Heart aria-hidden="true" />
              <h2>Aún no has guardado nada</h2>
              <p>Marca el corazón de cualquier objeto para tenerlo a mano.</p>
              <Button asChild variant="outline">
                <Link href="/explorar">Explorar catálogo</Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {tab === 'profile' && (
        <section className="profile-settings" role="tabpanel">
          <div>
            <h2>Datos de la cuenta</h2>
            <dl>
              <div>
                <dt>Nombre</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>
                  {user.role === 'member'
                    ? 'Miembro'
                    : user.role === 'manager'
                      ? 'Responsable de centro'
                      : 'Administración'}
                </dd>
              </div>
              <div>
                <dt>Distrito</dt>
                <dd>{user.district ?? 'Sin indicar'}</dd>
              </div>
            </dl>
            <Button variant="outline" type="button">
              Editar perfil
            </Button>
          </div>
          <div className="security-card">
            <ShieldCheck aria-hidden="true" />
            <h2>Seguridad</h2>
            <p>
              Tu rol solo puede cambiarlo un administrador. Ningún miembro puede
              elevar sus propios permisos.
            </p>
            <Button variant="outline" type="button">
              Cambiar contraseña
            </Button>
          </div>
          <div className="danger-card">
            <Trash2 aria-hidden="true" />
            <h2>Eliminar mi cuenta</h2>
            <p>
              Se borrará también la imagen asociada en Cloudinary. Esta acción
              requiere confirmación.
            </p>
            <Button
              variant="destructive"
              type="button"
              onClick={deleteDemoAccount}
            >
              Eliminar mi cuenta
            </Button>
          </div>
          <button className="logout-link" type="button" onClick={logout}>
            <LogOut aria-hidden="true" /> Cerrar sesión
          </button>
        </section>
      )}
    </main>
  );
}
