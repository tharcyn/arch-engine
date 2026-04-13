export interface ResolverEdge {
  sourceNodeURI: string;
  targetNodeURI: string;
  relationship: string;
}

export interface PrecedenceNode {
  uri: string;

  tier:
    | 'lockfile'
    | 'registry_primary'
    | 'mirror'
    | 'cache';

  semverCandidate: string;

  pruneReason?:
    | 'version_mismatch'
    | 'namespace_mismatch'
    | 'lockfile_override'
    | 'mirror_unavailable'
    | 'trust_rejected'
    | 'protocol_incompatible';

  selectedBecause?: string;
}

export interface PrecedenceResolutionGraph {
  rootNamespace: string;
  nodes: PrecedenceNode[];
  edges: ResolverEdge[];
  resolutionResultNodeURI: string;
}
