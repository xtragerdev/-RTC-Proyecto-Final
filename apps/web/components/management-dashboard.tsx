'use client';

/* oxlint-disable jsx-a11y/control-has-associated-label -- dynamic table cells contain visible names and explicit select labels */

import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Check,
  Clock3,
  PackageCheck,
  PackagePlus,
  ShieldAlert,
  UsersRound,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useReducer, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { demoReservations, demoUsers, items } from '@/lib/demo-data';
import type { Reservation, User, UserRole } from '@/lib/types';

type QueueAction = {
  type: 'STATUS';
  id: string;
  status: Reservation['status'];
};

const queueSeed: Reservation[] = [
  {
    ...demoReservations[0],
    id: 'queue-1',
    code: 'RSV-000251',
    status: 'requested',
    user: demoUsers.member,
  },
  {
    ...demoReservations[1],
    id: 'queue-2',
    code: 'RSV-000252',
    status: 'requested',
    user: {
      ...demoUsers.member,
      id: 'member-2',
      name: 'Mario Molina',
      email: 'mario@renodo.demo',
    },
    item: items[4],
    hub: items[4].hub,
    startDate: '2026-09-02T09:00:00.000Z',
    endDate: '2026-09-05T09:00:00.000Z',
  },
  {
    ...demoReservations[0],
    id: 'queue-3',
    code: 'RSV-000253',
    status: 'approved',
    user: {
      ...demoUsers.member,
      id: 'member-3',
      name: 'Inés Romero',
      email: 'ines@renodo.demo',
    },
    item: items[5],
    hub: items[5].hub,
    startDate: '2026-09-01T09:00:00.000Z',
    endDate: '2026-09-03T09:00:00.000Z',
  },
  {
    ...demoReservations[1],
    id: 'queue-4',
    code: 'RSV-000254',
    status: 'collected',
    user: {
      ...demoUsers.member,
      id: 'member-4',
      name: 'Carmen Navarro',
      email: 'carmen@renodo.demo',
    },
    item: items[8],
    hub: items[8].hub,
    startDate: '2026-08-29T09:00:00.000Z',
    endDate: '2026-09-02T09:00:00.000Z',
  },
];

const userSeed: User[] = [
  demoUsers.member,
  demoUsers.manager,
  {
    ...demoUsers.member,
    id: 'member-2',
    name: 'Mario Molina',
    email: 'mario@renodo.demo',
    role: 'member',
  },
  {
    ...demoUsers.member,
    id: 'member-3',
    name: 'Inés Romero',
    email: 'ines@renodo.demo',
    role: 'member',
  },
];

function queueReducer(state: Reservation[], action: QueueAction) {
  if (action.type === 'STATUS')
    return state.map((reservation) =>
      reservation.id === action.id
        ? { ...reservation, status: action.status }
        : reservation,
    );
  return state;
}

const statusLabel = {
  requested: 'Pendiente',
  approved: 'Aprobada',
  collected: 'En préstamo',
  returned: 'Devuelta',
  cancelled: 'Cancelada',
  rejected: 'Rechazada',
  overdue: 'Con retraso',
};
const formatDate = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
});

