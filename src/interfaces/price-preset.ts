import type { PriceRange } from './price-range';

export type PricePreset = PriceRange & {
  label: string;
};
