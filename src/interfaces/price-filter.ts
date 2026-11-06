/** Optional inclusive price window. A missing side means that bound is not applied. */
export type PriceRange = {
  from?: number;
  to?: number;
};

export type PriceBounds = {
  min: number;
  max: number;
};

export type PricePreset = PriceRange & {
  label: string;
};

export type FilterLayout = 'desktop' | 'mobile';
