export type PageSearchParams = Record<string, string | string[] | undefined>;

export interface AuditPageProps {
  searchParams?: PageSearchParams;
}
