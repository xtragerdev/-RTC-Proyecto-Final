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
import {
  useEffect,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  getItemsByHub,
  getManagedHubs,
  getManagedReservations,
  getUsers,
  updateItemStatusRequest,
  updateReservationStatusRequest,
  updateUserRoleRequest,
} from '@/lib/api';
import { demoReservations, demoUsers, items } from '@/lib/demo-data';
import type { Hub, Item, Reservation, User, UserRole } from '@/lib/types';

function setReservationStatus(
  state: Reservation[],
  id: string,
  status: Reservation['status'],
) {
  return state.map((reservation) =>
    reservation.id === id ? { ...reservation, status } : reservation,
  );
}

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
const todayLabel = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

export function ManagementDashboard() {
  const { user, ready, demoMode, token } = useAuth();
  const [tab, setTab] = useState<'queue' | 'inventory' | 'users'>('queue');
  const [queue, setQueue] = useState<Reservation[]>(queueSeed);
  const [managedUsers, setManagedUsers] = useState<User[]>(userSeed);
  const [managedHubs, setManagedHubs] = useState<Hub[]>([]);
  const [hubItems, setHubItems] = useState<Item[]>(items.slice(0, 8));
  const [loadingData, setLoadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPending, startTransition] = useTransition();
  const canManage = user?.role === 'manager' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const pendingCount = queue.filter(
    (reservation) => reservation.status === 'requested',
  ).length;
  const filteredQueue =
    statusFilter === 'all'
      ? queue
      : queue.filter((reservation) => reservation.status === statusFilter);

  useEffect(() => {
    if (demoMode || !token || !user || !canManage) return;
    let cancelled = false;
    setLoadingData(true);

    const load = async () => {
      try {
        const [reservationData, hubData] = await Promise.all([
          getManagedReservations(token),
          getManagedHubs(token),
        ]);
        if (cancelled) return;
        setQueue(reservationData);

        const ownHubs =
          user.role === 'admin'
            ? hubData
            : hubData.filter((hub) =>
                (hub.managers ?? []).some(
                  (manager) =>
                    (typeof manager === 'string' ? manager : manager.id) ===
                    user.id,
                ),
              );
        setManagedHubs(ownHubs);

        const itemLists = await Promise.all(
          ownHubs.slice(0, 4).map((hub) => getItemsByHub(hub.slug)),
        );
        if (cancelled) return;
        setHubItems(itemLists.flat());

        if (user.role === 'admin') {
          const userData = await getUsers(token);
          if (!cancelled) setManagedUsers(userData);
        }
      } catch (error) {
        if (!cancelled)
          toast.error(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los datos de gestión.',
          );
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [demoMode, token, user, canManage]);

  const activeLoans = queue.filter(
    (entry) => entry.status === 'collected',
  ).length;
  const inventoryUsage =
    hubItems.length > 0
      ? Math.round(
          (hubItems.filter((item) => item.status !== 'available').length /
            hubItems.length) *
            100,
        )
      : 0;
  const closedLoans = queue.filter((entry) =>
    ['returned', 'overdue'].includes(entry.status),
  );
  const onTimeRate = closedLoans.length
    ? Math.round(
        (closedLoans.filter((entry) => entry.status === 'returned').length /
          closedLoans.length) *
          100,
      )
    : 100;

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
    const successMessage =
      status === 'approved'
        ? 'Reserva aprobada.'
        : status === 'rejected'
          ? 'Solicitud rechazada.'
          : 'Estado actualizado.';
    if (demoMode || !token) {
      startTransition(() =>
        setQueue((current) => setReservationStatus(current, id, status)),
      );
      toast.success(successMessage);
      return;
    }
    const previous = queue;
    startTransition(() =>
      setQueue((current) => setReservationStatus(current, id, status)),
    );
    updateReservationStatusRequest(token, id, status)
      .then(() => toast.success(successMessage))
      .catch((error) => {
        setQueue(previous);
        toast.error(
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la reserva.',
        );
      });
  }

  function updateRole(userId: string, role: UserRole) {
    if (!isAdmin) return;
    const previous = managedUsers;
    setManagedUsers((current) =>
      current.map((entry) =>
        entry.id === userId ? { ...entry, role } : entry,
      ),
    );
    if (demoMode || !token) {
      toast.success('Rol actualizado con permisos de administración.');
      return;
    }
    updateUserRoleRequest(token, userId, role)
      .then(() =>
        toast.success('Rol actualizado con permisos de administración.'),
      )
      .catch((error) => {
        setManagedUsers(previous);
        toast.error(
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el rol.',
        );
      });
  }

  function updateItemStatus(id: string, status: Item['status']) {
    const previous = hubItems;
    setHubItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    if (demoMode || !token) {
      toast.success('Estado del objeto actualizado.');
      return;
    }
    updateItemStatusRequest(token, id, status)
      .then(() => toast.success('Estado del objeto actualizado.'))
      .catch((error) => {
        setHubItems(previous);
        toast.error(
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el objeto.',
        );
      });
  }

  return (
    <main id="contenido" className="management-page">
      <aside className="management-sidebar">
        <div>
          <p className="eyebrow">Panel de operaciones</p>
          <h1>
            {isAdmin
              ? 'Red ReNodo'
              : managedHubs.length > 0
                ? managedHubs.map((hub) => hub.name).join(' · ')
                : 'Mi nodo'}
          </h1>
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
            <p className="section-kicker">{todayLabel}</p>
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
            <strong>{activeLoans}</strong>
            <small>
              <PackageCheck aria-hidden="true" /> En circulación
            </small>
          </article>
          <article>
            <span>Uso del inventario</span>
            <strong>{inventoryUsage}%</strong>
            <small>
              <BarChart3 aria-hidden="true" /> Objetos en préstamo o retirados
            </small>
          </article>
          <article>
            <span>Devoluciones a tiempo</span>
            <strong>{onTimeRate}%</strong>
            <small>
              <Check aria-hidden="true" /> Sobre préstamos cerrados
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
              <select
                aria-label="Filtrar por estado"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="requested">Pendientes</option>
                <option value="approved">Aprobadas</option>
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
                  {loadingData ? (
                    <tr>
                      <td colSpan={6}>Cargando reservas…</td>
                    </tr>
                  ) : filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No hay reservas con este estado.</td>
                    </tr>
                  ) : (
                    filteredQueue.map((reservation) => (
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
                          <small>{reservation.hub.name}</small>
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
                        ) : reservation.status === 'approved' ? (
                          <button
                            className="detail-action"
                            type="button"
                            aria-label={`Registrar entrega de ${reservation.code}`}
                            title="Registrar entrega"
                            onClick={() =>
                              updateStatus(reservation.id, 'collected')
                            }
                          >
                            <PackageCheck aria-hidden="true" />
                          </button>
                        ) : reservation.status === 'collected' ? (
                          <button
                            className="detail-action"
                            type="button"
                            aria-label={`Registrar devolución de ${reservation.code}`}
                            title="Registrar devolución"
                            onClick={() =>
                              updateStatus(reservation.id, 'returned')
                            }
                          >
                            <ArrowUpRight aria-hidden="true" />
                          </button>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="inventory-board">
            <div className="table-intro">
              <div>
                <h3>{hubItems.length} objetos en tus nodos</h3>
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
                    value={item.status}
                    aria-label={`Estado de ${item.name}`}
                    onChange={(event) =>
                      updateItemStatus(
                        item.id,
                        event.target.value as Item['status'],
                      )
                    }
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
