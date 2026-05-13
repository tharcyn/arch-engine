/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — Type Model
 * ═══════════════════════════════════════════════════════════
 *
 *  Two surfaces:
 *
 *  1. Bundle input shape — best-effort structural typing of what
 *     a snapshot.json + records.ndjson pair looks like once parsed.
 *     The verifier validates these against the v1 JSON Schemas, so
 *     consumers should treat fields as best-effort until schema
 *     validation succeeds.
 *
 *  2. Verification result surface — verdicts, issues, summary.
 *
 *  The verifier does NOT import emitter types; its model is
 *  self-contained so a non-Arch-Engine consumer could swap the
 *  emitter and still verify against the AGP v1 protocol.
 */
import type { AgpVerifierIssueCode } from './errors.js';

// ─── AGP record / bundle structural model ─────────────────────

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
  readonly schemaVersion: string;
  readonly family: AgpRecordFamily;
  readonly kind: string;
  readonly id: string;
  readonly plane: AgpPlane;
  readonly payloadHash: string;
  readonly payload: Record<string, unknown>;
  readonly [extra: string]: unknown;
}

export interface AgpSnapshotManifestEntry {
  readonly id: string;
  readonly family: AgpRecordFamily;
  readonly kind: string;
  readonly plane: AgpPlane;
  readonly payloadHash: string;
  readonly [extra: string]: unknown;
}

export interface AgpSnapshotCounts {
  readonly totalRecords?: number;
  readonly factualRecords?: number;
  readonly evidenceRecords?: number;
  readonly trustRecords?: number;
  readonly nodes?: number;
  readonly edges?: number;
  readonly adapterEvidence?: number;
  readonly diagnostics?: number;
  readonly driftRecords?: number;
  readonly policyFindings?: number;
  readonly provenanceRecords?: number;
  readonly observationRecords?: number;
  readonly attestationRecords?: number;
  readonly [extra: string]: unknown;
}

export interface AgpSnapshot {
  readonly schemaVersion: string;
  readonly kind: string;
  readonly snapshotDigest: string;
  readonly payload: {
    readonly agpVersion: string;
    readonly schemaVersion: string;
    readonly archEngineVersion: string;
    readonly sourceCommand: string;
    readonly sourceSchemaVersion: string;
    readonly sourceExitCode: number;
    readonly sourceStatus: string;
    readonly emittedAt?: string;
    readonly records: ReadonlyArray<AgpSnapshotManifestEntry>;
    readonly counts: AgpSnapshotCounts;
    readonly summary?: Record<string, unknown>;
    readonly shapeHash?: { readonly algorithm: string; readonly value: string };
    readonly graphSurfaceHash?: string;
    readonly canonicalization?: {
      readonly algorithm: string;
      readonly encoding: string;
      readonly lineEnding: string;
    };
    readonly hashing?: {
      readonly recordPayload: string;
      readonly snapshotDigest: string;
    };
    readonly featureGates?: {
      readonly observations: boolean;
      readonly attestations: boolean;
      readonly projections: boolean;
      readonly policy: boolean;
    };
    readonly [extra: string]: unknown;
  };
  readonly [extra: string]: unknown;
}

// ─── Verification result surface ──────────────────────────────

export type AgpVerificationVerdict =
  | 'valid'
  | 'valid_with_warnings'
  | 'invalid'
  | 'unsupported_schema'
  | 'tampered';

export type AgpVerificationSeverity = 'error' | 'warning' | 'info';

export interface AgpVerificationIssue {
  readonly code: AgpVerifierIssueCode;
  readonly severity: AgpVerificationSeverity;
  readonly message: string;
  readonly fix?: string;
  readonly path?: string;
  readonly recordId?: string;
  readonly family?: AgpRecordFamily;
  readonly kind?: string;
  readonly lineNumber?: number;
  readonly observed?: unknown;
  readonly expected?: unknown;
}

export interface AgpVerificationSummary {
  readonly bundlePath?: string;
  readonly snapshotDigest: string;
  readonly schemaVersion: string;
  readonly agpVersion: string;
  readonly archEngineVersion: string;
  readonly sourceCommand: string;
  readonly totalRecords: number;
  readonly factualRecords: number;
  readonly evidenceRecords: number;
  readonly trustRecords: number;
  readonly manifestEntries: number;
  readonly families: Readonly<Record<string, number>>;
  readonly algorithms: {
    readonly recordPayload: string;
    readonly snapshotDigest: string;
  };
  readonly pathLeakCount: number;
  readonly tamperIssueCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface AgpVerificationResult {
  readonly verdict: AgpVerificationVerdict;
  readonly valid: boolean;
  readonly bundlePath?: string;
  readonly summary: AgpVerificationSummary;
  readonly issues: ReadonlyArray<AgpVerificationIssue>;
  readonly snapshotDigest: string;
  readonly checkedAt?: string;
}

// ─── Verifier options ─────────────────────────────────────────

export interface AgpVerifierOptions {
  /**
   * When set, only `valid` returns `valid: true`. When false,
   * `valid_with_warnings` also returns `valid: true`. Default `false`.
   */
  readonly strict?: boolean;
  /**
   * When set, suppress `checkedAt` and any other wall-clock field
   * from the verification result. Useful for fixture/test parity.
   */
  readonly deterministic?: boolean;
  /**
   * When set, warnings (e.g. missing attestation envelope) do NOT
   * downgrade to `valid_with_warnings`. Default `true` (warnings
   * count). Caller-controlled.
   */
  readonly allowWarnings?: boolean;
  /**
   * Optional override of the schemas directory. Defaults to the
   * in-repo `docs/agp/schemas/v1/` relative to the verifier
   * package, or whatever path is bundled with the dist.
   */
  readonly schemaRoot?: string;
}

// ─── Parsed-but-not-yet-verified bundle bag ───────────────────

export interface AgpParsedBundle {
  readonly snapshot: AgpSnapshot;
  readonly records: ReadonlyArray<AgpRecord>;
  readonly recordsRaw: ReadonlyArray<{ readonly lineNumber: number; readonly line: string }>;
  readonly snapshotJsonText: string;
}
