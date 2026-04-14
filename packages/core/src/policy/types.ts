export type PolicyMode = 'enforce' | 'advisory';

/**
 * PROTOCOL-LOCKED: MergeAuthority discriminated union.
 * Typed enum prevents string-based authority spoofing and
 * ensures lineage analytics pipelines interpret authority correctly.
 */
export type MergeAuthority =
  | 'local'
  | 'additive'
  | 'inherited'
  | 'overridden'
  | 'resolved-severity';

export type PolicyTier = 'high' | 'medium' | 'low';

export interface PolicyDomainDef {
  tier?: PolicyTier;
  enforceTier?: boolean;
}

export type PolicySeverity = 'error' | 'warning' | 'notice';

export interface PolicyRuleDef {
  id?: string;
  from: string;
  to: string;
  severity?: PolicySeverity; // e.g. error, warning
  deleted?: boolean;
  deletedReason?: 'authoritative' | 'inherited' | 'overridden';
}

export interface PolicyRules {
  allow?: PolicyRuleDef[];
  forbid?: PolicyRuleDef[];
}

export interface PolicyConfig {
  version: number;
  mode?: PolicyMode;
  extends?: string | string[];
  extendsResolution?: 'lazy' | 'eager';
  deleted?: boolean;
  severityLock?: boolean;
  severityPolicy?: 'strict' | 'permissive' | 'override' | 'loose';
  domains?: Record<string, PolicyDomainDef>;
  rules?: PolicyRules;
  /** Federation composition layer: fallback configuration */
  fallback?: Record<string, unknown>;
  /** Federation composition layer: explicit dependency declarations */
  dependencies?: Record<string, unknown>;
  /** Execution layer: policy-level annotation surface */
  annotations?: Record<string, unknown>;
}

export interface PolicyStackEntry {
  policyId: string;
  config: PolicyConfig;
  hash: string;

  // ─── FEDERATION IDENTITY BINDING (optional, pre-transport) ───
  /** Registry namespace origin, e.g. 'github.com/org' */
  policyNamespace?: string;
  /** Transport origin URI, e.g. 'policy://registry/org/repo' */
  policyOrigin?: string;
  /** Issuing authority identifier, bound to signature verification later */
  policyIssuer?: string;

  // ─── CAPABILITY PROJECTION LAYER ───
  transitiveRequiredCapabilities?: string[];
  negotiationWarnings?: { code: string; missingCapabilities: string[]; policyId: string }[];
  executionMetadata?: {
    capabilityFallbackApplied?: boolean;
    capabilityClosureHash?: string;
    capabilityExplainabilityGraph?: any;
    snapshotClosureGraphHash?: string;
    trustScopeExplainabilityGraph?: any;
    compositionHints?: any;
    dependencyAdjacencySurface?: any;
    snapshotEnvelope?: any;
    policyStackFingerprint?: string;
    extendedPolicyStackFingerprint?: string;
    dependencyDepth?: number;
    stackIndex?: number;
    stackTopologicalOrder?: string[];
    /** Federation negotiation mode for trust override resolution */
    negotiationMode?: string;
    /** Arbitrary annotations injected by execution modules */
    arbitraryAnnotations?: Record<string, unknown>;
  };
  loaderTrustMetadata?: {
    namespaceTrustPolicyVersion: string;
    namespaceTrustPolicyHash: string;
    namespaceTrustScopeHash?: string;
    activeTrustScopes?: string[];
  };
  loaderClosureMetadata?: {
    snapshotClosureGraphHash: string;
    closureGraphContractVersion: string;
    closureProvenance?: {
      manifestContentHash: string;
      signatureDigest: string;
      registryTrustRootId: string;
      trustRootEpoch: number;
    };
  };
  simulatedCapabilityCompatibility?: {
    missingCapabilities: string[];
    incompatibleLayers: string[];
    incompatibleDomains: string[];
  };
}

export interface ComposedRuleDef extends PolicyRuleDef {
  originPolicyId: string;
  originRuleId: string;
  compositionDepth: number;
  inheritedFromPolicyId?: string;
  originPolicyChain: string[];
  mergeAuthority: MergeAuthority;
  severityLock?: boolean;
  severityPolicy?: 'strict' | 'permissive' | 'override' | 'loose';
  deleted?: boolean;
}

export interface ComposedRules {
  allow?: ComposedRuleDef[];
  forbid?: ComposedRuleDef[];
}

export interface ComposedPolicy {
  version: number;
  mode?: PolicyMode;
  domains?: Record<string, PolicyDomainDef>;
  rules?: ComposedRules;
  effectiveHash: string;
}

