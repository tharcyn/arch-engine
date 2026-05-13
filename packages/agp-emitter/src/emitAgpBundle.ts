/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — Programmatic emit API
 * ═══════════════════════════════════════════════════════════
 *
 *  Pure function: Arch-Engine JSON v2 envelope → AGP bundle.
 *  Does not touch the filesystem. Use `emitAgpBundleToDirectory`
 *  for the disk-writing wrapper.
 *
 *  Determinism: given the same input bytes and the same emitter
 *  version, the returned `recordsNdjson` is byte-identical. The
 *  `snapshotJson` is byte-identical except for `emittedAt`, which
 *  is excluded from `snapshotDigest`.
 *
 *  Drift anchor note (MVP): drift records carry a `current` anchor
 *  containing the input topology's `graphSurfaceHash` (a SHA-256
 *  digest). This avoids the circular dependency between drift
 *  record payloads and the bundle's own `snapshotDigest`. A future
 *  emitter version may compute a true bundle-self-reference once
 *  the verifier supports placeholder substitution.
 */

import { canonicalJson } from './canonicalize.js';
import { AgpEmitterError } from './errors.js';
import { sha256Hex } from './hash.js';
import { rejectAbsolutePathsIn } from './paths.js';
import {
  mapAdapterEvidenceRecord,
  mapDiagnosticRecords,
  mapDriftRecords,
  mapEdgeRecords,
  mapNodeRecords,
  mapPolicyFindingRecords,
  mapProvenanceRecord,
} from './records/recordMappers.js';
import { buildSnapshot } from './records/snapshotBuilder.js';
import { sortRecords } from './sort.js';
import type {
  AgpBundleResult,
  AgpEmitterOptions,
  AgpRecord,
  ArchEngineAdapter,
  ArchEngineJsonV2Envelope,
} from './types.js';
import { validateInputEnvelope } from './validateInput.js';

/**
 * Emit an AGP bundle from a parsed Arch-Engine JSON v2 envelope.
 * Does not touch the filesystem.
 */
export function emitAgpBundle(
  input: unknown,
  inputRawBytes: Uint8Array | string | undefined,
  options: AgpEmitterOptions = {},
): AgpBundleResult {
  const { envelope, command } = validateInputEnvelope(input);

  const inputDigest = computeInputDigest(envelope, inputRawBytes, options);

  const adapter = envelope.data.adapter;
  const adapterEdgeMeta = buildAdapterEdgeMap(adapter);

  const records: AgpRecord[] = [];

  // node + edge from canonical topology
  const canonical = envelope.data.topology!.canonical!;
  records.push(...mapNodeRecords(canonical.nodes, new Map()));
  records.push(...mapEdgeRecords(canonical.edges, adapterEdgeMeta));

  // adapter_evidence
  if (adapter) {
    records.push(mapAdapterEvidenceRecord(adapter));
  }

  // diagnostics
  const diagnostics = envelope.diagnostics ?? [];
  if (diagnostics.length > 0) {
    records.push(...mapDiagnosticRecords(diagnostics, command));
  }

  // drift — anchor `current` to the input's graphSurfaceHash (a
  // valid SHA-256 already present in the input). This avoids the
  // bundle-self-reference circular dependency.
  if (envelope.data.drift) {
    const currentAnchor = canonical.graphSurfaceHash
      ? ensureSha256Prefix(canonical.graphSurfaceHash)
      : SHA256_ZEROS;
    records.push(...mapDriftRecords(envelope.data.drift, currentAnchor));
  }

  // policy_finding
  const violations = envelope.data.violations ?? [];
  if (violations.length > 0) {
    records.push(...mapPolicyFindingRecords(violations, command));
  }

  // provenance (always exactly one)
  records.push(
    mapProvenanceRecord({
      command,
      archEngineVersion: envelope.archEngineVersion,
      inputDigest,
      inputCommand: command,
    }),
  );

  // Stable stream sort.
  const sortedRecords = sortRecords(records);

  // Final whole-bundle absolute-path scan on records.
  rejectAbsolutePathsIn(sortedRecords, 'generated AGP records');

  // emittedAt handling: deterministic mode → omit; otherwise stamp
  // wall-clock UTC with second precision (excluded from digest).
  const emittedAt =
    options.emittedAtOverride ??
    (options.deterministic === true
      ? undefined
      : nowIsoSeconds());

  const snapshot = buildSnapshot({
    archEngineVersion: envelope.archEngineVersion,
    sourceCommand: command,
    sourceExitCode: envelope.exitCode,
    sourceStatus: envelope.status,
    emittedAt,
    records: sortedRecords,
    summary: envelope.summary,
    graphSurfaceHash: canonical.graphSurfaceHash,
    hasObservations: sortedRecords.some((r) => r.family === 'observation'),
    hasPolicy: sortedRecords.some((r) => r.family === 'policy_finding'),
  });

  const snapshotJson = canonicalJson(snapshot) + '\n';
  const recordsNdjson =
    sortedRecords.length > 0
      ? sortedRecords.map((r) => canonicalJson(r)).join('\n') + '\n'
      : '';

  return {
    snapshot,
    records: sortedRecords,
    snapshotJson,
    recordsNdjson,
  };
}

function buildAdapterEdgeMap(
  adapter: ArchEngineAdapter | undefined,
): ReadonlyMap<string, { kind?: string; protocol?: string }> {
  const out = new Map<string, { kind?: string; protocol?: string }>();
  if (!adapter || !adapter.metadata) return out;
  const edges = adapter.metadata.edges;
  if (!edges || typeof edges !== 'object') return out;
  for (const [id, meta] of Object.entries(edges)) {
    if (meta && typeof meta === 'object') {
      const m = meta as Record<string, unknown>;
      out.set(id, {
        kind: typeof m.kind === 'string' ? m.kind : undefined,
        protocol: typeof m.protocol === 'string' ? m.protocol : undefined,
      });
    }
  }
  return out;
}

function computeInputDigest(
  envelope: ArchEngineJsonV2Envelope,
  rawBytes: Uint8Array | string | undefined,
  options: AgpEmitterOptions,
): string {
  if (options.inputDigestBytes !== undefined) {
    return sha256Hex(options.inputDigestBytes);
  }
  if (rawBytes !== undefined) {
    return sha256Hex(rawBytes);
  }
  // Deterministic surrogate when caller didn't preserve source
  // bytes: canonicalise the parsed envelope and hash that. Note
  // this may differ from the actual on-disk bytes for inputs
  // with non-canonical whitespace.
  return sha256Hex(canonicalJson(envelope));
}

function nowIsoSeconds(): string {
  // ISO 8601 UTC with second precision: 2026-05-13T12:34:56Z
  const d = new Date();
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const SHA256_ZEROS = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

function ensureSha256Prefix(value: string): string {
  return value.startsWith('sha256:') ? value : `sha256:${value}`;
}

export { AgpEmitterError };
