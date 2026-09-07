import { FoundationPage } from '@/components/FoundationPage';
import { SNELSTART_INVOICE_STEPS } from '@/lib/foundation/workflows';

export default function Administratie() {
  return (
    <FoundationPage eyebrow="BOB 1.0 · Finance" title="Administratie & facturering" intro="De SnelStart-workflow maakt alleen controleerbare concepten. Definitief maken en verzenden blijft altijd een bewuste menselijke beslissing." cards={[
      { title: 'Conceptfacturen', description: 'Gebaseerd op goedgekeurde uren, klantafspraken en tarieven.', status: 'Foundation' },
      { title: 'Validaties', description: 'Controle op klant, periode, tarief, btw, dubbele regels en ontbrekende gegevens.', status: 'Foundation' },
      { title: 'Afwijkingen', description: 'BOB stopt bij onduidelijke of afwijkende gegevens en vraagt gericht om aanvulling.', status: 'Gereed' },
      { title: 'Verzendwachtrij', description: 'Alleen goedgekeurde facturen mogen naar SnelStart en de klant.', status: 'Goedkeuring' },
    ]}>
      <section className="foundation-flow">
        <h2>SnelStart-factuurworkflow</h2>
        <ol>
          {SNELSTART_INVOICE_STEPS.map((step) => <li key={step.id}><span>{step.label}</span><small>{step.connector}{step.approvalRequired ? ' · expliciet akkoord' : ''}</small></li>)}
        </ol>
      </section>
    </FoundationPage>
  );
}
