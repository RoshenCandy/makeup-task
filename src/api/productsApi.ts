import { expect, type Page } from '@playwright/test';
import type { PriceBounds, PriceRange } from '../interfaces/price-filter';
import type {
  CatalogTile,
  JsonObject,
  JsonValue,
  PricedProduct,
  ProductsHttpResponse,
  ProductsListResponse,
  ProductsQuery,
  ProductsResponseWaitOptions,
} from '../interfaces/products';

/** Network wait for category products XHR — longer than UI actionTimeout. */
export const PRODUCTS_RESPONSE_TIMEOUT_MS = 45_000;

const CATEGORY_PRODUCTS_PATH = /^\/shop\/v1\/categories\/\d+\/products\/$/;
const PRICE_FROM_PARAM = 'priceFrom';
const PRICE_TO_PARAM = 'priceTo';

const FILTER_RANGE_FROM_RATIO = 0.25;
const FILTER_RANGE_TO_RATIO = 0.75;
const PRICE_FROM_ONLY_RATIO = 0.4;
const PRICE_TO_ONLY_RATIO = 0.6;

/**
 * True for the category products collection (`/shop/v1/categories/{id}/products/`).
 * Filter endpoints and other shop routes do not match.
 */
export function isProductsListUrl(url: string): boolean {
  return CATEGORY_PRODUCTS_PATH.test(new URL(url).pathname);
}

/**
 * Parse a products-list response and fail fast when the HTTP status or payload contract is wrong.
 * Accepts both the page response from `waitForResponse` and `page.request`.
 */
export async function parseProductsResponse(response: ProductsHttpResponse): Promise<ProductsListResponse> {
  const body = await response.text();
  const snippet = body.slice(0, 300);

  expect(response.status(), `products API ${response.url()} body: ${snippet}`).toBe(200);

  const data: JsonValue = JSON.parse(body);
  assertProductsList(data, `Unexpected products payload from ${response.url()}: ${snippet}`);
  return data;
}

/** Keep only product tiles that expose a numeric current price. */
export function getPricedProducts(products: readonly CatalogTile[]): PricedProduct[] {
  return products.filter((product): product is PricedProduct => {
    return product.type === 'product' && typeof product.price?.current === 'number';
  });
}

/** Min/max current price among priced product tiles. */
export function getPriceBounds(products: readonly CatalogTile[]): PriceBounds {
  const priced = getPricedProducts(products);
  expect(priced.length, 'at least one priced product in API response').toBeGreaterThan(0);

  return priced.reduce<PriceBounds>(
    (bounds, product) => ({
      min: Math.min(bounds.min, product.price.current),
      max: Math.max(bounds.max, product.price.current),
    }),
    { min: priced[0].price.current, max: priced[0].price.current },
  );
}

/** Mid sub-range derived from API prices — independent of specific SKUs. */
export function deriveFilterRange(bounds: PriceBounds): Required<PriceRange> {
  if (bounds.min === bounds.max) {
    return { from: bounds.min, to: bounds.max };
  }

  const from = priceAtRatio(bounds, FILTER_RANGE_FROM_RATIO, Math.ceil);
  const to = priceAtRatio(bounds, FILTER_RANGE_TO_RATIO, Math.floor);

  if (from >= to) {
    return { from: bounds.min, to: bounds.max };
  }

  return { from, to };
}

/** Lower threshold at 40% of the priced span (for priceFrom-only cases). */
export function derivePriceFrom(bounds: PriceBounds): number {
  return priceAtRatio(bounds, PRICE_FROM_ONLY_RATIO, Math.ceil);
}

/** Upper threshold at 60% of the priced span (for priceTo-only cases). */
export function derivePriceTo(bounds: PriceBounds): number {
  return priceAtRatio(bounds, PRICE_TO_ONLY_RATIO, Math.floor);
}

/** Catalog size reported by the products list. */
export function totalProducts(response: ProductsListResponse): number {
  expect(response.totalCount, 'products totalCount').toBeGreaterThanOrEqual(0);
  return response.totalCount;
}

/**
 * Assert every priced product falls within an optional from/to window.
 * Per-product checks are soft so one outlier does not hide the rest.
 */
