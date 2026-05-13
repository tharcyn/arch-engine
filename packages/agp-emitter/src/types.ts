/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — Type Model
 * ═══════════════════════════════════════════════════════════
 *
 *  Two surfaces:
 *
 *  1. Arch-Engine JSON v2 input — structural type-only model.
 *     Validation happens in `validateInput.ts`; consumers should
 *     treat fields as best-effort until that pass succeeds.
 *
 *  2. AGP record/bundle output — locked by the v1 schemas in
 *     `docs/agp/schemas/v1/`.
 *
 *  All identity fields (`id`, `payloadHash`, `snapshotDigest`)
 *  are derived; consumers do not construct them by hand.
 */

// ─── Arch-Engine JSON v2 input shape (best-effort) ────────────

export type ArchEngineCommand = 'doctor' | 'inspect' | 'analyze' | 'check' | 'explain';

export type SupportedArchEngineCommand = 'inspect' | 'analyze' | 'check';

export interface ArchEngineDiagnosticInput {
  readonly code: string;
  readonly severity: string;
  readonly title?: string;
  readonly message: string;
  readonly fix?: string;
  readonly ciBlocking?: boolean;
  readonly details?: Record<string, unknown>;
  readonly docsHint?: string;
}

export interface ArchEngineCanonicalNode {
  readonly id: string;
  readonly type: string;
  readonly [extra: string]: unknown;
}

export interface ArchEngineCanonicalEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
  readonly [extra: string]: unknown;
}

export interface ArchEngineCanonicalTopology {
  readonly graphSurfaceVersion?: string;
  readonly graphSurfaceHash?: string;
  readonly nodes: ReadonlyArray<ArchEngineCanonicalNode>;
  readonly edges: ReadonlyArray<ArchEngineCanonicalEdge>;
}

export interface ArchEngineAdapterMetadata {
  readonly pnpm?: Record<string, unknown>;
  readonly yarnPnp?: Record<string, unknown>;
  readonly edges?: Record<string, { kind?: string; protocol?: string }>;
  readonly graphSurfaceHash?: string;
  readonly sourceFiles?: ReadonlyArray<string>;
  readonly [extra: string]: unknown;
}

export interface ArchEngineAdapter {
  readonly name: string;
  readonly version: string;
  readonly packageManager: string;
  readonly workspaceKind: string;
  readonly confidence: string;
  readonly reasons: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly alsoDetected: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
    readonly confidence: string;
    readonly reasons: ReadonlyArray<string>;
  }>;
  readonly metadata: ArchEngineAdapterMetadata;
}

export interface ArchEngineDriftViolation {
  readonly id: string;
  readonly ruleId?: string;
  readonly severity?: string;
  readonly code?: string;
  readonly edge?: { from: string; to: string; type: string };
}

export interface ArchEngineDriftSeverityChange {
  readonly id: string;
  readonly ruleId?: string;
  readonly from: string;
  readonly to: string;
}

export interface ArchEngineDriftSignal {
  readonly scoreDelta: number | null;
  readonly coverageDelta: number | null;
  readonly connectivityDelta: number | null;
  readonly confidenceDelta: number | null;
  readonly violationsDelta: number | null;
  readonly graphSurfaceHashChanged: boolean;
}

export interface ArchEngineDriftBlock {
  readonly baseline: {
    readonly path?: string;
    readonly schemaVersion?: string;
    readonly command?: string;
    readonly archEngineVersion?: string;
    readonly emittedAt?: string;
    readonly graphSurfaceHash?: string;
  };
  readonly summary: Record<string, unknown>;
  readonly topology: {
    readonly addedNodes: ReadonlyArray<ArchEngineCanonicalNode>;
    readonly removedNodes: ReadonlyArray<ArchEngineCanonicalNode>;
    readonly changedNodes: ReadonlyArray<ArchEngineCanonicalNode>;
    readonly addedEdges: ReadonlyArray<ArchEngineCanonicalEdge>;
    readonly removedEdges: ReadonlyArray<ArchEngineCanonicalEdge>;
    readonly changedEdges: ReadonlyArray<ArchEngineCanonicalEdge>;
  };
  readonly violations: {
    readonly new: ReadonlyArray<ArchEngineDriftViolation>;
    readonly resolved: ReadonlyArray<ArchEngineDriftViolation>;
    readonly persisted: ReadonlyArray<ArchEngineDriftViolation>;
    readonly severityChanged: ReadonlyArray<ArchEngineDriftSeverityChange>;
  };
  readonly signal: ArchEngineDriftSignal;
}

