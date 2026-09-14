import type { ApprovalRequest, RiskLevel } from './types';

const READ_ACTIONS = new Set(['read', 'list', 'search', 'get', 'summarize']);

export function requiresApproval(action: string, risk: RiskLevel = 'write') {
  return risk !== 'read' || !READ_ACTIONS.has(action.trim().toLowerCase());
}

export function createApprovalRequest(input: ApprovalRequest): ApprovalRequest & { required: true } {
  if (!input.action || !input.reason || !input.source) {
    throw new Error('Een goedkeuringsverzoek vereist actie, reden en bron.');
  }
  return { ...input, required: true };
}
