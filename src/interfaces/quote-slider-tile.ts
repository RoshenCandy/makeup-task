import type { JsonValue } from './json-value';

/** Quote carousel mixed into the category products list. */
export type QuoteSliderTile = {
  id: number;
  type: 'quote-slider';
  count: number;
  products: JsonValue[];
};
