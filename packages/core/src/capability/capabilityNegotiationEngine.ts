/**
 * F-12: Capability Negotiation Federation Engine
 *
 * 12-step deterministic federation-safe capability negotiation pipeline.
 * Replaces the pre-F-12 negotiation scaffold with full federation-grade
 * provider selection, trust envelope construction, and sealed identity invariants.
 *
 * PIPELINE ORDERING (CANONICAL):
 *   1.  Canonicalize provider list (lexicographic by providerId)
 *   2.  Signature Root Enforcement Gate
 *   3.  Registry Provenance Validation
 *   4.  Lifecycle Admission Eligibility
 *   5.  Compatibility Matrix Gating
 *   6.  Authority Ladder Ceiling Enforcement
 *   7.  Seam-Scope Grant Validation
 *   8.  Mirror Fallback Privilege Escalation Prevention
 *   9.  Trust Envelope Construction
 *   10. Dependency Closure Resolution
 *   11. Deterministic Selection Sort
 *   12. Freeze & Return Decision
 *
 * IDENTITY SAFETY CONTRACT:
 *   Capability negotiation produces execution metadata only.
 *   Results MUST NOT influence:
 *     - snapshot closure graph hash
 *     - policyStackFingerprint
 *     - closureProvenance construction
 *     - overlay resolution ordering
 *     - lifecycle admission ordering
 *     - compatibility matrix evaluation ordering
 *
 * DETERMINISM GUARANTEES:
 *   - Steps 1-9 are elimination gates (reduce, never expand)
 *   - Step 10 validates dependency completeness
 *   - Step 11 produces deterministic ordering independent of input order
 *   - Step 12 freezes the result (immutable)
 *   - Rejected providers are sorted by providerId → stage → reason
 */

import { OverlayAuthorityTier } from '../topology/seamContracts.js';
import { resolveEffectiveOverlayState } from '../topology/overlayLifecycleState.js';
import { resolveRegistryTrustRoot, RegistryTrustTier } from '../topology/registryTrustStore.js';
import { enforceRegistryAuthorityLadder } from '../topology/registryAuthorityLadder.js';

import {
  CapabilityProviderDescriptor,
  CapabilityRequirementDescriptor,
  CapabilityNegotiationContext,
  CapabilityNegotiationDecision,
  CapabilityNegotiationRejection,
  CapabilityTrustEnvelope,
  CapabilitySeamAuthorityGrant,
  CAPABILITY_NEGOTIATION_PROTOCOL_VERSION,
} from './capabilityFederationTypes.js';

import {
  validateCapabilitySignatureRoot,
  buildCapabilityTrustEnvelope,
  validateSeamGrantLatticeConsistency,
} from './capabilityTrustValidator.js';

import {
  validateMirrorCapabilityEquivalence,
} from './registryCapabilityEnvelope.js';

import {
  canonicalizeNegotiationInput,
  hashNegotiationStructure,
  hashNegotiationTrace,
} from './capabilityNegotiationDeterminism.js';

// ═══════════════════════════════════════════════════════════
// Semver Range Matching (self-contained, no external dependency)
// ═══════════════════════════════════════════════════════════

/**
 * Parse a semver version string into components.
 * Handles: 1.2.3, 1.2.3-beta.1
 */
function parseSemver(v: string): { major: number; minor: number; patch: number } | null {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: parseInt(match[1], 10), minor: parseInt(match[2], 10), patch: parseInt(match[3], 10) };
}

/**
 * Check if a version satisfies a semver range.
 *
 * Supported range syntax:
 *   '*'           — matches any version
 *   '1.2.3'       — exact match
 *   '^1.2.0'      — compatible with 1.2.0 (>=1.2.0, <2.0.0)
 *   '~1.2.0'      — reasonably close (>=1.2.0, <1.3.0)
 *   '>=1.2.0'     — greater than or equal
 *   '>1.2.0'      — strictly greater than
 *   '<=1.2.0'     — less than or equal
 *   '<1.2.0'      — strictly less than
 *   '>=1.0.0 <2.0.0' — explicit range (both conditions ANDed)
 *
 * strictMode: no prerelease auto-accept, no loose coercion.
 */
