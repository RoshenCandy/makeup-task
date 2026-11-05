import type { CatalogTile } from './catalog-tile';
import type { JsonValue } from './json-value';

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
