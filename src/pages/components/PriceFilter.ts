import { expect, type Locator, type Page } from '@playwright/test';
import type { ClosedPriceRange } from '../../interfaces/closed-price-range';
import type { FilterLayout } from '../../interfaces/filter-layout';
import type { PriceBounds } from '../../interfaces/price-bounds';
import type { PricePreset } from '../../interfaces/price-preset';
import type { PriceRange } from '../../interfaces/price-range';

/**
 * Price filter fragment («Вартість») inside the category filters panel.
 * Root is the filters `<aside>`; all interactions chain from it.
 */
export class PriceFilter {
  readonly root: Locator;
  readonly fromInput: Locator;
  readonly toInput: Locator;
  readonly openFiltersButton: Locator;
  readonly applyButton: Locator;
  readonly clearTagsButton: Locator;
  readonly activePriceChip: Locator;

  private layout: FilterLayout = 'desktop';

  constructor(private readonly page: Page, root?: Locator) {
    // «Вартість» is exposed in the a11y tree when the panel is visible (desktop sidebar / open mobile sheet).
    this.root = root ?? page.locator('aside').filter({
      has: page.getByRole('button', { name: /^Вартість/i }),
    });

    // Price From/To are the only textboxes in the filters panel (DOM has no accessible names).
    this.fromInput = this.root.getByRole('textbox').nth(0);
    this.toInput = this.root.getByRole('textbox').nth(1);

    this.openFiltersButton = page.getByRole('button', { name: /фільтр/i }).first();
    this.applyButton = page.getByRole('button', { name: 'Застосувати' });
    this.clearTagsButton = page.getByRole('button', { name: /Зняти фільтри/i });
    // Cyrillic names — avoid `\b` (JS word boundary is ASCII-only).
    this.activePriceChip = page.getByRole('button', { name: /^(від|до|менше|більше)\s/i });
  }

  /**
   * Bring the price filter to a known ready state for the current layout.
   *
   * - mobile: open filters sheet (price block loads expanded); retry until React handlers attach
   * - desktop: sidebar already shows expanded «Вартість»
   */
  async prepare(layout: FilterLayout): Promise<void> {
    this.layout = layout;

    if (layout === 'mobile') {
      await expect(this.openFiltersButton).toBeVisible();
      await this.ensureOpen();
    }

    if (layout === 'desktop') {
      await expect(this.fromInput).toBeVisible();
    }

    await this.root.scrollIntoViewIfNeeded();
  }

  /** Open the mobile filters sheet when it is closed. */
  async ensureOpen(): Promise<void> {
    if (await this.fromInput.isVisible()) {
      return;
    }

    await expect(async () => {
      await this.openFiltersButton.tap();
      await expect(this.fromInput).toBeVisible({ timeout: 5_000 });
    }).toPass();
  }

  /** Desktop uses mouse click; mobile uses tap — fixed by layout, not by probing. */
  private async activate(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    const action = this.layout === 'mobile' ? locator.tap() : locator.click();
    await action;
  }

  private presetButton(label: string): Locator {
    return this.root.getByRole('button', { name: label });
  }

  async readPresetRanges(): Promise<PricePreset[]> {
    await this.root.scrollIntoViewIfNeeded();

    const labels = await this.root
      .getByRole('button')
      .filter({ hasText: /₴|менше|більше/i })
      .allTextContents();

    return labels.map(parsePresetLabel);
  }

  /** Prefer a closed preset range that overlaps the API-derived window. */
  async pickPresetForBounds(bounds: PriceBounds): Promise<PricePreset> {
    const mid = (bounds.min + bounds.max) / 2;
    const presets = (await this.readPresetRanges()).filter(isClosedPreset);
    const chosen = presets.sort((left, right) => distanceToMid(left, mid) - distanceToMid(right, mid))[0];

    if (!chosen) {
      throw new Error('No price presets found in the filters panel');
    }

    return chosen;
  }

  async clickPreset(label: string): Promise<void> {
    await this.root.scrollIntoViewIfNeeded();
    await this.ensureOpen();
    await this.activate(this.presetButton(label));

    if (this.layout === 'desktop') {
      return;
    }

    // Mobile presets select in-sheet state; «Застосувати» commits the filter.
    await this.activate(this.applyButton);
  }

  /**
   * Custom From/To: fill the visible inputs, then commit through hash routing.
   *
   * The site’s price filter is hash-driven (`#price_from=&price_to=`). On mobile,
   * each input change writes only one hash param, so «Застосувати» alone cannot
   * commit a two-sided range — the full hash is the reliable apply mechanism.
   */
  async setAndApply(range: PriceRange): Promise<void> {
    await this.root.scrollIntoViewIfNeeded();
    await this.ensureOpen();

    if (range.from !== undefined) {
      await this.fillPriceField(this.fromInput, range.from);
    }

    if (range.to !== undefined) {
      await this.fillPriceField(this.toInput, range.to);
    }

    await this.commitRangeHash(range);
  }

  /** Fill a price field and assert the committed value. */
  private async fillPriceField(input: Locator, value: number): Promise<void> {
    await input.scrollIntoViewIfNeeded();
    const text = String(value);
    await input.fill(text);
    await expect(input).toHaveValue(text);
  }

  /** Apply the range via the same hash router the storefront uses. */
  private async commitRangeHash(range: PriceRange): Promise<void> {
    const hash = priceHash(range);

    await this.page.evaluate((nextHash) => {
      window.location.hash = nextHash;
    }, hash);
  }

  /** The applied range is visible in the URL hash. A missing bound stays absent. */
  async expectRangeHash(range: PriceRange): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(priceHash(range)));

    if (range.from === undefined) {
      await expect(this.page).not.toHaveURL(/price_from=/);
    }

    if (range.to === undefined) {
      await expect(this.page).not.toHaveURL(/price_to=/);
    }
  }

  /**
   * Reset the active price filter via real UI:
   * - desktop: «Зняти фільтри»
   * - mobile: active price chip (no «Зняти фільтри» control)
   */
  async clear(): Promise<void> {
    const control = this.layout === 'desktop' ? this.clearTagsButton : this.activePriceChip;
    await expect(control).toBeVisible();
    await this.activate(control);
  }
}

function priceHash(range: PriceRange): string {
  return [
    range.from === undefined ? '' : `price_from=${range.from}`,
    range.to === undefined ? '' : `price_to=${range.to}`,
  ]
    .filter((part) => part !== '')
    .join('&');
}

function parsePresetLabel(label: string): PricePreset {
  const normalized = label.replace(/\s+/g, ' ').trim();
  const less = normalized.match(/менше\s+(\d+)/i);
  const more = normalized.match(/більше\s+(\d+)/i);
  const between = normalized.match(/(\d+)\s*₴?\s*[-–—]\s*(\d+)/i);

  if (less) {
    return { to: Number(less[1]), label: normalized };
  }

  if (more) {
    return { from: Number(more[1]), label: normalized };
  }

  if (between) {
    return { from: Number(between[1]), to: Number(between[2]), label: normalized };
  }

  return { label: normalized };
}

function isClosedPreset(preset: PricePreset): preset is PricePreset & ClosedPriceRange {
  return preset.from !== undefined && preset.to !== undefined;
}

function distanceToMid(preset: PricePreset & ClosedPriceRange, mid: number): number {
  return Math.abs((preset.from + preset.to) / 2 - mid);
}