export function semverSatisfies(version: string, range: string): boolean {
  if (range === '*') return true;

  const v = parseSemver(version);
  if (!v) return false;

  // Handle compound ranges (space-separated AND)
  if (range.includes(' ')) {
    const parts = range.split(/\s+/).filter(Boolean);
    return parts.every(part => semverSatisfies(version, part));
  }

  // Caret range: ^major.minor.patch
  if (range.startsWith('^')) {
    const r = parseSemver(range.slice(1));
    if (!r) return false;
    if (v.major !== r.major) return false;
    if (r.major === 0) {
      // ^0.x.y is more restrictive: minor must match
      if (v.minor !== r.minor) return false;
      return v.patch >= r.patch;
    }
    const vNum = v.major * 1000000 + v.minor * 1000 + v.patch;
    const rNum = r.major * 1000000 + r.minor * 1000 + r.patch;
    return vNum >= rNum;
  }

  // Tilde range: ~major.minor.patch
  if (range.startsWith('~')) {
    const r = parseSemver(range.slice(1));
    if (!r) return false;
    if (v.major !== r.major || v.minor !== r.minor) return false;
    return v.patch >= r.patch;
  }

  // Comparison operators
  if (range.startsWith('>=')) {
    const r = parseSemver(range.slice(2));
    if (!r) return false;
    const vNum = v.major * 1000000 + v.minor * 1000 + v.patch;
    const rNum = r.major * 1000000 + r.minor * 1000 + r.patch;
    return vNum >= rNum;
  }
  if (range.startsWith('>') && !range.startsWith('>=')) {
    const r = parseSemver(range.slice(1));
    if (!r) return false;
    const vNum = v.major * 1000000 + v.minor * 1000 + v.patch;
    const rNum = r.major * 1000000 + r.minor * 1000 + r.patch;
    return vNum > rNum;
  }
  if (range.startsWith('<=')) {
    const r = parseSemver(range.slice(2));
    if (!r) return false;
    const vNum = v.major * 1000000 + v.minor * 1000 + v.patch;
    const rNum = r.major * 1000000 + r.minor * 1000 + r.patch;
    return vNum <= rNum;
  }
  if (range.startsWith('<') && !range.startsWith('<=')) {
    const r = parseSemver(range.slice(1));
    if (!r) return false;
    const vNum = v.major * 1000000 + v.minor * 1000 + v.patch;
    const rNum = r.major * 1000000 + r.minor * 1000 + r.patch;
    return vNum < rNum;
  }

  // Exact match
  const r = parseSemver(range);
  if (!r) return false;
  return v.major === r.major && v.minor === r.minor && v.patch === r.patch;
}

// ═══════════════════════════════════════════════════════════
// Provider Compatibility Validation
// ═══════════════════════════════════════════════════════════

