import { OverlayAuthorityTier } from './seamContracts.js';
import { OverlayLifecycleState } from './overlayLifecycleState.js';
import { binaryStringCompare } from '../utils/binaryStringCompare.js';

export enum ResolutionStrategy {
  AUTHORITY_FIRST = 'AUTHORITY_FIRST',
  VERSION_FIRST = 'VERSION_FIRST',
  REGISTRY_LOCAL_FIRST = 'REGISTRY_LOCAL_FIRST',
  TENANT_OVERRIDE_FIRST = 'TENANT_OVERRIDE_FIRST',
  PINNED_ONLY = 'PINNED_ONLY',
  EXPLICIT_ORDER_ONLY = 'EXPLICIT_ORDER_ONLY',
  COMPATIBILITY_MAXIMAL = 'COMPATIBILITY_MAXIMAL'
}

export interface OverlayCandidate {
  overlaySourceId: string;
  overlayVersion: string;
  registryId: string;
  authorityTier: OverlayAuthorityTier;
  registryTrustDomain: number;
  namespace?: string;
  compatibilityRecord?: any;
}

export interface OverlayResolutionContext {
  seamId: string;
  candidateOverlays: OverlayCandidate[];
  executionRegistryId?: string; // used for REGISTRY_LOCAL_FIRST
  optionalPinnedOverlaySet?: string[];
  optionalExplicitOrderingList?: string[];
  // F-11 Context metadata placeholders if needed dynamically:
  registryTrustDomains?: any;
  authorityTierMap?: any;
  namespaceOwnershipRules?: any;
  compatibilityMatrix?: any;
  lifecycleStateMap?: any;
  supersessionGraph?: any;
  revocationIndex?: any;
}

export class OverlayResolutionFailureError extends Error {
  public seamId: string;
  public strategy: ResolutionStrategy;
  public candidateOverlayIds: string[];
  public candidatesBeforeResolution: OverlayCandidate[];
  /**
   * eliminationSteps ordering is deterministic and MUST reflect
   * candidate evaluation order.
   * 
   * eliminationSteps MUST NOT be:
   * - sorted after evaluation
   * - grouped after evaluation
   * - reconstructed after evaluation
   */
  public eliminationSteps: { overlayId: string, eliminationReason: string }[];

  constructor(
    seamId: string, 
    strategy: ResolutionStrategy, 
    candidateOverlayIds: string[], 
    message: string,
    candidatesBeforeResolution: OverlayCandidate[] = [],
    eliminationSteps: { overlayId: string, eliminationReason: string }[] = []
  ) {
    super(`OverlayResolutionFailureError: ${message}`);
    this.name = 'OverlayResolutionFailureError';
    this.seamId = seamId;
    this.strategy = strategy;
    this.candidateOverlayIds = candidateOverlayIds;
    this.candidatesBeforeResolution = candidatesBeforeResolution;
    this.eliminationSteps = eliminationSteps;
  }
}

/**
 * Compatibility score weighting is deterministic and identity-safe.
 * 
 * Score components MUST remain:
 * + compatibleCoreVersionMatches
 * + compatibleSchemaMatches
 * + satisfiedRequiredCapabilities
 * - declaredIncompatibilityCount
 * 
 * Relative weighting MUST NOT change without introducing
 * a new ResolutionStrategy variant.
 * 
 * Deterministic Compatibility Score Lock
 * Computes deterministic scalar value from normalized matrix elements.
 */
export function computeCompatibilityScoreDeterministic(c: OverlayCandidate): number {
    let score = 0;
    if (c.compatibilityRecord) {
        const r = c.compatibilityRecord;
        const normalizedScore = (arr: any) => Array.isArray(arr) ? Array.from(new Set(arr)).sort().length : 0;

        score += normalizedScore(r.compatibleWithCoreVersions);
        score += normalizedScore(r.compatibleWithPolicySchemaVersions);
        score += normalizedScore(r.requiresCapabilities);
        score -= normalizedScore(r.incompatibleWith);
    }
    return score;
}

/**
 * Resolution strategy operates only on canonicalized overlay descriptors.
 * Resolution strategy MUST NOT perform namespace normalization,
 * authority resolution, registry-domain resolution, or version normalization.
 * 
 * Resolution strategy MUST NOT evaluate adapter capability graphs.
 * Capability negotiation belongs exclusively to the capability federation layer.
 * Resolution strategy may consume compatibility matrix summaries ONLY.
 * 
 * Resolution strategy operates strictly on admission-approved overlays.
 * Resolution strategy MUST NOT evaluate overlays rejected by:
 * - lifecycle eligibility
 * - namespace ownership
 * - authority ladder ceilings
 * - compatibility validation
 * - supersession exclusion
 * - revocation filtering
 * 
 * Resolution strategy selects candidate overlays only.
 * Resolution strategy MUST NOT influence:
 * - snapshotClosureGraphHash
 * - fingerprint identity arrays
 * - closureProvenance construction
 * - signature validation logic
 * - merge-mode evaluation
 * Closure identity derives exclusively from the final overlay stack
 * after precedence algebra execution.
 * 
 * Resolution diagnostics expose elimination reasoning only.
 * Diagnostics MUST NOT expose registry precedence weights,
 * authority scoring arithmetic,
 * or compatibility scoring internals.
 */
