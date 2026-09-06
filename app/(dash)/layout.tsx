import { redirect } from 'next/navigation';
import { huidigeGebruiker } from '@/lib/auth';
import { Shell } from '@/components/Shell';

/**
 * De tweede grendel. De middleware kijkt of je een sessie hebt; hier kijken
 * we of je ook op de toegangslijst staat. Zo niet: terug naar de inlogpagina,
 * hoe geldig je sessie ook is.
 */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const gebruiker = await huidigeGebruiker();
  if (!gebruiker) redirect('/login?reden=geen-toegang');
  return <Shell email={gebruiker.email}>{children}</Shell>;
}