export type ViolationCategory = 
  | 'tier_violation' 
  | 'explicit_forbid' 
  | 'implicit_crossing_candidate' 
  | 'classification_gap';

export interface PolicyViolation {
  violationCategory: ViolationCategory;
  from: string;
  to: string;
  severity: PolicySeverity;  
  ruleId?: string;
  ruleSource: string; // 'tier_rule', 'forbid_rule', etc
  confidenceContext: string;

  /**
   * SOFT-LOCKED: Evaluator-derived prefix bounds. Maps the canonical graph segment limits.
   * Extensible: May hold canonicalDomainId or domainOriginLayer in future compositions.
   */
  matchedDomainSource?: string;
  matchedDomainTarget?: string;

  tierSource?: string;
  tierTarget?: string;
  /**
   * SOFT-LOCKED: tierDelta = sourceRank - targetRank.
   * Positive = upward dependency. Zero = lateral. Negative = downward dependency.
   */
  tierDelta?: number;

  /**
   * HARD-LOCKED: suppressionEligible. Dictates architectural lifecycle suppressability limits natively.
   * INHERITANCE: Attachment is at the edge-instance level. Child suppression overlays override parent constraints.
   */
  suppressionEligible: boolean;

  // ─── PROVENANCE METADATA LAYER ───
  originPolicyId?: string;
  originRuleId?: string;
  compositionDepth?: number;
  inheritedFromPolicyId?: string;
  originPolicyChain?: string[];
  mergeAuthority?: MergeAuthority;

  /** GOVERNANCE TOMBSTONE TELEMETRY */
  suppressedByDeletion?: boolean;
  deletedReason?: 'authoritative' | 'inherited' | 'overridden';
}

/**
 * COMPOSITION RESOLUTION STRATEGY
 * Defines the deterministic merge law for overlapping policy stacks.
 */
export function resolveSeverity(
  parentSeverity: PolicySeverity, 
  childSeverity: PolicySeverity, 
  policy: 'strict' | 'permissive' | 'override' | 'loose' = 'strict'
): PolicySeverity {
  const ranks: Record<PolicySeverity, number> = { error: 3, warning: 2, notice: 1 };
  const pRank = ranks[parentSeverity] || 0;
  const cRank = ranks[childSeverity] || 0;

  if (policy === 'override' || policy === 'permissive' || policy === 'loose') {
    return childSeverity;
  }
  
  // strict case
  return pRank > cRank ? parentSeverity : childSeverity;
}

export const GOVERNANCE_TELEMETRY_SCHEMA_VERSION = "1.0.0";

/**
 * PROVENANCE RECORD: Tracks when an allow rule silently bypasses a forbid rule.
 * Without this, governance escapes are invisible in the audit trail.
 */
export interface AllowMatch {
  /** The allow rule ID that matched (or 'anonymous' if no id) */
  matchedAllowRuleId: string;
  /** Policy that contributed the matching allow rule */
  matchedAllowPolicyId: string;
  /** Composition depth of the allow rule */
  allowCompositionDepth: number;
  /** Edge source that was allowed */
  from: string;
  /** Edge target that was allowed */
  to: string;
}

export interface PolicyEvaluationResult {
  violations: PolicyViolation[];
  matchedEdges: number;
  policyMode: PolicyMode;
  policyVersion: number;
  policyHash?: string;
  effectivePolicyHash?: string;
  policyNamespace?: string;
  stackExpansionDeterminismSeed?: string;
  stackExpansionTopologyVersion?: string;
  policyGovernanceContractVersion?: string;
  policyTransportContractVersion?: string;
  policyRegistryContractVersion?: string;
  policyManifestSchemaVersion?: string;
  policyStackIds?: string[];
  policyStackHashes?: string[];
  evaluationStrategyVersion: number;
  /**
   * ORCHESTRATION INVARIANT: policyDetected = false specifies no local `.archengine/policy.yml` 
   * existed at evaluation time natively. It does NOT imply the absence of inherited multi-policy logic.
   */
  policyDetected: boolean;

  /**
   * COUNT INVARIANT: policyRuleHits[ruleId] tracks the number of violating edges matched 
   * by the rule during the current evaluation pass.
   */
  policyRuleHits: Record<string, number>;

  /**
   * GOVERNANCE BYPASS AUDIT: Records every edge that matched an allow rule,
   * making governance escapes visible in the evaluation output.
   */
  allowMatches: AllowMatch[];
}
