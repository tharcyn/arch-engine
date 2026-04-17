import type { LocalPolicyRule } from './LocalPolicyRule.js';

// PolicyPackMetadata defines the discovery surface
// used for CLI inspection and future registry federation support
export interface PolicyPackMetadata {
  readonly policyPackId: string;
  readonly description: string;
  readonly category: string;
  readonly rules?: LocalPolicyRule[];
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
