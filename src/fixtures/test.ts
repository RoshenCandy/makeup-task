import { test as base } from '@playwright/test';
import { seedDismissedOverlays } from '../helpers/overlays';
import { getPriceBounds } from '../api/productsApi';
import type { FilterLayout, PriceBounds } from '../interfaces/price-filter';
import type { ProductsListResponse } from '../interfaces/products';
import { CategoryPage, DEFAULT_CATEGORY_PATH } from '../pages/CategoryPage';

type Fixtures = {
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

export const test = base.extend<Fixtures>({
  context: async ({ context }, use) => {
    await seedDismissedOverlays(context);
    await use(context);
  },

  filterLayout: async ({}, use, testInfo) => {
    // Project name is the source of truth (more reliable than `isMobile` option).
    await use(testInfo.project.name === 'mobile' ? 'mobile' : 'desktop');
  },

  categoryPage: async ({ page }, use) => {
    await use(new CategoryPage(page));
  },

  openedCategoryPage: async ({ categoryPage, filterLayout }, use) => {
    await categoryPage.openReady(filterLayout, DEFAULT_CATEGORY_PATH);
    await use(categoryPage);
  },

  initialProducts: async ({ openedCategoryPage }, use) => {
    await use(await openedCategoryPage.getInitialProducts());
  },

  priceBounds: async ({ initialProducts }, use) => {
    await use(getPriceBounds(initialProducts.products));
  },
});

export { expect } from '@playwright/test';
