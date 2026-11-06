import type { Response } from '@playwright/test';

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

export type ProductPrice = {
  currency: string;
  current: number;
  old?: number;
  side?: string;
  symbol?: string;
};

/** Product tile inside a category products list. */
export type ApiProduct = {
  id: number;
  type: 'product';
  title?: string;
  price?: ProductPrice;
};

/** Promo banner mixed into the category products list. */
export type ActionTile = {
  id: number;
  type: 'action';
  title: string;
  link?: string;
};

/** Quote carousel mixed into the category products list. */
export type QuoteSliderTile = {
  id: number;
  type: 'quote-slider';
  count: number;
  products: JsonValue[];
};

/** One item of `products` in the category list. */
export type CatalogTile = ApiProduct | ActionTile | QuoteSliderTile;

/** Product tile that carries a numeric current price. */
export type PricedProduct = ApiProduct & {
  price: { current: number };
};

/**
 * `GET /shop/v1/categories/{id}/products/`.
 * `filters`, `sorts` and `directions` are present and were empty for this category.
 */
export type ProductsListResponse = {
  type: 'products-list';
  products: CatalogTile[];
  filters: JsonValue[];
  sorts: JsonValue[];
  directions: JsonValue[];
  perPage: number;
  total: number;
  offset: number;
  totalCount: number;
  availableCount: number;
};

/** Shared shape of a browser `Response` and an APIRequestContext `APIResponse`. */
export type ProductsHttpResponse = {
  status(): number;
  url(): string;
  text(): Promise<string>;
};

export type ProductsQuery = Record<string, string | number>;

export type ProductsResponseWaitOptions = {
  predicate?: (response: Response) => boolean;
};
