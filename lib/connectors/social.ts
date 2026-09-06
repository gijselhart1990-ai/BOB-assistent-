import { env } from '@/lib/env';
import { cached } from '@/lib/cache';

/**
 * Social-tellers.
 *
 * Zonder token per platform staat er een streepje. Bewust: een dashboard dat
 * verzonnen cijfers toont is erger dan een leeg vakje, want je gaat erop
 * vertrouwen.
 */
type Item = { id: string; label: string; ok: boolean; value?: number; unit?: string; reason?: string };

async function linkedin(): Promise<Item> {
  const basis = { id: 'linkedin', label: 'LinkedIn' };
  if (!env.social.linkedin) return { ...basis, ok: false, reason: 'geen token' };
  try {
    const res = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${env.social.linkedin}` },
    });
    if (!res.ok) return { ...basis, ok: false, reason: `LinkedIn ${res.status}` };
    // LinkedIn geeft geen notificatieteller vrij op een persoonlijk token.
    // Dat is geen fout van ons; we melden het gewoon.
    return { ...basis, ok: false, reason: 'geen tellers beschikbaar' };
  } catch (e) {
    return { ...basis, ok: false, reason: (e as Error).message };
  }
}

async function instagram(): Promise<Item> {
  const basis = { id: 'instagram', label: 'Instagram' };
  if (!env.social.instagram) return { ...basis, ok: false, reason: 'geen token' };
  try {
    const res = await fetch(`https://graph.instagram.com/me?fields=id,username,media_count&access_token=${env.social.instagram}`);
    if (!res.ok) return { ...basis, ok: false, reason: `Instagram ${res.status}` };
    const d = await res.json();
    return { ...basis, ok: true, value: d.media_count ?? 0, unit: 'berichten' };
  } catch (e) {
    return { ...basis, ok: false, reason: (e as Error).message };
  }
}

async function facebook(): Promise<Item> {
  const basis = { id: 'facebook', label: 'Facebook' };
  if (!env.social.facebook) return { ...basis, ok: false, reason: 'geen token' };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${env.social.facebook}`);
    if (!res.ok) return { ...basis, ok: false, reason: `Facebook ${res.status}` };
    return { ...basis, ok: false, reason: 'geen tellers beschikbaar' };
  } catch (e) {
    return { ...basis, ok: false, reason: (e as Error).message };
  }
}

async function tiktok(): Promise<Item> {
  const basis = { id: 'tiktok', label: 'TikTok' };
  if (!env.social.tiktok) return { ...basis, ok: false, reason: 'geen token' };
  try {
    const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count', {
      headers: { Authorization: `Bearer ${env.social.tiktok}` },
    });
    if (!res.ok) return { ...basis, ok: false, reason: `TikTok ${res.status}` };
    const d = await res.json();
    const n = d?.data?.user?.follower_count;
    return typeof n === 'number'
      ? { ...basis, ok: true, value: n, unit: 'volgers' }
      : { ...basis, ok: false, reason: 'geen tellers beschikbaar' };
  } catch (e) {
    return { ...basis, ok: false, reason: (e as Error).message };
  }
}

export const social = {
  ingesteld: () => Boolean(env.social.linkedin || env.social.instagram || env.social.facebook || env.social.tiktok),
  async panel() {
    return cached('social:panel', 300_000, async () => ({
      ok: true,
      items: await Promise.all([linkedin(), instagram(), facebook(), tiktok()]),
    }));
  },
};
