import { store } from '../store.js';

const MAX_ITEMS = 120;

const clean = (value, max = 1200) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

function all() {
  const items = store.read('memory', []);
  return Array.isArray(items) ? items : [];
}

/** Persoonlijk, lokaal geheugen. Alleen feiten die BOB mag bewaren horen hier. */
export const memory = {
  list(limit = MAX_ITEMS) {
    return all()
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
      .slice(0, limit);
  },

  add(text, { source = 'opdracht', tags = [] } = {}) {
    const content = clean(text);
    if (!content) throw new Error('Ik heb niets om te onthouden.');

    const existing = all();
    const same = existing.find((item) => item.content.toLowerCase() === content.toLowerCase());
    if (same) {
      same.updatedAt = Date.now();
      store.write('memory', existing);
      return same;
    }

    const item = {
      id: globalThis.crypto?.randomUUID?.() || `m-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      content,
      source: clean(source, 80) || 'opdracht',
      tags: [...new Set((Array.isArray(tags) ? tags : []).map((tag) => clean(tag, 30)).filter(Boolean))].slice(0, 8),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.write('memory', [item, ...existing].slice(0, MAX_ITEMS));
    return item;
  },

  remove(id) {
    const before = all();
    const after = before.filter((item) => item.id !== id);
    if (after.length === before.length) return false;
    store.write('memory', after);
    return true;
  },

  context(maxChars = 7000) {
    let used = 0;
    const lines = [];
    for (const item of this.list()) {
      const line = `- ${item.content}`;
      if (used + line.length + 1 > maxChars) break;
      lines.push(line);
      used += line.length + 1;
    }
    return lines.join('\n');
  },
};
