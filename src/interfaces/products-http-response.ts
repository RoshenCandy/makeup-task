/** Shared shape of a browser `Response` and an APIRequestContext `APIResponse`. */
export type ProductsHttpResponse = {
  status(): number;
  url(): string;
  text(): Promise<string>;
};
