import type { CategoryPage } from '../pages/CategoryPage';
import type { FilterLayout } from './filter-layout';
import type { PriceBounds } from './price-bounds';
import type { ProductsListResponse } from './products-list-response';

export type Fixtures = {
  filterLayout: FilterLayout;
  /** Fresh CategoryPage bound to the test page (not opened yet). */
  categoryPage: CategoryPage;
  /** Category opened with price filter prepared for the current project layout. */
  openedCategoryPage: CategoryPage;
  /** Baseline products for the default category (session API fetch). */
  initialProducts: ProductsListResponse;
  /** Min/max priced span from `initialProducts`. */
  priceBounds: PriceBounds;
};
