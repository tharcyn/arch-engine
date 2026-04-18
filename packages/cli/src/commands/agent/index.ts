import { RemediationAgentRuntime } from '../../../../agents/src/index.js';
import { AutonomousEvidenceMaintenanceAgent } from '../../../../agents/src/evidence-maintenance/index.js';

export async function agentStartCommand(options: any) {
    const result = { status: RemediationAgentRuntime.startAgent() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function agentPlanCommand(options: any) {
    const result = { status: RemediationAgentRuntime.planAgent() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function agentApplyCommand(options: any) {
    const result = { status: RemediationAgentRuntime.applyAgent() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function agentPreviewCommand(options: any) {
    const result = { status: RemediationAgentRuntime.previewAgent() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function agentMaintainAssuranceCommand(options: any) {
    const result = { status: AutonomousEvidenceMaintenanceAgent.maintainAssurance() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
