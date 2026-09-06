'use client';

import { useCallback, useEffect, useState } from 'react';
import { haal } from '@/lib/client';

/** Haalt data op en houdt bij of het nog bezig is of misging. */
export function useApi<T = any>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [bezig, setBezig] = useState(Boolean(url));
  const [fout, setFout] = useState<string | null>(null);

  const opnieuw = useCallback(async () => {
    if (!url) return;
    setBezig(true); setFout(null);
    try { setData(await haal<T>(url)); }
    catch (e) { setFout((e as Error).message); }
    finally { setBezig(false); }
  }, [url]);

  useEffect(() => { opnieuw(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [url, ...deps]);

  return { data, bezig, fout, opnieuw };
}
