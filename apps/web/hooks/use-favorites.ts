'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'renodo.favorites.v1';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
      if (Array.isArray(stored)) {
        const safeFavorites = [...new Set(stored.filter((id) => typeof id === 'string'))];
        queueMicrotask(() => setFavorites(safeFavorites));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((current) => {
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}