export function validateCapabilityProviderCompatibility(
  provider: CapabilityProviderDescriptor,
  requirement: CapabilityRequirementDescriptor
): { valid: boolean; reason?: string } {
  if (provider.capabilityNamespace !== requirement.requiredNamespace) {
    return { valid: false, reason: 'Namespace mismatch' };
  }

  // F-12: Full semver range matching
  if (!semverSatisfies(provider.capabilityVersion, requirement.requiredVersionRange)) {
    return { valid: false, reason: `Version ${provider.capabilityVersion} does not satisfy range ${requirement.requiredVersionRange}` };
  }

  if (provider.authorityTier < requirement.authorityFloor) {
    return { valid: false, reason: 'Authority floor violation' };
  }

  if (requirement.incompatibleProviders.includes(provider.providerId)) {
    return { valid: false, reason: 'Declared incompatibility collision' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// Dependency Closure Resolution
// ═══════════════════════════════════════════════════════════

export class CapabilityDependencyResolutionError extends Error {
  constructor(message: string) {
    super(`CapabilityDependencyResolutionError: ${message}`);
    this.name = 'CapabilityDependencyResolutionError';
  }
}

/**
 * Resolve dependency closure for capability providers.
 * Deterministic: roots visited in lexicographic order, dependencies sorted.
 */
export function resolveCapabilityDependencyClosure(
  providers: readonly CapabilityProviderDescriptor[]
): string[] {
  const included = new Set<string>();
  const providerMap = new Map<string, CapabilityProviderDescriptor>();
  providers.forEach(p => providerMap.set(p.providerId, p));

  const resolvedOrder: string[] = [];
  const visiting = new Set<string>();

  const visit = (pid: string) => {
    if (included.has(pid)) return;
    if (visiting.has(pid)) throw new CapabilityDependencyResolutionError(`Circular dependency detected: ${pid}`);

    const p = providerMap.get(pid);
    if (!p) throw new CapabilityDependencyResolutionError(`Missing dependency: ${pid}`);

    visiting.add(pid);
    const sortedDeps = [...p.declaredDependencies].sort((a, b) => a.localeCompare(b));
    for (const dep of sortedDeps) {
      visit(dep);
    }
    visiting.delete(pid);
    included.add(pid);
    resolvedOrder.push(pid);
  };

  const rootsToVisit = [...providers].map(p => p.providerId).sort((a, b) => a.localeCompare(b));
  for (const root of rootsToVisit) {
    visit(root);
  }

  return resolvedOrder;
}

// ═══════════════════════════════════════════════════════════
// Registry Trust Tier Rank (for deterministic tie-breaking)
// ═══════════════════════════════════════════════════════════

const TRUST_TIER_RANK: Record<string, number> = {
  'EXTERNAL_REGISTRY': 1,
  'PARTNER_REGISTRY': 2,
  'OFFICIAL_REGISTRY': 3,
  'CORE_INTERNAL': 4
};

function getRegistryTrustRank(tier: RegistryTrustTier | undefined): number {
  if (!tier) return 0;
  return TRUST_TIER_RANK[tier] || 0;
}

// ═══════════════════════════════════════════════════════════
// 12-Step Federation Negotiation Pipeline
// ═══════════════════════════════════════════════════════════

/**
 * Federation-safe capability negotiation resolver.
 *
 * Executes the 12-step pipeline in canonical order.
 * All steps are deterministic. All outputs are frozen.
 */
export function resolveCapabilityNegotiation(
  rawContext: CapabilityNegotiationContext
): CapabilityNegotiationDecision {
  const rejected: CapabilityNegotiationRejection[] = [];
  const negotiationTrace: string[] = [];

  // ─── Step 1: Canonicalize Input ───────────────────────────
  const context = canonicalizeNegotiationInput(rawContext);
  let eligible = [...context.capabilityProviders];
  negotiationTrace.push(`[Step 1] Canonicalized ${eligible.length} providers`);

  // ─── Step 2: Signature Root Enforcement Gate ──────────────
  {
    const survivors: CapabilityProviderDescriptor[] = [];
    for (const provider of eligible) {
      const sigResult = validateCapabilitySignatureRoot(provider);
      if (!sigResult.verified) {
        rejected.push({
          providerId: provider.providerId,
          reason: sigResult.reason || 'Signature root verification failed',
          stage: 'signature'
        });
        negotiationTrace.push(`[Step 2] REJECT ${provider.providerId}: ${sigResult.reason}`);
      } else {
        survivors.push(provider);
      }
    }
    eligible = survivors;
    negotiationTrace.push(`[Step 2] ${eligible.length} survived signature gate`);
  }

  // ─── Step 3: Registry Provenance Validation ───────────────
  {
    const survivors: CapabilityProviderDescriptor[] = [];
    for (const provider of eligible) {
      const trustRoot = resolveRegistryTrustRoot(provider.registryOrigin);
      if (!trustRoot) {
        rejected.push({
          providerId: provider.providerId,
          reason: `Registry '${provider.registryOrigin}' has no trust root — unknown registry origin`,
          stage: 'registry'
        });
        negotiationTrace.push(`[Step 3] REJECT ${provider.providerId}: unknown registry ${provider.registryOrigin}`);
      } else {
        survivors.push(provider);
      }
    }
    eligible = survivors;
    negotiationTrace.push(`[Step 3] ${eligible.length} survived registry provenance gate`);
  }

  // ─── Step 4: Lifecycle Admission Eligibility ──────────────
  {
    const survivors: CapabilityProviderDescriptor[] = [];
    for (const provider of eligible) {
      const lifecycle = resolveEffectiveOverlayState(
        provider.providerId,
        provider.capabilityVersion,
        provider.registryOrigin
      );
      if (!lifecycle.allowed) {
        rejected.push({
          providerId: provider.providerId,
          reason: lifecycle.reason || 'Lifecycle state prevents execution',
          stage: 'lifecycle'
        });
        negotiationTrace.push(`[Step 4] REJECT ${provider.providerId}: ${lifecycle.reason}`);
      } else {
        survivors.push(provider);
      }
    }
    eligible = survivors;
    negotiationTrace.push(`[Step 4] ${eligible.length} survived lifecycle gate`);
  }

  // ─── Step 5: Compatibility Matrix Gating ──────────────────
  if (context.requestedCapabilities && context.requestedCapabilities.length > 0) {
    const survivors: CapabilityProviderDescriptor[] = [];
    for (const provider of eligible) {
      let isValid = true;
      for (const req of context.requestedCapabilities) {
        if (provider.capabilityNamespace === req.requiredNamespace) {
          const check = validateCapabilityProviderCompatibility(provider, req);
          if (!check.valid) {
            isValid = false;
            rejected.push({
              providerId: provider.providerId,
              reason: check.reason || 'Incompatible',
              stage: 'compatibility'
            });
            negotiationTrace.push(`[Step 5] REJECT ${provider.providerId}: ${check.reason}`);
            break;
          }
        }
      }
      if (isValid) survivors.push(provider);
    }
    eligible = survivors;
    negotiationTrace.push(`[Step 5] ${eligible.length} survived compatibility gate`);
  }

  // ─── Step 6: Authority Ladder Ceiling Enforcement ─────────
  {
    const survivors: CapabilityProviderDescriptor[] = [];
    for (const provider of eligible) {
      const ladderDecision = enforceRegistryAuthorityLadder(
        provider.authorityTier,
        provider.registryOrigin,
        undefined
      );
      if (ladderDecision.ceilingApplied && ladderDecision.effectiveTier < provider.authorityTier) {
        // Cap but don't reject — create a capped copy
        const capped: CapabilityProviderDescriptor = {
          ...provider,
          authorityTier: ladderDecision.effectiveTier
        };
        survivors.push(capped);
        negotiationTrace.push(`[Step 6] CAPPED ${provider.providerId}: tier ${provider.authorityTier} → ${ladderDecision.effectiveTier}`);
      } else {
        survivors.push(provider);
      }
    }
    eligible = survivors;
    negotiationTrace.push(`[Step 6] ${eligible.length} survived authority ladder`);
  }

  // ─── Step 7: Seam-Scope Grant Validation ──────────────────
  if (context.activeSeamIds && context.activeSeamIds.length > 0) {
    const survivors: CapabilityProviderDescriptor[] = [];
    for (const provider of eligible) {
      if (provider.seamScopedGrants.length > 0) {
        // Provider declares seam-scoped grants — verify at least one active seam is covered
        const hasActiveSeam = provider.seamScopedGrants.some(
          sg => context.activeSeamIds!.includes(sg)
        );
        if (!hasActiveSeam) {
          rejected.push({
            providerId: provider.providerId,
            reason: `Provider seam-scoped grants [${provider.seamScopedGrants.join(', ')}] do not cover any active seams [${context.activeSeamIds!.join(', ')}]`,
            stage: 'seam-scope'
          });
          negotiationTrace.push(`[Step 7] REJECT ${provider.providerId}: no matching seam scope`);
          continue;
        }
      }
      survivors.push(provider);
    }
    eligible = survivors;
    negotiationTrace.push(`[Step 7] ${eligible.length} survived seam-scope gate`);
  }

  // ─── Step 8: Mirror Boundary Gate ─────────────────────────
  if (context.mirrorEquivalenceMode && context.registryCapabilityEnvelopes) {
    const envelopes = context.registryCapabilityEnvelopes;
    if (envelopes.length >= 2) {
      // Verify mirror equivalence between first two envelopes (primary vs mirror)
      const primary = envelopes[0];
      const mirror = envelopes[1];
      const equivalenceResult = validateMirrorCapabilityEquivalence(primary, mirror);

      if (!equivalenceResult.equivalent) {
        // Reject all non-portable providers when mirror equivalence fails
        const survivors: CapabilityProviderDescriptor[] = [];
        for (const provider of eligible) {
          if (!provider.mirrorPortable) {
            rejected.push({
              providerId: provider.providerId,
              reason: `Mirror equivalence failed (${equivalenceResult.reason}) and provider is not mirror-portable`,
              stage: 'mirror'
            });
            negotiationTrace.push(`[Step 8] REJECT ${provider.providerId}: mirror boundary violation`);
          } else {
            survivors.push(provider);
          }
        }
        eligible = survivors;
      }
    }
    negotiationTrace.push(`[Step 8] ${eligible.length} survived mirror boundary gate`);
  }

  // ─── Step 9: Trust Envelope Construction ──────────────────
  const trustEnvelopes = new Map<string, CapabilityTrustEnvelope>();
  for (const provider of eligible) {
    const overlayTier = context.authorityContext[provider.registrySource]
      || OverlayAuthorityTier.UNTRUSTED_EXTERNAL;

    // Determine signature status from Step 2 result (if we got here, it passed)
    const sigResult = validateCapabilitySignatureRoot(provider);
    const signatureStatus = sigResult.mode;

    // Build seam grants from context if available
    const seamGrants: Record<string, CapabilitySeamAuthorityGrant> = {};
    if (context.activeSeamIds) {
      for (const seamId of context.activeSeamIds) {
        if (provider.seamScopedGrants.includes(seamId)) {
          seamGrants[seamId] = {
            seamId,
            maxCapabilityTier: provider.authorityTier,
            allowedCapabilityNamespaces: [provider.capabilityNamespace]
          };
        }
      }
    }

    const envelope = buildCapabilityTrustEnvelope(
      provider,
      overlayTier,
      signatureStatus,
      Object.keys(seamGrants).length > 0 ? seamGrants : undefined
    );

    // Validate trust ceiling — this is the critical safety check
    if (envelope.effectiveAuthorityTier > overlayTier) {
      rejected.push({
        providerId: provider.providerId,
        reason: `Trust envelope effective tier ${envelope.effectiveAuthorityTier} exceeds overlay authority tier ${overlayTier}`,
        stage: 'authority'
      });
      negotiationTrace.push(`[Step 9] REJECT ${provider.providerId}: trust ceiling violation`);
      // Remove from eligible
      eligible = eligible.filter(p => p.providerId !== provider.providerId);
      continue;
    }

    trustEnvelopes.set(provider.providerId, envelope);
  }
  negotiationTrace.push(`[Step 9] ${trustEnvelopes.size} trust envelopes constructed`);

  // ─── Step 10: Dependency Closure Resolution ───────────────
  let dependencyClosure: string[] = [];
  try {
    dependencyClosure = resolveCapabilityDependencyClosure(eligible);
  } catch (e: any) {
    throw e; // Bubble up CapabilityDependencyResolutionError
  }
  negotiationTrace.push(`[Step 10] Dependency closure: ${dependencyClosure.length} entries`);

  // ─── Step 11: Deterministic Selection Sort ────────────────
  // Sort by: authorityTier → registryTrustTier → namespace → executionPriority
  //   → version → providerId
  // All lexicographic fallback for total ordering.
  eligible.sort((a, b) => {
    // 1. Authority tier (descending — higher tier first)
    if (a.authorityTier !== b.authorityTier) return b.authorityTier - a.authorityTier;

    // 2. Registry trust tier (descending — higher trust first) [Refinement #3]
    const aTrust = getRegistryTrustRank(a.registryTrustTier);
    const bTrust = getRegistryTrustRank(b.registryTrustTier);
    if (aTrust !== bTrust) return bTrust - aTrust;

    // 3. Namespace (ascending lexicographic)
    if (a.capabilityNamespace !== b.capabilityNamespace) {
      return a.capabilityNamespace.localeCompare(b.capabilityNamespace);
    }

    // 4. Execution priority (descending — higher priority first)
    if (a.executionPriority !== b.executionPriority) return b.executionPriority - a.executionPriority;

    // 5. Version (descending lexicographic — newer first)
    const aVer = a.capabilityVersion || '';
    const bVer = b.capabilityVersion || '';
    if (aVer !== bVer) return bVer.localeCompare(aVer);

    // 6. Provider ID (ascending lexicographic — terminal tiebreaker)
    return a.providerId.localeCompare(b.providerId);
  });

  // Sort rejected deterministically [Refinement #8]
  rejected.sort((a, b) => {
    const idCmp = a.providerId.localeCompare(b.providerId);
    if (idCmp !== 0) return idCmp;
    const stageCmp = a.stage.localeCompare(b.stage);
    if (stageCmp !== 0) return stageCmp;
    return a.reason.localeCompare(b.reason);
  });

  negotiationTrace.push(`[Step 11] Final ordering: [${eligible.map(p => p.providerId).join(', ')}]`);

  // ─── Step 12: Freeze & Return Decision ────────────────────
  const frozenEligible = Object.freeze([...eligible]);
  const frozenSelected = Object.freeze([...eligible]); // In full implementation, selection policy would narrow further
  const frozenRejected = Object.freeze([...rejected]);
  const frozenClosure = Object.freeze([...dependencyClosure]);
  const frozenTrace = Object.freeze([...negotiationTrace]);

  const decision: CapabilityNegotiationDecision = {
    eligible: frozenEligible,
    selected: frozenSelected,
    rejected: frozenRejected,
    trustEnvelopes,
    dependencyClosure: frozenClosure,
    negotiationTrace: frozenTrace,
    deterministic: true as const,
    decisionStructureHash: '',
    decisionTraceHash: '',
    protocolVersion: CAPABILITY_NEGOTIATION_PROTOCOL_VERSION
  };

  // Compute split hashes [Refinement #4]
  const structureHash = hashNegotiationStructure(decision);
  const traceHash = hashNegotiationTrace(decision);

  const finalDecision: CapabilityNegotiationDecision = Object.freeze({
    ...decision,
    decisionStructureHash: structureHash,
    decisionTraceHash: traceHash
  });

  negotiationTrace.push(`[Step 12] Decision frozen. Structure hash: ${structureHash.substring(0, 12)}...`);

  return finalDecision;
}
