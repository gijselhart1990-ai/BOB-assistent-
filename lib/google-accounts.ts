import { cookies } from 'next/headers';
import { env } from './env';
import { googleAccountStore } from './google-account-store';

export const accountCookie = 'bob-google-account';
export const meerdereGoogleAccounts = () => env.google.storage === 'postgres';

export async function gekozenGoogleAccount(owner: string) {
  const accounts = await googleAccountStore(owner).list();
  const selected = (await cookies()).get(accountCookie)?.value;
  // Een onbekende of verwijderde cookie mag niet stil een ander account openen.
  return selected ? accounts.find(a => a.subject === selected) ?? null : accounts.find(a => a.selected) ?? null;
}
