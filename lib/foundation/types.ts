export type ModuleStatus = 'foundation' | 'ready' | 'planned';
export type RiskLevel = 'read' | 'write' | 'sensitive';

export type BobModule = {
  id: string;
  name: string;
  description: string;
  route: string;
  status: ModuleStatus;
  phase: 1 | 2 | 3;
};

export type WorkflowStep = {
  id: string;
  label: string;
  connector: string;
  risk: RiskLevel;
  approvalRequired: boolean;
};

export type ApprovalRequest = {
  action: string;
  reason: string;
  source: string;
  risk: RiskLevel;
};
