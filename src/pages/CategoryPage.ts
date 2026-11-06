import type { Page } from '@playwright/test';
import {
  fetchProductsViaUiSession,
  isUnfilteredProductsUrl,
  matchesPriceQuery,
  waitForProductsResponse,
} from '../api/productsApi';
import type { FilterLayout, PricePreset, PriceRange } from '../interfaces/price-filter';
import type { ProductsListResponse } from '../interfaces/products';
import { PriceFilter } from './components/PriceFilter';

export const DEFAULT_CATEGORY_ID = 23440;
export const DEFAULT_CATEGORY_PATH = `/ua/categorys/${DEFAULT_CATEGORY_ID}/`;

export class CategoryPage {
  readonly priceFilter: PriceFilter;

  constructor(private readonly page: Page) {
    this.priceFilter = new PriceFilter(page);
  }

  async open(path: string = DEFAULT_CATEGORY_PATH): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  /** Open category and put the price filter into a known ready state for the layout. */
  async openReady(layout: FilterLayout, path: string = DEFAULT_CATEGORY_PATH): Promise<void> {
    await this.open(path);
    await this.priceFilter.prepare(layout);
  }

  /**
   * Baseline product list for the category via the same browser session cookies.
   * Avoids racing an optional in-page XHR on cold load.
   */
  async getInitialProducts(categoryId: number = DEFAULT_CATEGORY_ID): Promise<ProductsListResponse> {
    return fetchProductsViaUiSession(this.page, categoryId);
  }

  async applyPriceFilterAndWait(range: PriceRange): Promise<ProductsListResponse> {
    return this.performAndWait((url) => matchesPriceQuery(url, range), () => this.priceFilter.setAndApply(range));
  }

  async applyPresetAndWait(preset: PricePreset): Promise<ProductsListResponse> {
    return this.performAndWait(
      (url) => matchesPriceQuery(url, preset),
      () => this.priceFilter.clickPreset(preset.label),
    );
  }

  async clearPriceFilterAndWait(): Promise<ProductsListResponse> {
    return this.performAndWait(isUnfilteredProductsUrl, () => this.priceFilter.clear());
  }

  /**
   * Register the products waiter before the UI action so the response cannot be missed.
   */
  private async performAndWait(
    matchesUrl: (url: string) => boolean,
    perform: () => Promise<void>,
  ): Promise<ProductsListResponse> {
    const pending = waitForProductsResponse(this.page, {
      predicate: (response) => matchesUrl(response.url()),
    });

    await perform();
    return pending;
  }
}
