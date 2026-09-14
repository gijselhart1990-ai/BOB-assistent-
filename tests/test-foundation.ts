import assert from 'node:assert/strict';
import { requiresApproval } from '../lib/foundation/policy';
import { planIntent } from '../lib/foundation/orchestrator';
import { SNELSTART_INVOICE_STEPS } from '../lib/foundation/workflows';

assert.equal(requiresApproval('read', 'read'), false);
assert.equal(requiresApproval('send', 'write'), true);
assert.equal(requiresApproval('invoice', 'sensitive'), true);

const plan = planIntent({
  intent: 'factuur versturen',
  connector: 'snelstart',
  action: 'invoice',
  risk: 'sensitive',
  reason: 'goedgekeurde uren factureren',
  source: 'takenhub',
});

assert.equal(plan.approvalRequired, true);
assert.equal(plan.steps.length, 4);
assert.equal(SNELSTART_INVOICE_STEPS.at(-1)?.id, 'audit');
assert.ok(SNELSTART_INVOICE_STEPS.filter((step) => step.risk === 'sensitive').every((step) => step.approvalRequired));

console.log('  [v] Foundation-policy blokkeert impactacties zonder akkoord');
console.log('  [v] Orchestrator maakt een controleerbaar plan');
console.log('  [v] SnelStart-workflow eindigt met audit');