export function ManagementDashboard() {
  const { user, ready } = useAuth();
  const [tab, setTab] = useState<'queue' | 'inventory' | 'users'>('queue');
  const [queue, dispatch] = useReducer(queueReducer, queueSeed);
  const [managedUsers, setManagedUsers] = useState(userSeed);
  const [isPending, startTransition] = useTransition();
  const canManage = user?.role === 'manager' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const pendingCount = queue.filter(
    (reservation) => reservation.status === 'requested',
  ).length;
  const hubItems = useMemo(() => items.slice(0, 8), []);

  if (!ready)
    return <div className="dashboard-loading">Comprobando permisos…</div>;
  if (!canManage) {
    return (
      <main id="contenido" className="page-content account-guard">
        <ShieldAlert aria-hidden="true" />
        <h1>Este espacio es para responsables de centro.</h1>
        <p>
          Entra con un perfil responsable o administrador para acceder a la
          gestión.
        </p>
        <Button asChild>
          <Link href="/acceso">Elegir acceso demostración</Link>
        </Button>
      </main>
    );
  }

  function updateStatus(id: string, status: Reservation['status']) {
    startTransition(() => dispatch({ type: 'STATUS', id, status }));
    toast.success(
      status === 'approved'
        ? 'Reserva aprobada.'
        : status === 'rejected'
          ? 'Solicitud rechazada.'
          : 'Estado actualizado.',
    );
  }

  function updateRole(userId: string, role: UserRole) {
    if (!isAdmin) return;
    setManagedUsers((current) =>
      current.map((entry) =>
        entry.id === userId ? { ...entry, role } : entry,
      ),
    );
    toast.success('Rol actualizado con permisos de administración.');
  }

  return (
    <main id="contenido" className="management-page">
      <aside className="management-sidebar">
        <div>
          <p className="eyebrow">Panel de operaciones</p>
          <h1>{isAdmin ? 'Red ReNodo' : 'Nodo Palos de Moguer'}</h1>
          <span className="role-pill">
            {isAdmin ? 'Administración' : 'Responsable de centro'}
          </span>
        </div>
        <nav aria-label="Secciones de gestión">
          <button
            className={tab === 'queue' ? 'is-active' : undefined}
            type="button"
            onClick={() => setTab('queue')}
          >
            <Clock3 aria-hidden="true" /> Reservas <span>{pendingCount}</span>
          </button>
          <button
            className={tab === 'inventory' ? 'is-active' : undefined}
            type="button"
            onClick={() => setTab('inventory')}
          >
            <PackageCheck aria-hidden="true" /> Inventario
          </button>
          {isAdmin && (
            <button
              className={tab === 'users' ? 'is-active' : undefined}
              type="button"
              onClick={() => setTab('users')}
            >
              <UsersRound aria-hidden="true" /> Personas y roles
            </button>
          )}
        </nav>
        <div className="sidebar-help">
          <AlertTriangle aria-hidden="true" />
          <strong>Acciones trazables</strong>
          <p>Cada cambio se registra con usuario, fecha y estado anterior.</p>
        </div>
      </aside>

      <section className="management-content">
        <header className="management-header">
          <div>
            <p className="section-kicker">31 de agosto de 2026</p>
            <h2>
              {tab === 'queue'
                ? 'Reservas y entregas'
                : tab === 'inventory'
                  ? 'Inventario del nodo'
                  : 'Personas y permisos'}
            </h2>
          </div>
          {tab === 'inventory' && (
            <Button>
              <PackagePlus aria-hidden="true" /> Añadir objeto
            </Button>
          )}
        </header>
        <div className="management-kpis">
          <article>
            <span>Solicitudes pendientes</span>
            <strong>{pendingCount}</strong>
            <small>
              <Clock3 aria-hidden="true" /> Requieren revisión
            </small>
          </article>
          <article>
            <span>Préstamos activos</span>
            <strong>
              {queue.filter((entry) => entry.status === 'collected').length}
            </strong>
            <small>
              <PackageCheck aria-hidden="true" /> En circulación
            </small>
          </article>
          <article>
            <span>Uso del inventario</span>
            <strong>74%</strong>
            <small>
              <BarChart3 aria-hidden="true" /> +8% este mes
            </small>
          </article>
          <article>
            <span>Devoluciones a tiempo</span>
            <strong>96%</strong>
            <small>
              <Check aria-hidden="true" /> Últimos 90 días
            </small>
          </article>
        </div>

        {tab === 'queue' && (
          <div
            className={`management-table-wrap${isPending ? ' is-updating' : ''}`}
          >
            <div className="table-intro">
              <div>
                <h3>Cola de hoy</h3>
                <p>
                  Aprueba solo después de comprobar disponibilidad y estado.
                </p>
              </div>
              <select aria-label="Filtrar por estado">
                <option>Todos los estados</option>
                <option>Pendientes</option>
                <option>Aprobadas</option>
              </select>
            </div>
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Reserva</th>
                    <th>Miembro</th>
                    <th>Objeto</th>
                    <th>Fechas</th>
                    <th>Estado</th>
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((reservation) => (
                    <tr key={reservation.id}>
                      <td>
                        <strong>{reservation.code}</strong>
                      </td>
                      <td>
                        <span className="table-person">
                          {reservation.user?.name}
                          <small>{reservation.user?.email}</small>
                        </span>
                      </td>
                      <td>
                        <span className="table-item">
                          {reservation.item.name}
                          <small>{reservation.item.code}</small>
                        </span>
                      </td>
                      <td>
                        {formatDate.format(new Date(reservation.startDate))} —{' '}
                        {formatDate.format(new Date(reservation.endDate))}
                      </td>
                      <td>
                        <span
                          className={`status-badge status-${reservation.status}`}
                        >
                          {statusLabel[reservation.status]}
                        </span>
                      </td>
                      <td>
                        {reservation.status === 'requested' ? (
                          <div className="row-actions">
                            <button
                              className="approve-action"
                              type="button"
                              aria-label={`Aprobar ${reservation.code}`}
                              onClick={() =>
                                updateStatus(reservation.id, 'approved')
                              }
                            >
                              <Check aria-hidden="true" />
                            </button>
                            <button
                              className="reject-action"
                              type="button"
                              aria-label={`Rechazar ${reservation.code}`}
                              onClick={() =>
                                updateStatus(reservation.id, 'rejected')
                              }
                            >
                              <X aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="detail-action"
                            type="button"
                            aria-label={`Ver ${reservation.code}`}
                          >
                            <ArrowUpRight aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="inventory-board">
            <div className="table-intro">
              <div>
                <h3>{hubItems.length} objetos destacados</h3>
                <p>Actualiza el estado antes y después de cada entrega.</p>
              </div>
              <input
                type="search"
                placeholder="Buscar por código o nombre"
                aria-label="Buscar en inventario"
              />
            </div>
            <div className="inventory-grid">
              {hubItems.map((item) => (
                <article key={item.id}>
                  <div
                    className={`inventory-icon item-media--${item.category}`}
                  >
                    <PackageCheck aria-hidden="true" />
                  </div>
                  <div>
                    <span>{item.code}</span>
                    <h3>{item.name}</h3>
                    <p>{item.hub.name}</p>
                  </div>
                  <select
                    defaultValue={item.status}
                    aria-label={`Estado de ${item.name}`}
                  >
                    <option value="available">Disponible</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="retired">Retirado</option>
                  </select>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === 'users' && isAdmin && (
          <div className="management-table-wrap">
            <div className="table-intro">
              <div>
                <h3>Roles de la red</h3>
                <p>Solo un administrador puede elevar o reducir permisos.</p>
              </div>
            </div>
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>Distrito</th>
                    <th>Rol actual</th>
                    <th>Asignación</th>
                  </tr>
                </thead>
                <tbody>
                  {managedUsers.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <span className="table-person">
                          <strong>{entry.name}</strong>
                          <small>{entry.email}</small>
                        </span>
                      </td>
                      <td>{entry.district}</td>
                      <td>
                        <span className="role-pill">{entry.role}</span>
                      </td>
                      <td>
                        <label>
                          <span className="sr-only">
                            Cambiar rol de {entry.name}
                          </span>
                          <select
                            value={entry.role}
                            disabled={entry.id === user.id}
                            onChange={(event) =>
                              updateRole(
                                entry.id,
                                event.target.value as UserRole,
                              )
                            }
                          >
                            <option value="member">Miembro</option>
                            <option value="manager">Responsable</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
