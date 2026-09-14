import { FoundationPage } from '@/components/FoundationPage';
import { FOUNDATION_WORKFLOWS } from '@/lib/foundation/workflows';

export default function Workflows() {
  return (
    <FoundationPage eyebrow="BOB 1.0 · Automatisering" title="Workflow Builder" intro="Bouw herhaalbare processen uit triggers, controles, acties, goedkeuringen en logging. In Foundation-modus zijn workflows zichtbaar en controleerbaar; impactacties blijven vergrendeld." cards={FOUNDATION_WORKFLOWS.map((workflow) => ({
      title: workflow.name,
      description: `Start: ${workflow.trigger}. De workflow bevat ${workflow.steps} controleerbare stappen.`,
      meta: 'Workflowontwerp; uitvoering, versiebeheer en auditlog volgen nog',
      status: workflow.id === 'snelstart-invoice' ? 'Foundation' : 'Gepland',
    }))}>
      <section className="foundation-flow">
        <h2>Vaste bouwblokken</h2>
        <div className="flow-chips"><span>Trigger</span><span>Context</span><span>Beslissing</span><span>Goedkeuring</span><span>Actie</span><span>Audit</span></div>
      </section>
    </FoundationPage>
  );
}
