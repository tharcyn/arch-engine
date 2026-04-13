export interface ResolvedPolicyCandidate {
  uri: string;
  version: string;
  namespace: string;
}

export interface ResolverTraceEvent {
  stepIndex: number;

  stage:
    | 'namespace_priority'
    | 'lockfile_read'
    | 'registry_lookup'
    | 'mirror_fallback'
    | 'semver_selection';

  decision: string;

  candidatePruned?: string[];

  pruneReason?:
    | 'version_mismatch'
    | 'namespace_mismatch'
    | 'lockfile_override'
    | 'mirror_unavailable'
    | 'trust_rejected'
    | 'protocol_incompatible';

  selectedBecause?: string;
}

export interface DeterministicResolverExplainTrace {
  policyURI: string;
  resolutionTimeline: ResolverTraceEvent[];
  selectedCandidate: ResolvedPolicyCandidate;
  lockfileOverrideEncountered: boolean;
  mirrorFallbackTriggered: boolean;
}

export interface RuntimeResolverTelemetry {
  trace: DeterministicResolverExplainTrace;
  durationMs: number;
  timestamp: number;
}
