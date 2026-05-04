export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export interface PageProps<S extends SearchParamsRecord = SearchParamsRecord> {
  searchParams: Promise<S>;
}
