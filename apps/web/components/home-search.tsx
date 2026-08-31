'use client';

import { ArrowRight, MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function HomeSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    router.push(`/explorar${params.size ? `?${params}` : ''}`);
  }

  return (
    <form className="finder" aria-label="Buscar objetos" onSubmit={submit}>
      <label className="search-field">
        <Search aria-hidden="true" />
        <span className="sr-only">¿Qué necesitas?</span>
        <input
          placeholder="¿Qué necesitas hoy?"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="location-field" aria-label="Ubicación seleccionada">
        <MapPin aria-hidden="true" />
        <span>
          <small>Cerca de</small>
          Madrid centro
        </span>
      </div>
      <Button size="lg" className="search-button" type="submit">
        Buscar <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  );
}
