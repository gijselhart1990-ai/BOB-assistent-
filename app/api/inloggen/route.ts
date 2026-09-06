import { cookies } from 'next/headers';
import { json, fout } from '@/lib/http';
import { env } from '@/lib/env';
import { staatOpLijst } from '@/lib/auth';
import { kanMailen, stuurInlogLink } from '@/lib/mail';
import { maakInlogToken, maakSessie, cookieNaam, cookieOpties } from '@/lib/session';
import { teVaak } from '@/lib/blobs';

export const dynamic = 'force-dynamic';

/**
 * Inloggen aanvragen.
 *
 * Twee wegen naar binnen, allebei zonder wachtwoord:
 *
 *  1. Een link in je mail. Tien minuten geldig, één keer te gebruiken.
 *  2. BOB_LOGIN_CODE — een lange geheime code in je omgevingsvariabelen.
 *     Bedoeld voor de eerste keer, als er nog geen mailer staat. Hij zit
 *     achter dezelfde toegangslijst en dezelfde snelheidsrem.
 *
 * Het antwoord vertelt nooit of een adres op de lijst staat. Anders is dit
 * endpoint een manier om die lijst uit te lezen.
 */

/** Acht aanvragen per uur per adres. Genoeg voor een mens, krap voor een script. */
const MAX_PER_UUR = 8;
const remSleutel = (email: string) => email.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const code = String(body?.code || '');
    const verder = String(body?.verder || '/');

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, error: 'Vul een geldig e-mailadres in.' }, { status: 400 });
    }

    if (await teVaak(remSleutel(email), MAX_PER_UUR, 3_600_000)) {
      return json(
        { ok: false, error: 'Te veel pogingen. Probeer het over een uur opnieuw.' },
        { status: 429 },
      );
    }

    const mag = staatOpLijst(email);

    // Weg 2: de noodcode. Alleen als hij is ingesteld én lang genoeg is.
    if (code) {
      if (mag && env.loginCode.length >= 20 && code === env.loginCode) {
        const jar = await cookies();
        jar.set(cookieNaam, maakSessie(email), cookieOpties);
        return json({ ok: true, ingelogd: true, verder });
      }
      return json({ ok: false, error: 'Die code klopt niet.' }, { status: 401 });
    }

    // Weg 1: de mail.
    //
    // Of er een mailer is, hangt niet af van wie het vraagt — dus die
    // controle staat bewust vóór de toegangslijst. Zou hij erna staan, dan
    // kreeg een adres van de lijst een foutmelding en een onbekend adres een
    // vrolijk "verstuurd", en had je met dit endpoint de lijst kunnen
    // uitlezen. Nu is het antwoord in beide gevallen hetzelfde.
    if (!kanMailen()) {
      return json(
        {
          ok: false,
          error: 'Er is nog geen mailer ingesteld. Vul RESEND_API_KEY in, of log in met BOB_LOGIN_CODE.',
          codeMogelijk: env.loginCode.length >= 20,
        },
        { status: 503 },
      );
    }

    if (mag) {
      const { token } = maakInlogToken(email);
      const link = `${env.site}/auth/callback?token=${encodeURIComponent(token)}&verder=${encodeURIComponent(verder)}`;
      await stuurInlogLink(email, link);
    }

    return json({ ok: true, verstuurd: true });
  } catch (err) { return fout(err); }
}
