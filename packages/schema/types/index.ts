/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/schema — TypeScript Type Definitions
 * ═══════════════════════════════════════════════════════════
 *
 *  Canonical types derived from core.schema.json.
 *  These are the contract types consumed by all packages.
 */

// ─── Primitives ─────────────────────────────────────────

export type EdgeType =
  | 'reads_from'
  | 'writes_to'
  | 'invokes'
  | 'emits'
  | 'subscribes_to'
  | 'contracts_with'
  | 'consumes'
  | 'exposes'
  | 'uses_layout'
  | 'requires_permission'
  | 'requires_role'
  | 'redirects_to';

export type ConfidenceLevel =
  | 'ast_verified'
  | 'namespace_inferred'
  | 'runtime_verified'
  | 'manual_override'
  | 'heuristic';

export type VerificationLevel =
  | 'declared'
  | 'static_verified'
  | 'test_verified'
  | 'runtime_verified';

export type Severity =
  | 'BLOCKER'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFO';

export type GateStatus = 'passed' | 'triggered' | 'skipped' | 'not_applicable';

// ─── Core Structures ────────────────────────────────────

export interface Edge {
  target: string;
  type: EdgeType;
  confidence?: ConfidenceLevel;
}

export interface Entity {
  entity_id: string;
  type: string;
  qualified_name: string;
  file_path: string;
  edges?: Edge[];
  events_emitted?: string[];
  jobs_dispatched?: string[];
  models_touched?: string[];
  interfaces?: string[];
  traits?: string[];
  metadata?: Record<string, unknown>;
}

export interface Surface {
  entity_id?: string;
  identity: string;
  method: string;
  path: string;
  handler: string;
  handler_fqn?: string | null;
  handler_resolution?: string;
  action?: string;
  route_name?: string;
  edges?: Edge[];
}

export interface Contract {
  entity_id?: string;
  operation_id: string;
  endpoint: string;
  method: string;
  request_schema?: string;
  response_schema?: string;
  tags?: string[];
  internal?: boolean;
  deprecated?: boolean;
  edges?: Edge[];
}

// ─── Declared Truth Structures ──────────────────────────

export interface Authority {
  entity: string;
  owner: string[];
  allowed_writers?: string[];
  forbidden_writers?: string[];
  mutation_surfaces?: string[];
  is_mutation_authority?: boolean;
  protected_invariants?: string[];
}

export interface Invariant {
  id: string;
  name: string;
  owner?: string[];
  verification_level: VerificationLevel;
  blast_radius?: string;
  journeys?: string[];
  evidence?: {
    static?: string;
    test?: string[];
    runtime?: string;
  };
}

export interface Journey {
  name: string;
  controllers?: string[];
  services?: string[];
  events?: string[];
  jobs?: string[];
  tests?: string[];
  protected_invariants?: string[];
}

export interface Impact {
  entity: string;
  affected_domains?: string[];
  affected_journeys?: string[];
  affected_contracts?: string[];
  affected_invariants?: string[];
  affected_dependencies?: string[];
  blast_radius_hint?: string;
}

export interface Deployment {
  entity: string;
  depends_on?: string[];
  critical_path?: boolean;
}

export interface ContractParity {
  endpoint: string;
  status: string;
  notes?: string[];
}

export interface PeripheralSurface {
  namespace: string;
  group: string;
  controllers?: string[];
}

export interface EntityIndex {
  name: string;
  source?: string;
}

// ─── Telemetry & Enforcement ────────────────────────────

export interface TelemetryEntry {
  entity: string;
  entity_type?: string;
  file?: string;
  gate: string;
  status: GateStatus;
  reason?: string;
}

export interface Violation {
  gate: string;
  code?: string;
  entity: string;
  severity: Severity;
  message: string;
}

export interface RiskProfile {
  authority_owner: boolean;
  mutation_authority: boolean;
  protected_invariant: boolean;
  journey_bound: boolean;
  contract_bound: boolean;
  blast_radius: string;
  deployment_sensitive: boolean;
  dependency_direction_counts: Record<string, number>;
}

// ─── Traversal ──────────────────────────────────────────

export interface TraversalStep {
  step: number;
  entity: string;
  action: string;
  invariants_checked?: string[];
  edges_traversed?: Edge[];
}

export interface TraversalDefinition {
  name: string;
  entry_point: string;
  steps: TraversalStep[];
}

// ─── Engine Manifest ────────────────────────────────────

export interface EngineManifest {
  engine_version: string;
  schema_version: string;
  generated_at: string;
  adapters_used: string[];
  governance_packs: string[];
}

// ─── Raw Entity Facts (Adapter Output) ──────────────────

/**
 * Raw entity facts emitted by framework-specific scanners.
 * No identity computation — adapters emit only normalized observations.
 * The core engine assigns canonical entity_id values.
 */
export interface RawEntityFact {
  type: string;
  qualified_name: string;
  file_path: string;
  raw_imports: string[];
  events_emitted?: string[];
  jobs_dispatched?: string[];
  models_touched?: string[];
  interfaces?: string[];
  traits?: string[];
  routes_exposed?: string[];
  metadata?: Record<string, unknown>;
}