export function assertProductsInPriceRange(products: readonly CatalogTile[], range: PriceRange): void {
  const priced = getPricedProducts(products);
  expect(priced.length, 'filtered response should contain priced products').toBeGreaterThan(0);

  if (range.from !== undefined && range.to !== undefined) {
    expect(range.from, 'price from should not exceed price to').toBeLessThanOrEqual(range.to);
  }

  for (const product of priced) {
    const price = product.price.current;
    if (range.from !== undefined) {
      expect.soft(price, `product #${product.id} price >= ${range.from}`).toBeGreaterThanOrEqual(range.from);
    }
    if (range.to !== undefined) {
      expect.soft(price, `product #${product.id} price <= ${range.to}`).toBeLessThanOrEqual(range.to);
    }
  }
}

/**
 * Wait for the next category products GET that passes an optional predicate.
 * HTTP status is asserted after the match, so a 4xx/5xx fails immediately instead of waiting out the timeout.
 */
export async function waitForProductsResponse(
  page: Page,
  options?: ProductsResponseWaitOptions,
): Promise<ProductsListResponse> {
  const response = await page.waitForResponse(
    (res) => {
      if (res.request().method() !== 'GET' || !isProductsListUrl(res.url())) {
        return false;
      }

      return options?.predicate?.(res) ?? true;
    },
    { timeout: PRODUCTS_RESPONSE_TIMEOUT_MS },
  );

  return parseProductsResponse(response);
}

/**
 * Fetch products using the page request context (same cookies/session as the UI).
 * `offset` defaults to 0 and can be overridden through `query`.
 */
export async function fetchProductsViaUiSession(
  page: Page,
  categoryId: number,
  query: ProductsQuery = {},
): Promise<ProductsListResponse> {
  expect(Number.isInteger(categoryId) && categoryId > 0, `category id ${categoryId}`).toBe(true);

  const params = new URLSearchParams({ offset: '0' });
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }

  const response = await page.request.get(`/shop/v1/categories/${categoryId}/products/?${params.toString()}`);
  return parseProductsResponse(response);
}

/**
 * True when price query params match the requested window.
 * A missing bound requires that param to be absent. Comparison is numeric, so `100` and `100.0` match.
 */
export function matchesPriceQuery(url: string, range: PriceRange): boolean {
  const params = new URL(url).searchParams;

  return (
    priceParamMatches(params, PRICE_FROM_PARAM, range.from) &&
    priceParamMatches(params, PRICE_TO_PARAM, range.to)
  );
}

/** True when the products request does not apply `priceFrom` or `priceTo`. */
export function isUnfilteredProductsUrl(url: string): boolean {
  return matchesPriceQuery(url, {});
}

function priceAtRatio(bounds: PriceBounds, ratio: number, round: (value: number) => number): number {
  return round(bounds.min + (bounds.max - bounds.min) * ratio);
}

function priceParamMatches(params: URLSearchParams, name: string, expected: number | undefined): boolean {
  const raw = params.get(name);
  if (expected === undefined) {
    return raw === null;
  }

  return raw !== null && Number(raw) === expected;
}

function assertProductsList(value: JsonValue, message: string): asserts value is ProductsListResponse {
  expect(isProductsListResponse(value), message).toBe(true);
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCatalogTile(value: JsonValue): boolean {
  if (!isJsonObject(value) || typeof value.id !== 'number' || typeof value.type !== 'string') {
    return false;
  }

  return value.type === 'product' || value.type === 'action' || value.type === 'quote-slider';
}

function isProductsListResponse(value: JsonValue): value is ProductsListResponse {
  if (!isJsonObject(value)) {
    return false;
  }

  if (value.type !== 'products-list' || !Array.isArray(value.products)) {
    return false;
  }

  if (!value.products.every(isCatalogTile)) {
    return false;
  }

  return (
    typeof value.perPage === 'number' &&
    typeof value.total === 'number' &&
    typeof value.offset === 'number' &&
    typeof value.totalCount === 'number' &&
    typeof value.availableCount === 'number' &&
    Array.isArray(value.filters) &&
    Array.isArray(value.sorts) &&
    Array.isArray(value.directions)
  );
}

