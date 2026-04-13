/**
 * F-12: Capability Negotiation Determinism Certifier
 *
 * Provides:
 *   - Negotiation input canonicalization
 *   - Determinism certification (replay comparison)
 *   - Split decision hashing: decisionStructureHash + decisionTraceHash
 *
 * IDENTITY SAFETY:
 *   Determinism hashes are diagnostic metadata only.
 *   They MUST NOT participate in closure identity or fingerprint inputs.
 *
 * DETERMINISM GUARANTEES:
 *   - canonicalizeNegotiationInput() sorts all arrays lexicographically
 *   - hashNegotiationStructure() hashes selected providers + closure
 *   - hashNegotiationTrace() hashes diagnostics trace only
 *   - certifyNegotiationDeterminism() compares two runs
 */

import {
  CapabilityNegotiationContext,
  CapabilityNegotiationDecision,
  CapabilityProviderDescriptor,
  CapabilityRequirementDescriptor,
} from './capabilityFederationTypes.js';
import * as crypto from 'node:crypto';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';
import { binaryStringCompare } from '../utils/binaryStringCompare.js';

// ═══════════════════════════════════════════════════════════
// Input Canonicalization
// ═══════════════════════════════════════════════════════════

/**
 * Canonicalize negotiation input to eliminate transport/arrival ordering artifacts.
 *
 * All input arrays are sorted lexicographically by their identity key.
 * This ensures identical inputs produce identical negotiation results
 * regardless of registry mirror order, transport discovery order,
 * manifest ordering, or dependency resolution ordering.
 */
export function canonicalizeNegotiationInput(
  context: CapabilityNegotiationContext
): CapabilityNegotiationContext {
  const sortedProviders = [...context.capabilityProviders].sort(
    (a, b) => binaryStringCompare(a.providerId, b.providerId)
  );

  const sortedRequirements = [...context.requestedCapabilities].sort(
    (a, b) => binaryStringCompare(a.requiredNamespace, b.requiredNamespace)
  );

  const sortedOverlaySet = [...context.resolvedOverlaySet].sort(
    (a, b) => binaryStringCompare(a, b)
  );

  const sortedSeamIds = context.activeSeamIds
    ? [...context.activeSeamIds].sort((a, b) => binaryStringCompare(a, b))
    : undefined;

  return {
    ...context,
    resolvedOverlaySet: sortedOverlaySet,
    capabilityProviders: sortedProviders,
    requestedCapabilities: sortedRequirements,
    activeSeamIds: sortedSeamIds
  };
}

// ═══════════════════════════════════════════════════════════
// Decision Structure Hash
// ═══════════════════════════════════════════════════════════

/**
 * Compute deterministic hash of the negotiation decision structure.
 *
 * Covers:
 *   - Selected provider IDs (sorted)
 *   - Dependency closure (sorted)
 *   - Trust envelope keys and values (sorted)
 *
 * This hash captures the structural outcome — what was selected and why.
 */
export function hashNegotiationStructure(
  decision: Pick<CapabilityNegotiationDecision, 'selected' | 'dependencyClosure' | 'trustEnvelopes'>
): string {
  const selectedIds = decision.selected
    .map(p => p.providerId)
    .sort((a, b) => binaryStringCompare(a, b));

  const closure = [...decision.dependencyClosure]
    .sort((a, b) => binaryStringCompare(a, b));

  // Serialize trust envelope keys and effective tiers
  const envelopeEntries: Array<[string, number]> = [];
  decision.trustEnvelopes.forEach((envelope, key) => {
    envelopeEntries.push([key, envelope.effectiveAuthorityTier]);
  });
  envelopeEntries.sort((a, b) => binaryStringCompare(a[0], b[0]));

  const payload = stableCanonicalStringify({
    selectedIds,
    closure,
    envelopeEntries
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ═══════════════════════════════════════════════════════════
// Decision Trace Hash
// ═══════════════════════════════════════════════════════════

/**
 * Compute deterministic hash of the negotiation diagnostics trace.
 *
 * Covers:
 *   - Negotiation trace strings (sorted)
 *   - Rejected provider IDs, reasons, and stages (sorted)
 *
 * This hash captures the forensic trail — what was rejected and why.
 */
export function hashNegotiationTrace(
  decision: Pick<CapabilityNegotiationDecision, 'negotiationTrace' | 'rejected'>
): string {
  const trace = [...decision.negotiationTrace]
    .sort((a, b) => binaryStringCompare(a, b));

  // Sort rejected by providerId → stage → reason for deterministic ordering
  const rejections = [...decision.rejected]
    .sort((a, b) => {
      const idCmp = binaryStringCompare(a.providerId, b.providerId);
      if (idCmp !== 0) return idCmp;
      const stageCmp = binaryStringCompare(a.stage, b.stage);
      if (stageCmp !== 0) return stageCmp;
      return binaryStringCompare(a.reason, b.reason);
    })
    .map(r => ({ providerId: r.providerId, stage: r.stage, reason: r.reason }));

  const payload = stableCanonicalStringify({ trace, rejections });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ═══════════════════════════════════════════════════════════
// Determinism Certification
// ═══════════════════════════════════════════════════════════

export interface DeterminismCertificationResult {
  readonly deterministic: boolean;
  readonly structureHashMatch: boolean;
  readonly traceHashMatch: boolean;
  readonly structureHash1: string;
  readonly structureHash2: string;
  readonly traceHash1: string;
  readonly traceHash2: string;
}

/**
 * Certify that two negotiation runs produce identical results.
 *
 * Verifies both structural outcome (what was selected) and
 * forensic trace (what was rejected) are identical.
 */
export function certifyNegotiationDeterminism(
  result1: CapabilityNegotiationDecision,
  result2: CapabilityNegotiationDecision
): DeterminismCertificationResult {
  const structureHash1 = result1.decisionStructureHash;
  const structureHash2 = result2.decisionStructureHash;
  const traceHash1 = result1.decisionTraceHash;
  const traceHash2 = result2.decisionTraceHash;

  return {
    deterministic: structureHash1 === structureHash2 && traceHash1 === traceHash2,
    structureHashMatch: structureHash1 === structureHash2,
    traceHashMatch: traceHash1 === traceHash2,
    structureHash1,
    structureHash2,
    traceHash1,
    traceHash2
  };
}
