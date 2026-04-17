import type { PolicyExecutionContext } from './PolicyExecutionContext';
import type { TopologyPolicyPack } from '../topology/TopologyPolicyPack';

export interface EvaluationCompatibilityMatrixResult {
    isCompatible: boolean;
    violations: string[];
    warnings: string[];
    resolvedCapabilities: string[];
}

export function verifyEvaluationCompatibilityMatrix(
    pack: TopologyPolicyPack,
    context: PolicyExecutionContext
): EvaluationCompatibilityMatrixResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const resolvedCapabilities: string[] = [];

    // Extract relevant data
    const packRequiredCaps = pack.metadata?.requiredDatasetCapabilities || [];
    const capabilityManifest = context.capabilityManifest || {};
    const policyPackMetadata = context.policyPackMetadata || {};
    const executionPlanMetadata = context.executionPlanMetadata as any || {};

    const evalMode = executionPlanMetadata.evaluationMode;

    // 1. capability <-> policy pack compatibility
    for (const cap of packRequiredCaps) {
        if (!capabilityManifest[cap]) {
            violations.push(`MISSING_CAPABILITY: Pack requires unsupported capability '${cap}'`);
        } else {
            resolvedCapabilities.push(cap);
        }
    }

    // 2. dataset <-> capability compatibility (directionality, rest contract, journey pack)
    const activePacks = Object.keys(policyPackMetadata).filter(k => policyPackMetadata[k] === true);
    for (const active of activePacks) {
        if (active === 'supports_directionality' && !capabilityManifest['supports_directionality']) {
             warnings.push('Dataset implies directionality support but capability manifest lacks it');
        }
        if (active === 'rest_contract_pack' && !capabilityManifest['rest_contract_pack']) {
             warnings.push('Dataset implies rest_contract_pack support but capability manifest lacks it');
        }
        if (active === 'journey_pack' && !capabilityManifest['journey_pack']) {
             warnings.push('Dataset implies journey_pack support but capability manifest lacks it');
        }
    }

    // 3. policy pack <-> execution mode compatibility
    if (evalMode === 'strict' && violations.length > 0) {
        // Strict mode enforces zero violations, already handled by isCompatible
    }

    return {
        isCompatible: violations.length === 0,
        violations,
        warnings,
        resolvedCapabilities
    };
}
