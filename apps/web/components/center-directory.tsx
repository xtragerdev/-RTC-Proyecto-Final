'use client';

import { ArrowRight, Clock3, Mail, MapPin, Navigation, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { HubMap } from '@/components/hub-map';
import { hubs, items } from '@/lib/demo-data';

export function CenterDirectory() {
  const [selectedId, setSelectedId] = useState(hubs[0].id);
  const [district, setDistrict] = useState('all');
  const districts = useMemo(() => [...new Set(hubs.map((hub) => hub.district))], []);
  const visibleHubs = district === 'all' ? hubs : hubs.filter((hub) => hub.district === district);
  const selected = hubs.find((hub) => hub.id === selectedId) ?? visibleHubs[0] ?? hubs[0];

  return (
    <div className="centers-workspace">
      <div className="center-controls">
        <label>
          <span>Distrito</span>
          <select
            value={district}
            onChange={(event) => {
              const value = event.target.value;
              setDistrict(value);
              const next = value === 'all' ? hubs[0] : hubs.find((hub) => hub.district === value);
              if (next) setSelectedId(next.id);
            }}
          >
            <option value="all">Todos los distritos</option>
            {districts.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <span><MapPin aria-hidden="true" /> {visibleHubs.length} centros en esta vista</span>
      </div>

      <div className="centers-layout">
        <div className="center-list">
          {visibleHubs.map((hub) => {
            const itemCount = items.filter((item) => item.hub.id === hub.id).length * 15;
            return (
              <button
                className={`center-card${selected.id === hub.id ? ' is-selected' : ''}`}
                type="button"
                onClick={() => setSelectedId(hub.id)}
                key={hub.id}
              >
                <span className="center-code">{hub.code}</span>
                <h2>{hub.name}</h2>
                <p><MapPin aria-hidden="true" /> {hub.address} · {hub.neighborhood}</p>
                <p><Clock3 aria-hidden="true" /> {hub.openingHours}</p>
                <div>
                  <span><PackageOpen aria-hidden="true" /> {itemCount} objetos</span>
                  <ArrowRight aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>

        <aside className="community-map" aria-label={`Mapa de ${selected.name}`}>
          <HubMap hubs={visibleHubs} selectedId={selected.id} onSelect={setSelectedId} />
          <div className="map-detail">
            <span>{selected.district} · {selected.neighborhood}</span>
            <h2>{selected.name}</h2>
            <p>{selected.address}</p>
            <p><Clock3 aria-hidden="true" /> {selected.openingHours}</p>
            <div className="map-actions">
              <Button asChild>
                <Link href={`/explorar?centro=${selected.slug}`}>Ver inventario</Link>
              </Button>
              <Button asChild variant="outline">
                <a href={`mailto:${selected.contactEmail}`}><Mail aria-hidden="true" /> Escribir</a>
              </Button>
            </div>
            <small><Navigation aria-hidden="true" /> Coordenadas: {selected.coordinates[1].toFixed(4)}, {selected.coordinates[0].toFixed(4)}</small>
          </div>
        </aside>
      </div>
    </div>
  );
}
