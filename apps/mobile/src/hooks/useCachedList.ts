import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { readCache, saveCache } from '@/lib/cache';

// Consulta con respaldo en disco: si la red falla, devuelve la última copia
// guardada. Sin esto, sin señal la app no muestra nada y la captura no tiene
// cuentas ni categorías para construirse.
export const useCachedQuery = <T>(
  cacheKey: string,
  queryKey: readonly unknown[],
  fn: () => Promise<T>,
  options?: { enabled?: boolean },
) => {
  const query = useQuery({ queryKey, queryFn: fn, enabled: options?.enabled ?? true });
  const [cached, setCached] = useState<T | null>(null);

  useEffect(() => {
    if (query.data !== undefined) {
      setCached(query.data);
      void saveCache(cacheKey, query.data);
    }
  }, [query.data, cacheKey]);

  useEffect(() => {
    if (query.isError && query.data === undefined) {
      void readCache<T>(cacheKey).then((value) => {
        if (value !== null) setCached(value);
      });
    }
  }, [query.isError, query.data, cacheKey]);

  return {
    ...query,
    value: query.data ?? cached,
    /** true cuando lo que se muestra viene del disco y no de la red. */
    fromCache: query.data === undefined && cached !== null,
  };
};

/** Igual que useCachedQuery pero garantiza un array. */
export const useCachedList = <T>(cacheKey: string, queryKey: readonly unknown[], fn: () => Promise<T[]>) => {
  const query = useCachedQuery<T[]>(cacheKey, queryKey, fn);
  return { ...query, items: query.value ?? ([] as T[]) };
};
