/** Reward tooltip flag seeded before the category page loads. */
export type GlobalStoreState = {
  rewardModalWasShown?: boolean;
};

export type GlobalStore = {
  state?: GlobalStoreState;
  version?: number;
};
