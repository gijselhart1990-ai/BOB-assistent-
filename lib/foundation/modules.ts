import type { BobModule } from './types';

export const BOB_MODULES: BobModule[] = [
  { id: 'orchestrator', name: 'AI-orchestrator', description: 'Begrijpt de opdracht, maakt een plan en kiest veilige tools.', route: '/', status: 'foundation', phase: 1 },
  { id: 'tasks', name: 'Takenhub', description: 'Eén overzicht voor taken uit BOB en gekoppelde bronnen.', route: '/taken', status: 'foundation', phase: 1 },
  { id: 'workflows', name: 'Workflow Builder', description: 'Herhaalbare processen met controles en goedkeuringen.', route: '/workflows', status: 'foundation', phase: 1 },
  { id: 'microsoft', name: 'Microsoft 365', description: 'Outlook, agenda, contacten, OneDrive en Teams.', route: '/outlook', status: 'foundation', phase: 1 },
  { id: 'google', name: 'Google multi-account', description: 'Gmail, Calendar en Drive per account en organisatie.', route: '/google', status: 'foundation', phase: 1 },
  { id: 'finance', name: 'SnelStart facturen', description: 'Conceptfacturen controleren en na akkoord verzenden.', route: '/administratie', status: 'foundation', phase: 1 },
  { id: 'security', name: 'Security & logboek', description: 'Policy, rechten, approvals en volledig auditspoor.', route: '/security', status: 'foundation', phase: 1 },
  { id: 'clients', name: 'Cliënten & organisaties', description: 'Context zonder brondata onnodig te kopiëren.', route: '/taken', status: 'planned', phase: 2 },
];
