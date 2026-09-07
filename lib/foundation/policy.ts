import type { ApprovalRequest, RiskLevel } from './types';

const IMPACT_ACTIONS = new Set(['send', 'create', 'update', 'delete', 'schedule', 'publish', 'invoice', 'pay']);

export function requiresApproval(action: string, risk: RiskLevel = 'write') {
  return risk !== 'read' || IMPACT_ACTIONS.has(action.toLowerCase());
}

export function createApprovalRequest(input: ApprovalRequest): ApprovalRequest & { required: true } {
  if (!input.action || !input.reason || !input.source) {
    throw new Error('Een goedkeuringsverzoek vereist actie, reden en bron.');
  }
  return { ...input, required: true };
}
