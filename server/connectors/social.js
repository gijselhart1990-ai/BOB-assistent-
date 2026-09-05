import { config } from '../config.js';
import { cached } from '../store.js';

/**
 * Social-tellers.
 *
 * Eerlijk over wat kan: alleen platforms waarvoor je een geldig access token
 * hebt leveren echte cijfers. Zonder token toont BOB "niet verbonden" —
 * hij verzint geen getallen. Dat is bewust: een dashboard dat liegt is erger
 * dan een dashboard met een leeg vakje.
 */

const platforms = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    token: () => config.social.linkedin,
    async fetchStats(token) {
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`LinkedIn ${res.status}`);
      const me = await res.json();
      return { label: 'profiel', value: me.name || 'verbonden', unit: '' };
    },
  },
  {
    id: 'instagram',
    label: 'Instagram',
    token: () => config.social.instagram,
    async fetchStats(token) {
      const url = `https://graph.instagram.com/me?fields=username,media_count&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Instagram ${res.status}`);
      const me = await res.json();
      return { label: 'posts', value: me.media_count ?? 0, unit: 'posts' };
    },
  },
  {
    id: 'facebook',
    label: 'Facebook',
    token: () => config.social.facebook,
    async fetchStats(token) {
      const url = `https://graph.facebook.com/v21.0/me?fields=name&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Facebook ${res.status}`);
      const me = await res.json();
      return { label: 'profiel', value: me.name || 'verbonden', unit: '' };
    },
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    token: () => config.social.tiktok,
    async fetchStats(token) {
      const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`TikTok ${res.status}`);
      const json = await res.json();
      const u = json.data?.user || {};
      return { label: 'volgers', value: u.follower_count ?? 0, unit: 'volgers' };
    },
  },
];

export const social = {
  id: 'social',
  label: 'Social Media',
  configured: () => platforms.some((p) => Boolean(p.token())),

  async panel() {
    return cached('social:panel', 300_000, async () => {
      const items = [];
      for (const p of platforms) {
        const token = p.token();
        if (!token) { items.push({ id: p.id, label: p.label, ok: false, reason: 'geen token' }); continue; }
        try {
          const stats = await p.fetchStats(token);
          items.push({ id: p.id, label: p.label, ok: true, ...stats });
        } catch (err) {
          items.push({ id: p.id, label: p.label, ok: false, reason: err.message });
        }
      }
      return { ok: items.some((i) => i.ok), items };
    });
  },
};
