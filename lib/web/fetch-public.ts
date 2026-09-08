import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { Agent, fetch } from 'undici';

export function publiekAdres(adres: string): boolean {
  try {
    const ip = ipaddr.process(adres);
    return ip.range() === 'unicast';
  } catch { return false; }
}

export async function controleerDoel(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw Object.assign(new Error('Alleen openbare http(s)-adressen zonder inloggegevens zijn toegestaan.'), { status: 400 });
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const adressen = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  if (!adressen.length || adressen.some(ip => !publiekAdres(ip.address))) {
    throw Object.assign(new Error('Adressen op interne of gereserveerde netwerken worden niet opgehaald.'), { status: 400 });
  }
  return adressen[0];
}

/** Controleer iedere redirect en pin DNS aan de gecontroleerde adressen. */
export async function haalPubliekePagina(url: URL, maxBytes: number, signal: AbortSignal) {
  let doel = url;
  for (let hop = 0; hop <= 5; hop++) {
    const adres = await controleerDoel(doel);
    signal.throwIfAborted();
    const dispatcher = new Agent({ connect: {
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [adres]);
        else callback(null, adres.address, adres.family);
      },
    } });
    try {
      const res = await fetch(doel, {
        dispatcher, signal, redirect: 'manual',
        headers: { 'User-Agent': 'BOB/2.0', Accept: 'text/html,text/plain,application/xhtml+xml', 'Accept-Language': 'nl,en;q=0.8' },
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        await res.body?.cancel();
        const locatie = res.headers.get('location');
        if (!locatie || hop === 5) throw new Error('Te veel of ongeldige doorverwijzingen.');
        doel = new URL(locatie, doel);
        continue;
      }
      if (!res.ok) { await res.body?.cancel(); throw new Error(`Website antwoordde met ${res.status}.`); }
      const type = res.headers.get('content-type') || '';
      if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) {
        await res.body?.cancel();
        return { url: doel.href, type, html: null };
      }
      if (Number(res.headers.get('content-length')) > maxBytes) {
        await res.body?.cancel(); throw new Error('Pagina is te groot om te lezen.');
      }
      const chunks: Uint8Array[] = [];
      let grootte = 0;
      if (res.body) {
        for await (const chunk of res.body) {
          grootte += chunk.byteLength;
          if (grootte > maxBytes) throw new Error('Pagina is te groot om te lezen.');
          chunks.push(chunk);
        }
      }
      return { url: doel.href, type, html: Buffer.concat(chunks).toString('utf8') };
    } finally { await dispatcher.destroy(); }
  }
  throw new Error('Te veel doorverwijzingen.');
}
