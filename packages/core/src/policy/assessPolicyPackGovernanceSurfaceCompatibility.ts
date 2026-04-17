import type { PolicyPackMetadata } from './PolicyPackMetadata.js';

export type PolicyPackGovernanceCompatibilityStatus = 'compatible' | 'incompatible' | 'partially-compatible' | 'unknown';

export type GovernanceSurfaceMissingFrom = 'mutation_class_registry' | 'authority_scope_registry' | 'surface_confidence_registry' | 'trust_boundary_rules';

export interface PolicyPackGovernanceCompatibilityFinding {
    readonly packId: string;
    readonly code: string;
    readonly message: string;
    readonly requiredKey: string;
    readonly missingFrom: GovernanceSurfaceMissingFrom;
}

export interface PolicyPackGovernanceCompatibilityDiagnostic {
    readonly overallStatus: PolicyPackGovernanceCompatibilityStatus;
    readonly findings: readonly PolicyPackGovernanceCompatibilityFinding[];
    readonly summaryMessage: string;
}

export function assessPolicyPackGovernanceSurfaceCompatibility(
    datasetMutationClassRegistry: Record<string, unknown> | undefined,
    datasetAuthorityScopeRegistry: Record<string, unknown> | undefined,
    datasetSurfaceConfidenceRegistry: Record<string, unknown> | undefined,
    datasetTrustBoundaryRules: Record<string, unknown> | undefined,
    policyPacks: readonly PolicyPackMetadata[]
): PolicyPackGovernanceCompatibilityDiagnostic {
    if (!policyPacks || policyPacks.length === 0) {
        return {
            overallStatus: 'unknown',
            findings: [],
            summaryMessage: 'No policy packs evaluated for governance compatibility.'
        };
    }

    const findings: PolicyPackGovernanceCompatibilityFinding[] = [];
    let isCompatible = true;

    for (const pack of policyPacks) {
        if (pack.requiredMutationClasses && pack.requiredMutationClasses.length > 0) {
            for (const req of pack.requiredMutationClasses) {
                if (!datasetMutationClassRegistry || !(req in datasetMutationClassRegistry)) {
                    isCompatible = false;
                    findings.push({
                        packId: pack.policyPackId,
                        code: 'POLICY_PACK_GOVERNANCE_MISSING_MUTATION_CLASS',
                        message: `Policy pack ${pack.policyPackId} requires mutation class '${req}', which is absent from dataset mutation_class_registry.`,
                        requiredKey: req,
                        missingFrom: 'mutation_class_registry'
                    });
                }
            }
        }

        if (pack.requiredAuthorityScopes && pack.requiredAuthorityScopes.length > 0) {
            for (const req of pack.requiredAuthorityScopes) {
                if (!datasetAuthorityScopeRegistry || !(req in datasetAuthorityScopeRegistry)) {
                    isCompatible = false;
                    findings.push({
                        packId: pack.policyPackId,
                        code: 'POLICY_PACK_GOVERNANCE_MISSING_AUTHORITY_SCOPE',
                        message: `Policy pack ${pack.policyPackId} requires authority scope '${req}', which is absent from dataset authority_scope_registry.`,
                        requiredKey: req,
                        missingFrom: 'authority_scope_registry'
                    });
                }
            }
        }

        if (pack.requiredSurfaceConfidenceKeys && pack.requiredSurfaceConfidenceKeys.length > 0) {
            for (const req of pack.requiredSurfaceConfidenceKeys) {
                if (!datasetSurfaceConfidenceRegistry || !(req in datasetSurfaceConfidenceRegistry)) {
                    isCompatible = false;
                    findings.push({
                        packId: pack.policyPackId,
                        code: 'POLICY_PACK_GOVERNANCE_MISSING_SURFACE_CONFIDENCE',
                        message: `Policy pack ${pack.policyPackId} requires surface confidence key '${req}', which is absent from dataset surface_confidence_registry.`,
                        requiredKey: req,
                        missingFrom: 'surface_confidence_registry'
                    });
                }
            }
        }

        if (pack.requiredTrustBoundaryRules && pack.requiredTrustBoundaryRules.length > 0) {
            for (const req of pack.requiredTrustBoundaryRules) {
                if (!datasetTrustBoundaryRules || !(req in datasetTrustBoundaryRules)) {
                    isCompatible = false;
                    findings.push({
                        packId: pack.policyPackId,
                        code: 'POLICY_PACK_GOVERNANCE_MISSING_TRUST_BOUNDARY_RULE',
                        message: `Policy pack ${pack.policyPackId} requires trust boundary rule '${req}', which is absent from dataset trust_boundary_rules.`,
                        requiredKey: req,
                        missingFrom: 'trust_boundary_rules'
                    });
                }
            }
        }
    }

    if (!isCompatible) {
        return {
            overallStatus: 'incompatible',
            findings,
            summaryMessage: `Incompatible: ${findings.length} governance requirement(s) missing from dataset surfaces.`
        };
    }

    return {
        overallStatus: 'compatible',
        findings: [],
        summaryMessage: 'Policy packs are fully compatible with dataset governance surfaces.'
    };
}
