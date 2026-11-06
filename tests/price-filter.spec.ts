import { test, expect } from '../src/fixtures/test';
import {
  assertProductsInPriceRange,
  deriveFilterRange,
  derivePriceFrom,
  derivePriceTo,
  totalProducts,
} from '../src/api/productsApi';

test.describe('Category price filter (Вартість)', () => {
  test('applies API-derived range via price filter and returns matching products', async ({
    openedCategoryPage: categoryPage,
    priceBounds,
  }) => {
    const range = deriveFilterRange(priceBounds);
    const filtered = await test.step(`Apply custom range ${range.from}–${range.to}`, () =>
      categoryPage.applyPriceFilterAndWait(range),
    );

    await test.step('Assert URL hash and API prices match the range', async () => {
      await categoryPage.priceFilter.expectRangeHash(range);
      assertProductsInPriceRange(filtered.products, range);
    });
  });

  test('applies a preset price range from the filter panel', async ({
    openedCategoryPage: categoryPage,
    priceBounds,
  }) => {
    const preset = await test.step('Pick a preset overlapping API price bounds', () =>
      categoryPage.priceFilter.pickPresetForBounds(priceBounds),
    );
    const filtered = await test.step(`Apply preset "${preset.label}"`, () => categoryPage.applyPresetAndWait(preset));

    await test.step('Assert URL hash and API prices match the preset range', async () => {
      await categoryPage.priceFilter.expectRangeHash(preset);
      assertProductsInPriceRange(filtered.products, preset);
    });
  });

  test('applies only priceFrom and keeps API products above the threshold', async ({
    openedCategoryPage: categoryPage,
    priceBounds,
  }) => {
    const from = derivePriceFrom(priceBounds);
    const filtered = await test.step(`Apply priceFrom=${from}`, () => categoryPage.applyPriceFilterAndWait({ from }));

    await test.step('Assert all API prices are >= from', async () => {
      await categoryPage.priceFilter.expectRangeHash({ from });
      assertProductsInPriceRange(filtered.products, { from });
    });
  });

  test('applies only priceTo and keeps API products below the threshold', async ({
    openedCategoryPage: categoryPage,
    priceBounds,
  }) => {
    const to = derivePriceTo(priceBounds);
    const filtered = await test.step(`Apply priceTo=${to}`, () => categoryPage.applyPriceFilterAndWait({ to }));

    await test.step('Assert all API prices are <= to', async () => {
      await categoryPage.priceFilter.expectRangeHash({ to });
      assertProductsInPriceRange(filtered.products, { to });
    });
  });

  test('clears price filter and loads a broader products response', async ({
    openedCategoryPage: categoryPage,
    priceBounds,
  }) => {
    const preset = await test.step('Pick a preset overlapping API price bounds', () =>
      categoryPage.priceFilter.pickPresetForBounds(priceBounds),
    );
    const filtered = await test.step(`Apply preset "${preset.label}"`, () => categoryPage.applyPresetAndWait(preset));

    await test.step('Assert the preset narrowed the products', () => {
      assertProductsInPriceRange(filtered.products, preset);
    });

    const cleared = await test.step('Clear filters and wait for unfiltered API response', () =>
      categoryPage.clearPriceFilterAndWait(),
    );

    await test.step('Assert the price hash is gone and the catalog is larger', async () => {
      await categoryPage.priceFilter.expectRangeHash({});
      expect(totalProducts(cleared)).toBeGreaterThan(totalProducts(filtered));
    });
  });
});
