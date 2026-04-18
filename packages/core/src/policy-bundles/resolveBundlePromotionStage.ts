import type { ArchPolicyPackBundleFormat } from './ArchPolicyPackBundleFormat.js';
import type { PromotionStage } from './BundlePublishingDescriptor.js';
import { verifyPolicyPackBundleSignature } from './verifyPolicyPackBundleSignature.js';

export interface BundlePromotionDecision {
    readonly promotionPermitted: boolean;
    readonly approvedStage: PromotionStage;
    readonly promotionDiagnostics: readonly string[];
}

export function resolveBundlePromotionStage(
    bundle: ArchPolicyPackBundleFormat,
    targetStage: PromotionStage,
    currentStage: PromotionStage | null
): BundlePromotionDecision {
    const diagnostics: string[] = [];
    
    // Revocations are terminal
    if (currentStage === 'revoked') {
        diagnostics.push('Bundle is revoked. Promotion denied.');
        return {
            promotionPermitted: false,
            approvedStage: 'revoked',
            promotionDiagnostics: diagnostics
        };
    }

    // Downgrades allowed implicitly, but recorded
    const stages: PromotionStage[] = ['development', 'staging', 'verified', 'production', 'deprecated', 'revoked'];
    const targetIdx = stages.indexOf(targetStage);
    const currentIdx = currentStage ? stages.indexOf(currentStage) : -1;

    // Require signature for high-tier stages
    if (targetStage === 'verified' || targetStage === 'production') {
        const sigResult = verifyPolicyPackBundleSignature(bundle, 'required');
        if (!sigResult.signatureValid) {
            diagnostics.push(`Promotion to ${targetStage} requires a valid signature.`);
            return {
                promotionPermitted: false,
                approvedStage: currentStage || 'development',
                promotionDiagnostics: diagnostics
            };
        }
    }

    diagnostics.push(`Promotion to ${targetStage} permitted.`);
    return {
        promotionPermitted: true,
        approvedStage: targetStage,
        promotionDiagnostics: diagnostics
    };
}
