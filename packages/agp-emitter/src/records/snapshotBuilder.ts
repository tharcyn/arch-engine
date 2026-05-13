/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — Snapshot builder
 * ═══════════════════════════════════════════════════════════
 *
 *  Builds the `snapshot.json` payload + envelope from the set of
 *  records. The `snapshotDigest` is computed AFTER the payload is
 *  finalised (excluding `emittedAt` and trust/evidence-plane
 *  records), then stamped into the outer envelope.
 *
 *  Per spec §11.5 the digest input projection is:
 *    1. drop snapshot.payload.emittedAt
 *    2. filter snapshot.payload.records[] to plane === "factual"
 *    3. JCS-canonicalise
 *    4. SHA-256
 */

import { computeSnapshotDigest } from '../hash.js';
import type {
  AgpRecord,
  AgpSnapshot,
  AgpSnapshotCounts,
  AgpSnapshotManifestEntry,
  SupportedArchEngineCommand,
} from '../types.js';

export interface BuildSnapshotArgs {
  readonly archEngineVersion: string;
  readonly sourceCommand: SupportedArchEngineCommand;
  readonly sourceExitCode: number;
  readonly sourceStatus: string;
  readonly emittedAt?: string;
  readonly records: ReadonlyArray<AgpRecord>;
  readonly summary?: Record<string, unknown>;
  readonly graphSurfaceHash?: string;
  readonly hasObservations: boolean;
  readonly hasPolicy: boolean;
}

export function buildSnapshot(args: BuildSnapshotArgs): AgpSnapshot {
  const manifest = buildManifest(args.records);
  const counts = buildCounts(args.records);

  const payload: Record<string, unknown> = {
    agpVersion: '1.0.0',
    schemaVersion: 'agp.snapshot.v1',
    archEngineVersion: args.archEngineVersion,
    sourceCommand: args.sourceCommand,
    sourceSchemaVersion: 'arch-engine.cli.v2',
    sourceExitCode: args.sourceExitCode,
    sourceStatus: args.sourceStatus,
    records: manifest,
    counts,
    canonicalization: {
      algorithm: 'rfc8785-jcs',
      encoding: 'utf-8',
      lineEnding: 'lf',
    },
    hashing: {
      recordPayload: 'b3',
      snapshotDigest: 'sha256',
    },
    featureGates: {
      observations: args.hasObservations,
      attestations: false,
      projections: false,
      policy: args.hasPolicy,
    },
  };

  if (args.summary !== undefined) {
    payload.summary = args.summary;
  }
  if (args.graphSurfaceHash !== undefined) {
    payload.graphSurfaceHash = ensureSha256Prefix(args.graphSurfaceHash);
  }
  if (args.emittedAt !== undefined) {
    payload.emittedAt = args.emittedAt;
  }

  // Compute digest over a projection that excludes emittedAt and
  // trust/evidence-plane records.
  const snapshotDigest = computeSnapshotDigest(payload);

  return {
    schemaVersion: 'agp.snapshot.v1',
    kind: 'agp.snapshot',
    snapshotDigest,
    payload: payload as AgpSnapshot['payload'],
  };
}

function buildManifest(
  records: ReadonlyArray<AgpRecord>,
): ReadonlyArray<AgpSnapshotManifestEntry> {
  return records.map((r) => ({
    id: r.id,
    family: r.family,
    kind: r.kind,
    plane: r.plane,
    payloadHash: r.payloadHash,
  }));
}

function buildCounts(records: ReadonlyArray<AgpRecord>): AgpSnapshotCounts {
  let nodes = 0;
  let edges = 0;
  let adapterEvidence = 0;
  let diagnostics = 0;
  let driftRecords = 0;
  let policyFindings = 0;
  let provenanceRecords = 0;
  let observationRecords = 0;
  let attestationRecords = 0;
  let factualRecords = 0;
  let evidenceRecords = 0;
  let trustRecords = 0;

  for (const r of records) {
    switch (r.family) {
      case 'node':              nodes++; break;
      case 'edge':              edges++; break;
      case 'adapter_evidence':  adapterEvidence++; break;
      case 'diagnostic':        diagnostics++; break;
      case 'drift':             driftRecords++; break;
      case 'policy_finding':    policyFindings++; break;
      case 'provenance':        provenanceRecords++; break;
      case 'observation':       observationRecords++; break;
      case 'attestation':       attestationRecords++; break;
    }
    switch (r.plane) {
      case 'factual':  factualRecords++; break;
      case 'evidence': evidenceRecords++; break;
      case 'trust':    trustRecords++; break;
    }
  }

  return {
    totalRecords: records.length,
    factualRecords,
    evidenceRecords,
    trustRecords,
    nodes,
    edges,
    adapterEvidence,
    diagnostics,
    driftRecords,
    policyFindings,
    provenanceRecords,
    observationRecords,
    attestationRecords,
  };
}

function ensureSha256Prefix(value: string): string {
  return value.startsWith('sha256:') ? value : `sha256:${value}`;
}
