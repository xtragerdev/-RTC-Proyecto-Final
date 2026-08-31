'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Check,
  CircleAlert,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useTransition,
} from 'react';

import { CategoryIcon } from '@/components/category-icon';
import { ItemCard } from '@/components/item-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFavorites } from '@/hooks/use-favorites';
import { getItems } from '@/lib/api';
import { categoryLabels, hubs } from '@/lib/demo-data';
import type { ItemCategory, ItemFilters } from '@/lib/types';

type Action =
  | { type: 'SEARCH'; value: string }
  | { type: 'CATEGORY'; value: ItemCategory | 'all' }
  | { type: 'HUB'; value: string }
  | { type: 'AVAILABLE'; value: boolean }
  | { type: 'RESET' };

const initialFilters: ItemFilters = {
  search: '',
  category: 'all',
  hub: 'all',
  availableOnly: true,
};

const categories = [
  'all',
  'tools',
  'kitchen',
  'outdoor',
  'mobility',
  'events',
  'technology',
] as const;

function reducer(state: ItemFilters, action: Action): ItemFilters {
  switch (action.type) {
    case 'SEARCH':
      return { ...state, search: action.value };
    case 'CATEGORY':
      return { ...state, category: action.value };
    case 'HUB':
      return { ...state, hub: action.value };
    case 'AVAILABLE':
      return { ...state, availableOnly: action.value };
    case 'RESET':
      return initialFilters;
  }
}

export function CatalogExplorer() {
  const params = useSearchParams();
  const [filters, dispatch] = useReducer(reducer, initialFilters);
  const [sort, setSort] = useState<'popular' | 'name' | 'deposit'>('popular');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const deferredSearch = useDeferredValue(filters.search);
  const [isPending, startTransition] = useTransition();
  const { favorites, toggleFavorite } = useFavorites();

  useEffect(() => {
    const query = params.get('q');
    const category = params.get('categoria');
    const hub = params.get('centro');
    if (query) dispatch({ type: 'SEARCH', value: query });
    if (categories.includes(category as (typeof categories)[number])) {
      dispatch({ type: 'CATEGORY', value: category as ItemCategory | 'all' });
    }
    if (hub) dispatch({ type: 'HUB', value: hub });
  }, [params]);

  const effectiveFilters = useMemo(
    () => ({ ...filters, search: deferredSearch }),
    [filters, deferredSearch],
  );

  const {
    data = [],
    error,
    isError,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['items', effectiveFilters],
    queryFn: () => getItems(effectiveFilters),
  });

  const sortedItems = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'es');
      if (sort === 'deposit') return a.deposit - b.deposit;
      return b.totalLoans - a.totalLoans;
    });
  }, [data, sort]);

  const activeCount =
    Number(Boolean(filters.search)) +
    Number(filters.category !== 'all') +
    Number(filters.hub !== 'all') +
    Number(!filters.availableOnly);

  return (
    <div
      className={`catalog-workspace${isPending || isFetching ? ' is-updating' : ''}`}
    >
      <div className="catalog-toolbar">
        <label className="catalog-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Buscar en el catálogo</span>
          <input
            type="search"
            placeholder="Taladro, proyector, tienda…"
            value={filters.search}
            onChange={(event) =>
              dispatch({ type: 'SEARCH', value: event.target.value })
            }
          />
        </label>
        <button
          className="filter-toggle"
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <Filter aria-hidden="true" /> Filtros{' '}
          {activeCount > 0 && <span>{activeCount}</span>}
        </button>
        <label className="sort-control">
          <span>Ordenar</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
          >
            <option value="popular">Más prestados</option>
            <option value="name">Nombre A–Z</option>
            <option value="deposit">Menor fianza</option>
          </select>
        </label>
      </div>

      <div className="catalog-layout">
        <aside
          className={`filter-panel${filtersOpen ? ' is-open' : ''}`}
          aria-label="Filtros del catálogo"
        >
          <div className="filter-panel-heading">
            <span>
              <SlidersHorizontal aria-hidden="true" /> Afinar búsqueda
            </span>
            <button type="button" onClick={() => dispatch({ type: 'RESET' })}>
              <RotateCcw aria-hidden="true" /> Limpiar
            </button>
          </div>
          <fieldset>
            <legend>Categoría</legend>
            <div className="filter-options">
              {categories.map((category) => (
                <button
                  className={
                    filters.category === category ? 'is-selected' : undefined
                  }
                  type="button"
                  key={category}
                  onClick={() =>
                    startTransition(() =>
                      dispatch({ type: 'CATEGORY', value: category }),
                    )
                  }
                >
                  {category === 'all' ? (
                    <span className="all-icon">∞</span>
                  ) : (
                    <CategoryIcon category={category} aria-hidden="true" />
                  )}
                  {categoryLabels[category]}
                  {filters.category === category && (
                    <Check aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Centro de recogida</legend>
            <select
              value={filters.hub}
              onChange={(event) =>
                dispatch({ type: 'HUB', value: event.target.value })
              }
            >
              <option value="all">Todos los centros</option>
              {hubs.map((hub) => (
                <option value={hub.slug} key={hub.id}>
                  {hub.name} · {hub.district}
                </option>
              ))}
            </select>
          </fieldset>
          <label className="availability-switch">
            <input
              type="checkbox"
              checked={filters.availableOnly}
              onChange={(event) =>
                dispatch({ type: 'AVAILABLE', value: event.target.checked })
              }
            />
            <span aria-hidden="true" />
            Solo disponibles
          </label>
          <Button
            type="button"
            className="mobile-apply"
            onClick={() => setFiltersOpen(false)}
          >
            Ver {sortedItems.length} resultados
          </Button>
        </aside>

        <section
          className="catalog-results"
          aria-live="polite"
          aria-busy={isLoading || isFetching}
        >
          <div className="results-heading">
            <div>
              <span>
                {isLoading ? 'Buscando…' : `${sortedItems.length} objetos`}
              </span>
              <small>Inventario comunitario revisado</small>
            </div>
            {filters.category !== 'all' && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'CATEGORY', value: 'all' })}
              >
                {categoryLabels[filters.category]} ×
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="catalog-grid">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton className="catalog-skeleton" key={index} />
              ))}
            </div>
          ) : isError ? (
            <div className="empty-state" role="alert">
              <CircleAlert aria-hidden="true" />
              <h2>No hemos podido abrir el catálogo</h2>
              <p>
                {error instanceof Error
                  ? error.message
                  : 'Revisa tu conexión e inténtalo de nuevo.'}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : sortedItems.length ? (
            <div className="catalog-grid">
              {sortedItems.map((item) => (
                <ItemCard
                  item={item}
                  key={item.id}
                  favorite={favorites.includes(item.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search aria-hidden="true" />
              <h2>No hay objetos con esos filtros</h2>
              <p>Prueba otra palabra o amplía la zona de recogida.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => dispatch({ type: 'RESET' })}
              >
                Restablecer filtros
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
