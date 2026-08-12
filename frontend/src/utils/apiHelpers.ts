export function unwrapData<T>(res: unknown): T {
  if (!res || typeof res !== 'object') return res as T
  const obj = res as Record<string, unknown>
  return (obj.data ?? obj.Data ?? res) as T
}

export function unwrapPagedItems<T>(res: unknown): T[] {
  const data = unwrapData<{ items?: T[]; Items?: T[] } | T[]>(res)
  if (Array.isArray(data)) return data
  return data?.items ?? data?.Items ?? []
}
