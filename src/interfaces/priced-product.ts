import type { ApiProduct } from './api-product';

/** Product tile that carries a numeric current price. */
export type PricedProduct = ApiProduct & {
  type: 'product';
  price: { current: number };
};
