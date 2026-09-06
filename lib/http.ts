import { NextResponse } from 'next/server';

/**
 * Eén plek waar fouten in een antwoord worden omgezet. Zonder dit krijg je
 * een kale 500 en moet je in de logs graven om te zien wat er misging.
 */
export function fout(err: unknown) {
  const e = err as { message?: string; status?: number };
  const status = typeof e?.status === 'number' ? e.status : 500;
  return NextResponse.json({ ok: false, error: e?.message || 'Onbekende fout' }, { status });
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers || {}) },
  });
}

/** Eén kapotte connector mag nooit het hele dashboard meenemen. */
export async function veilig<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; }
  catch (err) { return { ...(fallback as object), ok: false, error: (err as Error).message } as T; }
}
