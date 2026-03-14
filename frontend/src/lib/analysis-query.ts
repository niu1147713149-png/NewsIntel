export interface QueryIntBound {
  min: number;
  max: number;
  fallback: number;
}

export type QueryBounds<T extends string> = Record<T, QueryIntBound>;

export function parseBoundedIntQuery(value: string | undefined, bound: QueryIntBound): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return bound.fallback;
  }
  return Math.max(bound.min, Math.min(bound.max, parsed));
}

export function resolveBoundedQuery<T extends string>(
  searchParams: Partial<Record<T, string | undefined>> | undefined,
  bounds: Readonly<QueryBounds<T>>
): Record<T, number> {
  const resolved = {} as Record<T, number>;
  for (const queryKey of Object.keys(bounds) as T[]) {
    resolved[queryKey] = parseBoundedIntQuery(searchParams?.[queryKey], bounds[queryKey]);
  }
  return resolved;
}

export function buildNumericQueryHref(pathname: string, query: Record<string, number>): string {
  const search = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)])
  ).toString();
  return `${pathname}?${search}`;
}
