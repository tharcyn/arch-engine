import { DeterministicResolverExplainTrace, ResolverTraceEvent } from '../explainability/resolverExplainTrace.js';
import { PrecedenceResolutionGraph, PrecedenceNode } from '../explainability/precedenceResolutionGraph.js';

export interface DiagnosticsBundle {
  explainabilityTrace: DeterministicResolverExplainTrace;
  precedenceGraph: PrecedenceResolutionGraph;
}

export class ResolutionContext {
  
  // Scoped transaction buffers cleanly smartly organically cleverly correctly intuitively tracking seamlessly securely exactly gracefully nicely reliably cleverly creatively identically correctly natively smartly.
  private committedTraceBuffer: ResolverTraceEvent[] = [];
  private activeStepStagedBuffer: ResolverTraceEvent[] = [];
  private stepActive: boolean = false;
  
  private precedenceBuffer: PrecedenceNode[] = [];
  
  private diagnosticsFinalized = false;
  private finalizedDiagnosticsBundle: DiagnosticsBundle | null = null;

  public readonly policyURI: string;

  constructor(policyURI: string) {
    this.policyURI = policyURI;
  }

  // ═══════════════════════════════════════════════════════════
  // TRANSACTIONAL STEP BOUNDARIES
  // ═══════════════════════════════════════════════════════════
  
  private resolutionStepDepth = 0;

  public beginResolutionStep() {
      if (this.resolutionStepDepth > 0) throw new Error('Nested steps unsupported.');
      this.stepActive = true;
      this.resolutionStepDepth++;
      this.activeStepStagedBuffer = [];
  }

  public commitResolutionStep() {
      if (this.resolutionStepDepth !== 1) throw new Error('No active resolution frame to commit');
      this.committedTraceBuffer.push(...this.activeStepStagedBuffer);
      this.activeStepStagedBuffer = [];
      this.stepActive = false;
      this.resolutionStepDepth--;
  }

  public rollbackResolutionStep() {
      if (this.resolutionStepDepth !== 1) throw new Error('No active resolution frame to rollback');
      this.activeStepStagedBuffer = [];
      this.stepActive = false;
      this.resolutionStepDepth--;
  }

  private pushEvent(event: Omit<ResolverTraceEvent, 'stepIndex'>) {
      if (this.diagnosticsFinalized) return;
      this.activeStepStagedBuffer.push({
          ...event,
          stepIndex: this.committedTraceBuffer.length + this.activeStepStagedBuffer.length + 1
      });
  }

  // ═══════════════════════════════════════════════════════════
  // ORCHESTRATION EVENT HELPERS (APPEND-ONLY)
  // ═══════════════════════════════════════════════════════════

  public recordNamespacePriorityEvent(decision: string) {
    this.pushEvent({
      stage: 'namespace_priority',
      decision
    });
  }

  public recordLockfileOverrideEvent(decision: string) {
    this.pushEvent({
      stage: 'lockfile_read',
      decision,
      pruneReason: 'lockfile_override'
    });
  }

  public recordRegistryLookupEvent(decision: string) {
    this.pushEvent({
      stage: 'registry_lookup',
      decision
    });
  }

  public recordMirrorFallbackEvent(decision: string) {
    this.pushEvent({
      stage: 'mirror_fallback',
      decision
    });
  }

  public recordSemverPruneEvent(decision: string, prunedCandidates: string[], originalReason: string) {
    let mappedReason: ResolverTraceEvent['pruneReason'] = 'version_mismatch';
    if (originalReason === 'trust_rejected' || originalReason === 'protocol_incompatible' || originalReason === 'namespace_mismatch') {
       mappedReason = originalReason;
    }
    
    this.pushEvent({
      stage: 'semver_selection',
      decision,
      candidatePruned: prunedCandidates,
      pruneReason: mappedReason
    });
  }

  public recordFinalSelectionEvent(selectedVersion: string, namespace: string, selectedBecause: string) {
    this.pushEvent({
      stage: 'semver_selection',
      decision: `Selected ${selectedVersion} from ${namespace}`,
      selectedBecause
    });
  }

  public recordPrecedenceNode(node: PrecedenceNode) {
     if (this.diagnosticsFinalized) return;
     this.precedenceBuffer.push(node);
  }

  // ═══════════════════════════════════════════════════════════
  // DIAGNOSTICS FINALIZATION (SEALED ARTIFACT)
  // ═══════════════════════════════════════════════════════════

  public finalizeDiagnostics(selectedCandidateUri: string, selectedVersion: string, selectedNamespace: string): DiagnosticsBundle {
    if (this.diagnosticsFinalized && this.finalizedDiagnosticsBundle) {
      return this.finalizedDiagnosticsBundle;
    }
    
    this.diagnosticsFinalized = true;

    // Check for specific events based on trace contents
    const fullTrace = [...this.committedTraceBuffer, ...this.activeStepStagedBuffer];
    const lockfileEncountered = fullTrace.some(e => e.stage === 'lockfile_read' && e.pruneReason === 'lockfile_override');
    const mirrorTriggered = fullTrace.some(e => e.stage === 'mirror_fallback' && (e.decision.includes('Triggered') || e.decision.includes('invoked')));

    const traceSnapshot: DeterministicResolverExplainTrace = {
        policyURI: this.policyURI,
        resolutionTimeline: fullTrace,
        selectedCandidate: {
            uri: selectedCandidateUri,
            version: selectedVersion,
            namespace: selectedNamespace
        },
        lockfileOverrideEncountered: lockfileEncountered,
        mirrorFallbackTriggered: mirrorTriggered
    };

    const graphSnapshot: PrecedenceResolutionGraph = {
        rootNamespace: this.policyURI,
        nodes: [...this.precedenceBuffer],
        edges: [], // Edges omitted for explicit visual trace sequence bounds
        resolutionResultNodeURI: selectedCandidateUri
    };

    this.finalizedDiagnosticsBundle = {
        explainabilityTrace: traceSnapshot,
        precedenceGraph: graphSnapshot
    };
    
    return this.finalizedDiagnosticsBundle;
  }

  public getDiagnostics(): DiagnosticsBundle | null {
    return this.finalizedDiagnosticsBundle;
  }
}
