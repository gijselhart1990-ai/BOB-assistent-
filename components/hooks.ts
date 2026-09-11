'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haal } from '@/lib/client';

/** Haalt data op en houdt bij of het nog bezig is of misging. */
export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [bezig, setBezig] = useState(Boolean(url));
  const [fout, setFout] = useState<string | null>(null);
  const actief = useRef<AbortController | null>(null);

  const opnieuw = useCallback(async () => {
    actief.current?.abort();
    if (!url) { setData(null); setBezig(false); setFout(null); return; }
    const controller = new AbortController();
    actief.current = controller;
    setBezig(true); setFout(null);
    try {
      const resultaat = await haal<T>(url, { signal: controller.signal });
      if (!controller.signal.aborted) setData(resultaat);
    }
    catch (e) { if (!controller.signal.aborted) setFout((e as Error).message); }
    finally { if (!controller.signal.aborted) setBezig(false); }
  }, [url]);

  useEffect(() => {
    setData(null);
    void opnieuw();
    return () => actief.current?.abort();
  }, [opnieuw]);

  return { data, bezig, fout, opnieuw };
}
