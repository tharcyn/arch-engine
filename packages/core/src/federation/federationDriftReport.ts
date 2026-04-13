export type DriftCategory =
  | 'policy_version'
  | 'dependency_closure'
  | 'adapter_capability'
  | 'topology_shape'
  | 'protocol_version'
  | 'hash_lineage';

export type DriftImpact =
  | 'replay_blocking'
  | 'explainability_only'
  | 'federation_warning'
  | 'security_sensitive';

export type DriftSeverity =
  | 'critical'
  | 'high'
  | 'warning';

export interface FederationDriftFinding {
  category: DriftCategory;
  impact: DriftImpact;
  severity: DriftSeverity;
  nodeURI?: string;
  description: string;
}

export interface FederationDriftReport {
  isValid: boolean;
  findings: FederationDriftFinding[];
}
