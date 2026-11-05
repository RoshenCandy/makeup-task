/** Optional inclusive price window. A missing side means that bound is not applied. */
export type PriceRange = {
  from?: number;
  to?: number;
};
