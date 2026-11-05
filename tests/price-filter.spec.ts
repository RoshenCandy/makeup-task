import { test, expect } from '../src/fixtures/test';
import {
  assertProductsInPriceRange,
  deriveFilterRange,
  derivePriceFrom,
  derivePriceTo,
  getPriceBounds,
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

    await test.step('Assert API products fall within the preset range', () => {
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
    const cleared = await test.step('Clear filters and wait for unfiltered API response', () =>
      categoryPage.clearPriceFilterAndWait(),
    );

    await test.step('Assert cleared response is broader than filtered', () => {
      const filteredBounds = getPriceBounds(filtered.products);
      const clearedBounds = getPriceBounds(cleared.products);

      expect(totalProducts(cleared)).toBeGreaterThanOrEqual(totalProducts(filtered));
      expect(clearedBounds.max - clearedBounds.min).toBeGreaterThanOrEqual(filteredBounds.max - filteredBounds.min);
    });
  });
});
