'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Hub } from '@/lib/types';

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

const PIN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

function toLatLng(hub: Hub): [number, number] {
  return [hub.coordinates[1], hub.coordinates[0]];
}

function buildIcon(L: typeof Leaflet, selected: boolean): Leaflet.DivIcon {
  return L.divIcon({
    className: 'hub-marker',
    html: `<span class="hub-pin${selected ? ' is-selected' : ''}">${PIN_SVG}</span>`,
    iconSize: selected ? [42, 42] : [34, 34],
    iconAnchor: selected ? [21, 21] : [17, 17],
    popupAnchor: [0, -20],
  });
}

function popupHtml(hub: Hub): string {
  return `<div class="hub-popup"><strong>${hub.name}</strong><span>${hub.district} · ${hub.neighborhood}</span></div>`;
}

type HubMapProps = {
  hubs: Hub[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function HubMap({ hubs, selectedId, onSelect }: HubMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tileRef = useRef<Leaflet.TileLayer | null>(null);
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    async function boot() {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [40.4168, -3.7038],
        zoom: 12,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      const dark = document.documentElement.classList.contains('dark');
      tileRef.current = L.tileLayer(dark ? TILE_DARK : TILE_LIGHT, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      observer = new MutationObserver(() => {
        const isDark = document.documentElement.classList.contains('dark');
        tileRef.current?.setUrl(isDark ? TILE_DARK : TILE_LIGHT);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      // El zoom con rueda solo se activa tras hacer clic en el mapa,
      // para no secuestrar el scroll de la página.
      map.on('click', () => map.scrollWheelZoom.enable());
      containerRef.current.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

      setReady(true);
    }

    void boot();

    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    hubs.forEach((hub) => {
      const marker = L.marker(toLatLng(hub), {
        icon: buildIcon(L, false),
        title: hub.name,
        riseOnHover: true,
      });
      marker.bindPopup(popupHtml(hub), { closeButton: false });
      marker.on('click', () => onSelectRef.current(hub.id));
      marker.addTo(map);
      markersRef.current.set(hub.id, marker);
    });

    if (hubs.length > 0) {
      map.fitBounds(L.latLngBounds(hubs.map(toLatLng)), { padding: [48, 48], maxZoom: 14 });
    }
  }, [hubs, ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    markersRef.current.forEach((marker, id) => {
      marker.setIcon(buildIcon(L, id === selectedId));
    });

    const hub = hubs.find((candidate) => candidate.id === selectedId);
    const marker = markersRef.current.get(selectedId);
    if (hub && marker) {
      map.flyTo(toLatLng(hub), Math.max(map.getZoom(), 14), { duration: 0.6 });
      marker.openPopup();
    }
  }, [selectedId, hubs, ready]);

  return <div ref={containerRef} className="hub-map" role="presentation" />;
}
