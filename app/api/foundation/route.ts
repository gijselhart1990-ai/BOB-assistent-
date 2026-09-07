import { NextResponse } from 'next/server';
import { BOB_MODULES } from '@/lib/foundation/modules';
import { FOUNDATION_WORKFLOWS } from '@/lib/foundation/workflows';

export async function GET() {
  return NextResponse.json({
    version: '1.0.0-foundation',
    mode: 'demo-safe',
    modules: BOB_MODULES,
    workflows: FOUNDATION_WORKFLOWS,
    security: {
      explicitApproval: true,
      secretsInClient: false,
      auditRequired: true,
      dataMinimisation: true,
    },
  });
}
