/**
 * Diagnostics surfaces are observational only.
 * They MUST NOT participate in:
 * - authority resolution
 * - closure identity computation
 * - replay validation
 * - signature verification
 */

import { RegistryTrustRoot } from '../topology/registryTrustStore.js';
import { resolveHistoricalTrustRoot } from '../topology/registryTrustLifecycle.js';
import { SignatureVerificationMeta, resolveOverlayAuthority } from '../topology/overlayAuthorityResolver.js';
import { explainClosureIdentity, ProvenanceExplainReport } from './provenanceExplain.js';
import { SnapshotEnvelope } from './types.js';
import { RegistryTrustDomain, getRegistryTrustDomain } from '../topology/registryTrustDomains.js';

export function inspectTrustRoot(registryId: string): RegistryTrustRoot | undefined {
  return resolveHistoricalTrustRoot(registryId);
}

export function inspectRegistryTrustDomain(registryId: string): RegistryTrustDomain | undefined {
  return getRegistryTrustDomain(registryId);
}

export function inspectNamespaceOwnershipDecision(
  namespace: string,
  originRegistryId: string,
  effectiveRegistryId: string
) {
  // Wrap the call safely for external insight tools
  return import('../topology/overlayNamespaceOwnership.js').then(m => 
    m.validateNamespaceOwnership(namespace, originRegistryId, effectiveRegistryId)
  );
}

export function inspectAuthorityLadderDecision(
  declaredTier: number,
  originRegistryId: string
) {
  return import('../topology/registryAuthorityLadder.js').then(m => 
    m.enforceRegistryAuthorityLadder(declaredTier, originRegistryId, undefined)
  );
}

export function inspectOverlayEligibilityDecision(sourceId: string, version: string, registryId: string) {
  return import('../topology/overlayLifecycleState.js').then(m => m.resolveEffectiveOverlayState(sourceId, version, registryId));
}

/**
 * Resolution diagnostics MUST expose only deterministic decision metadata.
 * 
 * Diagnostics MUST NOT expose:
 * - iteration-order artifacts
 * - registry-arrival ordering metadata
 * - raw comparator internals
 * - candidate evaluation indexes from pre-normalized ordering
 * 
 * Resolution diagnostics MUST remain replay-stable.
 * Diagnostics MUST NOT include time-dependent metadata.
 * 
 * Diagnostic output ordering MUST remain deterministic.
 * Arrays exposed through diagnostics MUST NOT depend on:
 * - registry import order
 * - object iteration order
 * - transport discovery order
 * - mirror arrival order
 * 
 * Use lexical ordering or pipeline-order ordering only.
 */
export function inspectOverlayResolutionDecision(
  seamId: string,
  candidatesBeforeResolution: any[],
  strategyUsed: string,
  candidatesAfterResolution: any[],
  rejectionReasons: string[],
  registryTrustPreferenceApplied: boolean,
  authorityPreferenceApplied: boolean,
  versionPreferenceApplied: boolean,
  tieBreakerApplied: boolean = false,
  tieBreakerType: "namespace" | "overlayId" | "compatibility" | null = null,
  strategyInputsSummary: any = {},
  strategyEliminationReasons: { overlayId: string, eliminationReason: string }[] = []
) {
  let selectionConfidence = 'HIGH';
  if (candidatesAfterResolution.length > 1) {
      if (tieBreakerApplied && (tieBreakerType === 'namespace' || tieBreakerType === 'overlayId')) {
          selectionConfidence = 'LOW';
      } else {
          selectionConfidence = 'MEDIUM';
      }
  }

  return {
    seamId,
    strategyUsed,
    candidatesBeforeResolution,
    candidatesAfterResolution,
    rejectionReasons,
    registryTrustPreferenceApplied,
    authorityPreferenceApplied,
    versionPreferenceApplied,
    tieBreakerApplied,
    tieBreakerType,
    strategyInputsSummary,
    strategyEliminationReasons,
    selectionConfidence
  };
}

export function inspectOverlayLifecycleState(sourceId: string, version: string, registryId: string) {
  return import('../topology/overlayLifecycleState.js').then(m => m.getOverlayLifecycleState(sourceId, version, registryId));
}

export function inspectOverlayAdmissionDecision(request: any) {
  return import('../topology/overlayAdmissionWorkflow.js').then(m => m.validateOverlayAdmission(request, '9.9.9', '1.0', [], []));
}

export function inspectOverlayCompatibilityDecision(record: any, v1: string, v2: string, cap: string[], active: string[]) {
  return import('../topology/overlayCompatibilityMatrix.js').then(m => m.validateOverlayCompatibility(record, v1, v2, cap, active));
}

export function inspectOverlaySupersessionChain(sourceId: string, version: string, registryId: string) {
  return import('../topology/overlaySupersessionGraph.js').then(m => m.resolveSupersessionChain(sourceId, version, registryId));
}

export function inspectOverlayRevocationPropagation(sourceRegistryId: string, entry: any, activeMirrors: string[]) {
  return import('../topology/overlayRevocationList.js').then(m => m.propagateOverlayRevocation(sourceRegistryId, entry, activeMirrors));
}

export function inspectOverlaySignature(envelope: SnapshotEnvelope): SignatureVerificationMeta | undefined {
  // This surface just reveals the outcome bound onto the envelope indirectly through provenance,
  // but to truly "inspect" a signature conceptually via telemetry we check the run state.
  return undefined; 
}

export function inspectOverlayAdmission(registryId: string): any {
  // Observational diagnostic revealing registry ceilings
  return { registryId }; // Simplification for diagnostic facade
}

export function inspectClosureIdentity(envelope: SnapshotEnvelope): ProvenanceExplainReport | undefined {
  return explainClosureIdentity(envelope);
}

export function inspectMirrorFallbackDecision(envelope: SnapshotEnvelope): any {
  return {
    fallbackTriggered: false, // Active overlays are not currently explicitly serialized in F-7 envelopes 
    mirrorSourceIds: []
  };
}

export function inspectStackOrderingDeterminism(envelope: SnapshotEnvelope): any {
  return {
    deterministicSortKey: envelope.policyStackFingerprint,
    overlaysEvaluated: 0 // Placeholder until explicit overlay stack is serialized
  };
}

export function inspectAuthorityResolutionTrace(): any {
  return {
    trace: 'observational authority flow details'
  };
}

/**
 * F-12: Extended capability negotiation diagnostics.
 *
 * Diagnostics MUST NOT expose:
 *   - numeric authority tier values
 *   - capability arithmetic internals
 *   - trust envelope construction internals
 *
 * Diagnostics MUST expose:
 *   - provider selection trace
 *   - rejection reasons
 *   - signature-root validation status
 *   - registry-origin validation status
 *   - authority grant scope validation status
 */
export function inspectCapabilityNegotiationDecision(
  selectedProviders: any[],
  rejectedProviders: any[],
  rejectionReasons: string[],
  dependencyClosureSummary: string[],
  strategyApplied: string,
  trustEnvelopeSummaries: any[] = [],
  signatureValidationTrace: any[] = [],
  registryOriginTrace: any[] = [],
  authorityGrantScopeTrace: any[] = [],
  seamScopeTrace: any[] = []
) {
  return {
    selectedProviders,
    rejectedProviders,
    rejectionReasons,
    dependencyClosureSummary,
    strategyApplied,
    trustEnvelopeSummaries,
    signatureValidationTrace,
    registryOriginTrace,
    authorityGrantScopeTrace,
    seamScopeTrace
  };
}

