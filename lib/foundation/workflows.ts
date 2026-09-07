import type { WorkflowStep } from './types';

export const SNELSTART_INVOICE_STEPS: WorkflowStep[] = [
  { id: 'collect', label: 'Uren en afspraken verzamelen', connector: 'Takenhub', risk: 'read', approvalRequired: false },
  { id: 'validate', label: 'Klant, tarief, btw en periode controleren', connector: 'BOB policy', risk: 'read', approvalRequired: false },
  { id: 'draft', label: 'Conceptfactuur opstellen', connector: 'SnelStart', risk: 'write', approvalRequired: true },
  { id: 'review', label: 'Menselijke controle', connector: 'Approval Hub', risk: 'sensitive', approvalRequired: true },
  { id: 'send', label: 'Factuur definitief maken en versturen', connector: 'SnelStart', risk: 'sensitive', approvalRequired: true },
  { id: 'audit', label: 'Resultaat en bronverwijzingen vastleggen', connector: 'Audit Log', risk: 'write', approvalRequired: false },
];

export const FOUNDATION_WORKFLOWS = [
  { id: 'snelstart-invoice', name: 'SnelStart factuur', trigger: 'Handmatig of periodeafsluiting', steps: SNELSTART_INVOICE_STEPS.length },
  { id: 'daily-briefing', name: 'Dagbriefing', trigger: 'Op verzoek', steps: 4 },
  { id: 'mail-triage', name: 'Mail triage', trigger: 'Op verzoek', steps: 3 },
];