export function resolveOverlaySelection(
  context: OverlayResolutionContext,
  strategy: ResolutionStrategy = ResolutionStrategy.AUTHORITY_FIRST,
  eliminationStepsOut: { overlayId: string, eliminationReason: string }[] = []
): OverlayCandidate[] {
  let candidates = [...context.candidateOverlays];

  if (candidates.length === 0) {
    throw new OverlayResolutionFailureError(
        context.seamId, strategy, [], 
        'No candidate overlays provided to resolution layer.', 
        context.candidateOverlays, 
        eliminationStepsOut
    );
  }

  const parseSemver = (v: string): number => {
      const parts = v.split('.').map(Number);
      return (parts[0] || 0) * 1000000 + (parts[1] || 0) * 1000 + (parts[2] || 0);
  };

  /**
   * Tie-break fallback ordering is identity-safety critical.
   * Do NOT reorder fallback chain.
   * 
   * Deterministic Tie-Break Fallback Chain
   * authority -> registry trust -> semver -> namespace -> overlayId 
   */
  const applyDeterministicTieBreak = (a: OverlayCandidate, b: OverlayCandidate): number => {
      if (a.authorityTier !== b.authorityTier) {
          return b.authorityTier - a.authorityTier;
      }
      if (a.registryTrustDomain !== b.registryTrustDomain) {
          return b.registryTrustDomain - a.registryTrustDomain;
      }
      const vDiff = parseSemver(b.overlayVersion) - parseSemver(a.overlayVersion);
      if (vDiff !== 0) return vDiff;

      const aNs = a.namespace || '';
      const bNs = b.namespace || '';
      if (aNs !== bNs) return binaryStringCompare(aNs, bNs);

      const aId = `${a.overlaySourceId}@${a.overlayVersion}`;
      const bId = `${b.overlaySourceId}@${b.overlayVersion}`;
      return binaryStringCompare(aId, bId);
  };

  // Base deterministic ordering prevents mirror/import latency from altering trace evaluation order.
  candidates.sort((a, b) => applyDeterministicTieBreak(a, b));

  switch (strategy) {
    case ResolutionStrategy.AUTHORITY_FIRST:
      candidates.sort((a, b) => applyDeterministicTieBreak(a, b));
      break;

    case ResolutionStrategy.VERSION_FIRST:
      candidates.sort((a, b) => {
        const vDiff = parseSemver(b.overlayVersion) - parseSemver(a.overlayVersion);
        if (vDiff !== 0) return vDiff;
        return applyDeterministicTieBreak(a, b);
      });
      break;

    case ResolutionStrategy.REGISTRY_LOCAL_FIRST:
      if (!context.executionRegistryId) break;
      candidates.sort((a, b) => {
        const aLocal = a.registryId === context.executionRegistryId ? 1 : 0;
        const bLocal = b.registryId === context.executionRegistryId ? 1 : 0;
        if (aLocal !== bLocal) return bLocal - aLocal;
        return applyDeterministicTieBreak(a, b);
      });
      break;

    case ResolutionStrategy.TENANT_OVERRIDE_FIRST:
      if (!context.optionalPinnedOverlaySet) break;
      candidates.sort((a, b) => {
        const aPinned = context.optionalPinnedOverlaySet!.includes(a.overlaySourceId) ? 1 : 0;
        const bPinned = context.optionalPinnedOverlaySet!.includes(b.overlaySourceId) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return applyDeterministicTieBreak(a, b);
      });
      break;

    case ResolutionStrategy.PINNED_ONLY:
      if (!context.optionalPinnedOverlaySet) {
          candidates.forEach(c => eliminationStepsOut.push({ overlayId: c.overlaySourceId, eliminationReason: 'pinnedSetExclusion' }));
          candidates = [];
      } else {
          const survivors: OverlayCandidate[] = [];
          for (const c of candidates) {
              if (context.optionalPinnedOverlaySet!.includes(c.overlaySourceId)) {
                  survivors.push(c);
              } else {
                  eliminationStepsOut.push({ overlayId: c.overlaySourceId, eliminationReason: 'pinnedSetExclusion' });
              }
          }
          candidates = survivors;
      }
      break;

    case ResolutionStrategy.EXPLICIT_ORDER_ONLY:
      /**
       * EXPLICIT_ORDER_ONLY overrides lexical fallback ordering completely.
       * When explicit ordering is provided, namespace lexical and overlayId lexical
       * fallbacks MUST NOT override explicit order.
       */
      if (!context.optionalExplicitOrderingList) {
          candidates.forEach(c => eliminationStepsOut.push({ overlayId: c.overlaySourceId, eliminationReason: 'explicitOrderingMismatch' }));
          candidates = [];
      } else {
          const explicitList = context.optionalExplicitOrderingList!;
          const survivors: OverlayCandidate[] = [];
          for (const c of candidates) {
              if (explicitList.includes(c.overlaySourceId)) {
                  survivors.push(c);
              } else {
                  eliminationStepsOut.push({ overlayId: c.overlaySourceId, eliminationReason: 'explicitOrderingMismatch' });
              }
          }
          candidates = survivors;
          candidates.sort((a, b) => {
              const diff = explicitList.indexOf(a.overlaySourceId) - explicitList.indexOf(b.overlaySourceId);
              if (diff !== 0) return diff;
              return applyDeterministicTieBreak(a, b);
          });
      }
      break;

    case ResolutionStrategy.COMPATIBILITY_MAXIMAL:
      candidates.sort((a, b) => {
          const scoreDiff = computeCompatibilityScoreDeterministic(b) - computeCompatibilityScoreDeterministic(a);
          if (scoreDiff !== 0) return scoreDiff;
          return applyDeterministicTieBreak(a, b);
      });
      break;
  }

  if (candidates.length === 0) {
    const ids = context.candidateOverlays.map(c => c.overlaySourceId);
    throw new OverlayResolutionFailureError(
        context.seamId, 
        strategy, 
        ids, 
        'Resolution strategy eliminated all candidates. Execution cannot proceed safely.',
        context.candidateOverlays,
        eliminationStepsOut
    );
  }

  return candidates;
}
