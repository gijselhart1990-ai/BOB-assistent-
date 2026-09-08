/** Ook backslashes en controltekens kunnen een URL naar een andere host sturen. */
export function internPad(waarde: unknown): string {
  if (typeof waarde !== 'string' || !waarde.startsWith('/') || waarde.startsWith('//') || /[\\\u0000-\u0020]/.test(waarde)) return '/';
  return waarde;
}

/** Valideer beslissingen strikt: de tekst "false" is geen toestemming. */
export function beslissing(body: unknown, veld: 'allow' | 'ok') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('Verwacht een JSON-object.'), { status: 400 });
  }
  const data = body as Record<string, unknown>;
  if (typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)
      || typeof data[veld] !== 'boolean') {
    throw Object.assign(new Error('Een geldige opdracht-id en een boolean zijn verplicht.'), { status: 400 });
  }
  return { id: data.id, toegestaan: data[veld] as boolean };
}
