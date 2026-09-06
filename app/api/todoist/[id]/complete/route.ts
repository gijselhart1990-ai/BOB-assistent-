import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { todoist } from '@/lib/connectors/todoist';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await eisGebruiker();
    const { id } = await ctx.params;
    return json(await todoist.afvinken(id));
  } catch (err) { return fout(err); }
}
