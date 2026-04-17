import type { LocalPolicyRule } from './LocalPolicyRule';

export interface PolicyPackManifest {
    readonly policyPackId: string;
    readonly description: string;
    readonly category: string;
    readonly rules?: readonly LocalPolicyRule[];
    readonly engineCompatibility?: string;
    readonly dependencies?: readonly string[];
    readonly packageName?: string;
    readonly signature?: string;
    readonly requiredDatasetCapabilities?: readonly string[];
    readonly optionalDatasetCapabilities?: readonly string[];
    readonly requiredMutationClasses?: readonly string[];
    readonly requiredAuthorityScopes?: readonly string[];
    readonly requiredSurfaceConfidenceKeys?: readonly string[];
    readonly requiredTrustBoundaryRules?: readonly string[];
}
