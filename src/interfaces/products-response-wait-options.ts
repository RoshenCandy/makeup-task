import type { Response } from '@playwright/test';

export type ProductsResponseWaitOptions = {
  predicate?: (response: Response) => boolean;
};
