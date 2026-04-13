/**
 * Read-only wrapper for Federation Diagnostics over CLI interfaces.
 * MUST NOT allow mutations or lifecycle resolutions directly.
 */
import { 
  inspectClosureIdentity, 
  inspectOverlayAdmission,
  inspectTrustRoot,
  inspectAuthorityResolutionTrace
} from '../transport/federationDiagnostics.js';
import { SnapshotEnvelope } from '../transport/types.js';

export class DiagnosticsFacade {
  
  explainTopology(envelope: SnapshotEnvelope) {
    return {
      status: 'Topology structure verified',
      closureIdentity: inspectClosureIdentity(envelope)
    };
  }

  explainProvenance(envelope: SnapshotEnvelope) {
    return inspectClosureIdentity(envelope);
  }

  explainReplayMismatch(delta: any) {
    return delta; // Pass through ReplayMismatchReport from core engine
  }

  explainAdmission(registryId: string) {
    return inspectOverlayAdmission(registryId);
  }

  explainTrustRoot(registryId: string) {
    return inspectTrustRoot(registryId);
  }

  explainOverlayEligibility(sourceId: string, version: string, registryId: string) {
    return import('../transport/federationDiagnostics.js').then(m => m.inspectOverlayEligibilityDecision(sourceId, version, registryId));
  }

  explainOverlayResolution(
    seamId: string, candidatesBefore: any[], strategy: string, candidatesAfter: any[], reasons: string[], 
    regPref: boolean, authPref: boolean, verPref: boolean, tieBreakerApplied: boolean = false, tieBreakerType: any = null,
    strategyInputsSummary: any = {}, strategyEliminationReasons: { overlayId: string, eliminationReason: string }[] = []
  ) {
    return import('../transport/federationDiagnostics.js').then(m => m.inspectOverlayResolutionDecision(
      seamId, candidatesBefore, strategy, candidatesAfter, reasons, regPref, authPref, verPref,
      tieBreakerApplied, tieBreakerType, strategyInputsSummary, strategyEliminationReasons
    ));
  }

  explainOverlayLifecycle(sourceId: string, version: string, registryId: string) {
    return import('../transport/federationDiagnostics.js').then(m => m.inspectOverlayLifecycleState(sourceId, version, registryId));
  }

  explainOverlayAdmission(request: any) {
    return import('../transport/federationDiagnostics.js').then(m => m.inspectOverlayAdmissionDecision(request));
  }

  explainOverlayCompatibility(record: any, v1: string, v2: string, cap: string[], active: string[]) {
    return import('../transport/federationDiagnostics.js').then(m => m.inspectOverlayCompatibilityDecision(record, v1, v2, cap, active));
  }

  explainOverlaySupersession(sourceId: string, version: string, registryId: string) {
    return import('../transport/federationDiagnostics.js').then(m => m.inspectOverlaySupersessionChain(sourceId, version, registryId));
  }

  explainCapabilityNegotiation(
    selectedProviders: any[],
    rejectedProviders: any[],
    rejectionReasons: string[],
    dependencyClosureSummary: string[],
    strategyName: string,
    trustEnvelopeSummaries: any[] = [],
    signatureValidationTrace: any[] = [],
    registryOriginTrace: any[] = [],
    authorityGrantScopeTrace: any[] = [],
    seamScopeTrace: any[] = []
  ) {
    return import('../transport/federationDiagnostics.js').then(m => m.inspectCapabilityNegotiationDecision(
        selectedProviders, rejectedProviders, rejectionReasons, dependencyClosureSummary, strategyName,
        trustEnvelopeSummaries, signatureValidationTrace, registryOriginTrace, authorityGrantScopeTrace, seamScopeTrace
    ));
  }
}
