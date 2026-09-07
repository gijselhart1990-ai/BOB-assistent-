import Link from 'next/link';
import { BOB_MODULES } from '@/lib/foundation/modules';

export function FoundationOverview() {
  return (
    <section className="foundation-overview" aria-labelledby="foundation-title">
      <div className="foundation-heading">
        <div>
          <span className="foundation-kicker">BOB 1.0</span>
          <h2 id="foundation-title">Foundation actief</h2>
        </div>
        <span className="foundation-mode"><i /> Demo-safe</span>
      </div>
      <div className="foundation-grid">
        {BOB_MODULES.filter((module) => module.phase === 1).map((module) => (
          <Link href={module.route} className="foundation-module" key={module.id}>
            <span className="foundation-module-state">{module.status === 'foundation' ? 'Basis gereed' : module.status}</span>
            <strong>{module.name}</strong>
            <small>{module.description}</small>
          </Link>
        ))}
      </div>
      <div className="approval-bar">
        <span className="approval-shield">✓</span>
        <span><strong>Acties ter goedkeuring</strong><small>Versturen, wijzigen, verwijderen, plannen, publiceren en factureren kan alleen na jouw expliciete akkoord.</small></span>
        <Link href="/security">Policy bekijken</Link>
      </div>
    </section>
  );
}
