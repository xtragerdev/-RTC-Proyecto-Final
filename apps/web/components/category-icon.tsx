import {
  Bike,
  CookingPot,
  Drill,
  Laptop,
  PartyPopper,
  TentTree,
  type LucideProps,
} from 'lucide-react';

import type { ItemCategory } from '@/lib/types';

const icons = {
  tools: Drill,
  kitchen: CookingPot,
  outdoor: TentTree,
  mobility: Bike,
  events: PartyPopper,
  technology: Laptop,
};

export function CategoryIcon({ category, ...props }: { category: ItemCategory } & LucideProps) {
  const Icon = icons[category];
  return <Icon {...props} />;
}
