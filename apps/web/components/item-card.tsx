'use client';

import { Clock3, Heart, MapPin } from 'lucide-react';
import Link from 'next/link';

import { CategoryIcon } from '@/components/category-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { categoryLabels } from '@/lib/demo-data';
import type { Item } from '@/lib/types';

interface ItemCardProps {
  item: Item;
  favorite?: boolean;
  onToggleFavorite?: (itemId: string) => void;
}

export function ItemCard({ item, favorite = false, onToggleFavorite }: ItemCardProps) {
  return (
    <Card className="item-card">
      <div className={`item-media item-media--${item.category}`}>
        <CategoryIcon category={item.category} aria-hidden="true" />
        <Badge className="availability-badge">
          {item.status === 'available' ? 'Disponible' : 'No disponible'}
        </Badge>
        {onToggleFavorite && (
          <button
            className={`favorite-button${favorite ? ' is-favorite' : ''}`}
            type="button"
            aria-label={favorite ? `Quitar ${item.name} de favoritos` : `Añadir ${item.name} a favoritos`}
            aria-pressed={favorite}
            onClick={() => onToggleFavorite(item.id)}
          >
            <Heart aria-hidden="true" />
          </button>
        )}
      </div>
      <CardHeader>
        <p className="item-category">{categoryLabels[item.category]}</p>
        <CardTitle>{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="item-meta">
        <span>
          <MapPin aria-hidden="true" /> {item.hub.name} · {item.hub.district}
        </span>
        <span>
          <Clock3 aria-hidden="true" /> Hasta {item.maxLoanDays} días
        </span>
      </CardContent>
      <CardFooter>
        <span>{item.deposit ? `Fianza ${item.deposit} €` : 'Sin fianza'}</span>
        <Button asChild variant="outline" size="sm">
          <Link href={`/objetos/${item.slug}`}>Ver objeto</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