export interface ArchEnginePolicyViolation {
  readonly id: string;
  readonly ruleId?: string;
  readonly severity?: string;
  readonly ciBlocking?: boolean;
  readonly category?: string;
  readonly code?: string;
  readonly message?: string;
  readonly edge?: { from: string; to: string; type: string };
  readonly [extra: string]: unknown;
}

export interface ArchEngineJsonV2Envelope {
  readonly schemaVersion: string;
  readonly archEngineVersion: string;
  readonly command: string;
  readonly status: string;
  readonly exitCode: number;
  readonly emittedAt?: string;
  readonly summary?: Record<string, unknown>;
  readonly diagnostics?: ReadonlyArray<ArchEngineDiagnosticInput>;
  readonly artifacts?: ReadonlyArray<unknown>;
  readonly nextActions?: ReadonlyArray<string>;
  readonly data: {
    readonly topology?: { readonly canonical?: ArchEngineCanonicalTopology };
    readonly adapter?: ArchEngineAdapter;
    readonly drift?: ArchEngineDriftBlock;
    readonly violations?: ReadonlyArray<ArchEnginePolicyViolation>;
    readonly [extra: string]: unknown;
  };
  readonly [extra: string]: unknown;
}

// ─── AGP record output shape ──────────────────────────────────

export type AgpRecordFamily =
  | 'node'
  | 'edge'
  | 'adapter_evidence'
  | 'diagnostic'
  | 'drift'
  | 'policy_finding'
  | 'provenance'
  | 'observation'
  | 'attestation';

export type AgpPlane = 'factual' | 'evidence' | 'trust';

export interface AgpRecord {
  readonly schemaVersion: 'agp.record.v1';
  readonly family: AgpRecordFamily;
  readonly kind: string;
  readonly id: string;
  readonly plane: AgpPlane;
  readonly payloadHash: string;
  readonly payload: Record<string, unknown>;
}

export interface AgpSnapshotManifestEntry {
  readonly id: string;
  readonly family: AgpRecordFamily;
  readonly kind: string;
  readonly plane: AgpPlane;
  readonly payloadHash: string;
}

export interface AgpSnapshotCounts {
  readonly totalRecords: number;
  readonly factualRecords: number;
  readonly evidenceRecords: number;
  readonly trustRecords: number;
  readonly nodes: number;
  readonly edges: number;
  readonly adapterEvidence: number;
  readonly diagnostics: number;
  readonly driftRecords: number;
  readonly policyFindings: number;
  readonly provenanceRecords: number;
  readonly observationRecords: number;
  readonly attestationRecords: number;
}

export interface AgpSnapshot {
  readonly schemaVersion: 'agp.snapshot.v1';
  readonly kind: 'agp.snapshot';
  readonly snapshotDigest: string;
  readonly payload: {
    readonly agpVersion: '1.0.0';
    readonly schemaVersion: 'agp.snapshot.v1';
    readonly archEngineVersion: string;
    readonly sourceCommand: SupportedArchEngineCommand;
    readonly sourceSchemaVersion: 'arch-engine.cli.v2';
    readonly sourceExitCode: number;
    readonly sourceStatus: string;
    readonly emittedAt?: string;
    readonly records: ReadonlyArray<AgpSnapshotManifestEntry>;
    readonly counts: AgpSnapshotCounts;
    readonly summary?: Record<string, unknown>;
    readonly shapeHash?: { readonly algorithm: string; readonly value: string };
    readonly graphSurfaceHash?: string;
    readonly canonicalization: {
      readonly algorithm: 'rfc8785-jcs';
      readonly encoding: 'utf-8';
      readonly lineEnding: 'lf';
    };
    readonly hashing: {
      readonly recordPayload: 'b3';
      readonly snapshotDigest: 'sha256';
    };
    readonly featureGates: {
      readonly observations: boolean;
      readonly attestations: boolean;
      readonly projections: boolean;
      readonly policy: boolean;
    };
  };
}

export interface AgpBundleResult {
  readonly snapshot: AgpSnapshot;
  readonly records: ReadonlyArray<AgpRecord>;
  readonly snapshotJson: string;
  readonly recordsNdjson: string;
}

export interface AgpEmitterOptions {
  /**
   * When set, `emittedAt` is omitted (and therefore the snapshot
   * output is byte-stable across runs of the same input). Default
   * `false` for the CLI; tests use `true`.
   */
  readonly deterministic?: boolean;
  /**
   * Override `emittedAt` to a fixed ISO 8601 UTC string. Useful
   * for fixtures. Excluded from `snapshotDigest` either way.
   */
  readonly emittedAtOverride?: string;
  /**
   * Input absolute path (when reading from disk). Used only for
   * `provenance.inputDigest` computation; never written into the
   * bundle.
   */
  readonly inputDigestBytes?: Uint8Array;
}
