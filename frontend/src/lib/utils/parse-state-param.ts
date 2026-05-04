type Params = Record<string, string | string[] | undefined>;

export function parseStateParam<T extends string>(
  params: Params | undefined,
  allowed: ReadonlyArray<T>,
  fallback: T,
): T {
  const raw = params?.state;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return allowed.includes(value as T) ? (value as T) : fallback;
}
