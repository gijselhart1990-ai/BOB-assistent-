'use client';
import { useEffect, useState } from 'react';

export function GoogleAccountPicker() {
  const [accounts, setAccounts] = useState<{ subject: string; email: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/google/accounts', { signal: controller.signal }).then(r => r.json()).then(data => {
      if (data.ok) { setAccounts(data.accounts); setSelected(data.selected || ''); }
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!accounts.length) return null;
  return <div>
    <label>Google-account <select aria-label="Google-account" value={selected} disabled={busy} onChange={async e => {
      setBusy(true); setError('');
      try {
        const res = await fetch('/api/google/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: e.target.value }) });
        if (!res.ok) throw new Error();
        // Volledige navigatie verwijdert oude chats, badges en lopende schermverzoeken.
        window.location.reload();
      } catch { setError('Account wisselen lukte niet.'); setBusy(false); }
    }}><option value="" disabled>Kies een account</option>{accounts.map(a => <option key={a.subject} value={a.subject}>{a.email}</option>)}</select></label>
    <a href="/api/oauth/google/start">Google-account toevoegen</a>
    {error && <span role="alert">{error}</span>}
  </div>;
}
