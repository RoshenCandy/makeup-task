import type { GlobalStoreState } from './global-store-state';

export type GlobalStore = {
  state?: GlobalStoreState;
  version?: number;
};
