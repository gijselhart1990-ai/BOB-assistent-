'use client';
import { useEffect, useRef, useState } from 'react';

export function GoogleAccountPicker() {
  const [accounts, setAccounts] = useState<{ subject: string; email: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let initial: string | undefined;
    let checking = false;
    const check = async () => {
      if (checking || controller.signal.aborted) return;
      checking = true;
      try {
        const res = await fetch('/api/google/accounts', { cache: 'no-store', signal: controller.signal });
        const data = await res.json();
        if (!res.ok || !data.ok || controller.signal.aborted) return;
        const current = data.selected || '';
        if (initial !== undefined && current !== initial) { window.location.reload(); return; }
        initial = current;
        setAccounts(data.accounts); setSelected(current);
      } catch { /* Een volgende focus controleert opnieuw. */ }
      finally { checking = false; }
    };
    // Het accountcookie wordt gedeeld door tabbladen. Wis oude schermgegevens
    // door volledig te navigeren zodra een ander tabblad het account wijzigt.
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('bob-google-selection');
      channel.current.onmessage = event => {
        if (event.data === 'changed') window.location.reload();
      };
    }
    const visible = () => { if (document.visibilityState === 'visible') void check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', visible);
    void check();
    return () => {
      controller.abort(); channel.current?.close(); channel.current = null;
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  if (!accounts.length) return null;
  return <div>
    <label>Google-account <select aria-label="Google-account" value={selected} disabled={busy} onChange={async e => {
      setBusy(true); setError('');
      try {
        const res = await fetch('/api/google/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: e.target.value }) });
        if (!res.ok) throw new Error();
        channel.current?.postMessage('changed');
        // Volledige navigatie verwijdert oude chats, badges en lopende schermverzoeken.
        window.location.reload();
      } catch { setError('Account wisselen lukte niet.'); setBusy(false); }
    }}><option value="" disabled>Kies een account</option>{accounts.map(a => <option key={a.subject} value={a.subject}>{a.email}</option>)}</select></label>
    <a href="/api/oauth/google/start">Google-account toevoegen</a>
    {error && <span role="alert">{error}</span>}
  </div>;
}
