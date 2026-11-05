import type { ActionTile } from './action-tile';
import type { ApiProduct } from './api-product';
import type { QuoteSliderTile } from './quote-slider-tile';

/** One item of `products` in the category list. */
export type CatalogTile = ApiProduct | ActionTile | QuoteSliderTile;
