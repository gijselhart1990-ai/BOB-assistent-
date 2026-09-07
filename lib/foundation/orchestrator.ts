import { createApprovalRequest, requiresApproval } from './policy';
import type { RiskLevel } from './types';

export type OrchestratorIntent = {
  intent: string;
  connector: string;
  action: string;
  risk: RiskLevel;
  reason: string;
  source: string;
};

export function planIntent(intent: OrchestratorIntent) {
  const approvalRequired = requiresApproval(intent.action, intent.risk);
  return {
    intent: intent.intent,
    steps: [
      { type: 'context', status: 'planned' },
      { type: 'connector', connector: intent.connector, status: 'planned' },
      approvalRequired ? createApprovalRequest(intent) : null,
      { type: 'audit', status: 'planned' },
    ].filter(Boolean),
    approvalRequired,
  };
}
