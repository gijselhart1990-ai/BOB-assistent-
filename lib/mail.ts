import { env } from '@/lib/env';

/**
 * De inloglink versturen.
 *
 * Twee providers, want welke werkt hangt af van wat je al hebt. Staat er
 * geen van beide, dan zegt de inlogpagina dat eerlijk in plaats van te doen
 * alsof er een mail onderweg is.
 */

export const kanMailen = () => Boolean(env.mail.resend || env.mail.sendgrid);

export async function stuurInlogLink(naar: string, link: string) {
  const onderwerp = 'Je inloglink voor BOB';
  const tekst = [
    'Hallo Sander,',
    '',
    'Hier is je inloglink voor BOB. Hij is tien minuten geldig en werkt één keer.',
    '',
    link,
    '',
    'Heb je hier niet om gevraagd? Dan hoef je niets te doen — zonder deze link',
    'komt niemand binnen.',
  ].join('\n');

  const html = `
    <div style="font:15px/1.6 system-ui,sans-serif;color:#10241c;max-width:520px">
      <p>Hallo Sander,</p>
      <p>Hier is je inloglink voor BOB. Hij is <strong>tien minuten geldig</strong> en werkt één keer.</p>
      <p style="margin:26px 0">
        <a href="${link}" style="background:#14724f;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;display:inline-block;font-weight:600">
          Inloggen bij BOB
        </a>
      </p>
      <p style="font-size:13px;color:#7d8b85">
        Heb je hier niet om gevraagd? Dan hoef je niets te doen — zonder deze link komt niemand binnen.
      </p>
    </div>`;

  /**
   * Allebei proberen, niet alleen de eerste.
   *
   * Eerder stopte dit bij de eerste ingevulde sleutel: stond er een Resend-
   * sleutel die niet meer werkte, dan kwam er nooit een mail, ook al stond
   * er een werkende SendGrid-sleutel naast. Precies het soort fout dat je
   * pas merkt als je wilt inloggen en er niets aankomt.
   */
  const pogingen: { naam: string; doe: () => Promise<Response> }[] = [];

  if (env.mail.resend) {
    pogingen.push({
      naam: 'Resend',
      doe: () => fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.mail.resend}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.mail.van, to: [naar], subject: onderwerp, text: tekst, html }),
      }),
    });
  }

  if (env.mail.sendgrid) {
    pogingen.push({
      naam: 'SendGrid',
      doe: () => fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.mail.sendgrid}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: naar }] }],
          from: { email: env.mail.van.replace(/.*<|>.*/g, '') || env.mail.van },
          subject: onderwerp,
          content: [{ type: 'text/plain', value: tekst }, { type: 'text/html', value: html }],
        }),
      }),
    });
  }

  if (!pogingen.length) {
    throw Object.assign(new Error('Geen mailer ingesteld (RESEND_API_KEY of SENDGRID_API_KEY)'), { status: 503 });
  }

  const problemen: string[] = [];
  for (const p of pogingen) {
    try {
      const res = await p.doe();
      if (res.ok) return;
      problemen.push(`${p.naam} ${res.status}: ${(await res.text()).slice(0, 160)}`);
    } catch (err) {
      problemen.push(`${p.naam}: ${(err as Error).message}`);
    }
  }

  // Alle providers gefaald: geef ze allebei terug, want anders ga je de
  // verkeerde zitten repareren.
  throw Object.assign(new Error(`Versturen mislukt. ${problemen.join(' | ')}`), { status: 502 });
}
