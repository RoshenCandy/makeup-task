import type { ProductPrice } from './product-price';

/** Product tile inside a category products list. */
export type ApiProduct = {
  id: number;
  type: 'product';
  title?: string;
  price?: ProductPrice;
};
