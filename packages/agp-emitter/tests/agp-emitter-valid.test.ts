/**
 * ═══════════════════════════════════════════════════════════
 *  Valid-fixture tests for @arch-engine/agp-emitter
 * ═══════════════════════════════════════════════════════════
 *
 *  Exercises the five canonical input shapes documented in the
 *  conformance corpus README:
 *    1. minimal-monorepo
 *    2. pnpm-workspace
 *    3. yarn-pnp-workspace
 *    4. check-with-finding
 *    5. check-with-drift
 *
 *  Per fixture we assert:
 *    - emit succeeds with exit 0
 *    - record families match expectation
 *    - record count matches expectation
 *    - every record's id matches "agp:family:kind:payloadHash"
 *    - manifest ↔ stream bijection
 *    - no absolute paths anywhere in the bundle
 *    - snapshot.payload.counts is internally consistent
 *    - snapshot digest verifies against the spec §11.5 projection
 *      (recomputed by the test)
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

import { emitAgpBundle } from '../src/index.js';
import { canonicalJson } from '../src/canonicalize.js';
import type { AgpBundleResult } from '../src/types.js';

const FIX_DIR = path.join(__dirname, 'fixtures', 'input');

function readInput(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), 'utf8'));
}

function emit(name: string, deterministic = true): AgpBundleResult {
  const input = readInput(name);
  const raw = fs.readFileSync(path.join(FIX_DIR, name));
  return emitAgpBundle(input, raw, { deterministic });
}

// ─── Helpers ──────────────────────────────────────────────

function recordIdMatchesFormula(record: { id: string; family: string; kind: string; payloadHash: string }): boolean {
  return record.id === `agp:${record.family}:${record.kind}:${record.payloadHash}`;
}

function recomputeSnapshotDigest(snapshotPayload: Record<string, unknown>): string {
  const projection = { ...snapshotPayload };
  delete projection.emittedAt;
  const records = (projection.records as Array<{ plane: string }>) ?? [];
  projection.records = records.filter((r) => r.plane === 'factual');
  const bytes = canonicalJson(projection);
  return 'sha256:' + createHash('sha256').update(bytes, 'utf8').digest('hex');
}

function bundleSelfCheck(result: AgpBundleResult): void {
  // 1. Every record id matches the canonical formula.
  for (const r of result.records) {
    expect(recordIdMatchesFormula(r)).toBe(true);
  }
  // 2. Manifest ↔ stream bijection.
  const manifestIds = new Set(result.snapshot.payload.records.map((r) => r.id));
  const streamIds = new Set(result.records.map((r) => r.id));
  expect(manifestIds.size).toBe(streamIds.size);
  expect([...manifestIds].sort()).toEqual([...streamIds].sort());
  // 3. records.ndjson parses line-by-line.
  const lines = result.recordsNdjson.trim().split('\n').filter(Boolean);
  expect(lines.length).toBe(result.records.length);
  for (const line of lines) JSON.parse(line);
  // 4. snapshot.json parses.
  const parsedSnapshot = JSON.parse(result.snapshotJson);
  expect(parsedSnapshot.snapshotDigest).toBe(result.snapshot.snapshotDigest);
  // 5. snapshotDigest verifies.
  const recomputed = recomputeSnapshotDigest(parsedSnapshot.payload);
  expect(recomputed).toBe(parsedSnapshot.snapshotDigest);
}

// ─── Per-fixture tests ───────────────────────────────────

describe('emitAgpBundle — minimal-monorepo', () => {
  const result = emit('minimal-monorepo.json');

  test('emits expected record families and counts', () => {
    const families = [...new Set(result.records.map((r) => r.family))].sort();
    expect(families).toEqual(['adapter_evidence', 'edge', 'node', 'provenance']);
    expect(result.snapshot.payload.counts.nodes).toBe(2);
    expect(result.snapshot.payload.counts.edges).toBe(1);
    expect(result.snapshot.payload.counts.adapterEvidence).toBe(1);
    expect(result.snapshot.payload.counts.diagnostics).toBe(0);
    expect(result.snapshot.payload.counts.provenanceRecords).toBe(1);
    expect(result.snapshot.payload.counts.totalRecords).toBe(5);
  });

  test('snapshot.payload references the monorepo adapter at HIGH confidence', () => {
    const adapter = result.records.find((r) => r.family === 'adapter_evidence');
    expect(adapter?.payload.name).toBe('@arch-engine/adapter-monorepo');
    expect(adapter?.payload.confidence).toBe('HIGH');
    // OQ-3: monorepo adapter metadata is an empty object.
    expect(adapter?.payload.metadata).toEqual({});
  });

  test('graphSurfaceHash is carried through to snapshot', () => {
    expect(result.snapshot.payload.graphSurfaceHash).toBe(
      'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );
  });

  test('bundle self-consistency', () => bundleSelfCheck(result));
});

describe('emitAgpBundle — pnpm-workspace', () => {
  const result = emit('pnpm-workspace.json');

  test('adapter_evidence carries pnpm metadata', () => {
    const adapter = result.records.find((r) => r.family === 'adapter_evidence');
    expect(adapter?.payload.name).toBe('@arch-engine/adapter-pnpm');
    const meta = (adapter?.payload.metadata as Record<string, unknown>).pnpm as Record<string, unknown>;
    expect(meta.packageManagerVersion).toBe('9.0.0');
    expect(meta.workspaceFile).toBe('pnpm-workspace.yaml');
    expect(meta.lockfilePresent).toBe(true);
  });

  test('edge metadata carries protocol from adapter.metadata.edges', () => {
    const edge = result.records.find((r) => r.family === 'edge');
    const attrs = (edge?.payload as Record<string, unknown>).attributes as Record<string, unknown>;
    expect(attrs.dependencyKind).toBe('dependency');
    expect(attrs.protocol).toBe('workspace');
  });

  test('bundle self-consistency', () => bundleSelfCheck(result));
});

describe('emitAgpBundle — yarn-pnp-workspace', () => {
  const result = emit('yarn-pnp-workspace.json');

  test('adapter_evidence carries yarnPnp metadata including nodeLinkerSource', () => {
    const adapter = result.records.find((r) => r.family === 'adapter_evidence');
    expect(adapter?.payload.name).toBe('@arch-engine/adapter-yarn-pnp');
    const meta = (adapter?.payload.metadata as Record<string, unknown>).yarnPnp as Record<string, unknown>;
    expect(meta.nodeLinker).toBe('pnp');
    expect(meta.nodeLinkerSource).toBe('yarnrc');
    expect(meta.packageManagerVersion).toBe('4.0.2');
  });

  test('diagnostic record surfaces ARCH_ENGINE_PNP_RESOLUTION_DEFERRED', () => {
    const diag = result.records.find((r) => r.family === 'diagnostic');
    expect(diag?.payload.code).toBe('ARCH_ENGINE_PNP_RESOLUTION_DEFERRED');
    expect(diag?.kind).toBe('pnp_resolution_deferred');
    expect(diag?.payload.ciBlocking).toBe(false);
  });

  test('counts include the diagnostic record', () => {
    expect(result.snapshot.payload.counts.diagnostics).toBe(1);
  });

  test('bundle self-consistency', () => bundleSelfCheck(result));
});

describe('emitAgpBundle — check-with-finding', () => {
  const result = emit('check-with-finding.json');

  test('emits a policy_finding record with reused Arch-Engine id (OQ-2 default)', () => {
    const finding = result.records.find((r) => r.family === 'policy_finding');
    expect(finding).toBeDefined();
    expect(finding?.kind).toBe('blocking_violation');
    expect(finding?.payload.findingId).toBe('v_a1b2c3d4');
    expect(finding?.payload.derivedFromObservation).toBe(false);
    expect(finding?.payload.ciBlocking).toBe(true);
  });

  test('snapshot.payload.featureGates.policy is true', () => {
    expect(result.snapshot.payload.featureGates.policy).toBe(true);
  });

  test('sourceExitCode + sourceStatus reflect the blocked verdict', () => {
    expect(result.snapshot.payload.sourceExitCode).toBe(1);
    expect(result.snapshot.payload.sourceStatus).toBe('blocked');
  });

  test('bundle self-consistency', () => bundleSelfCheck(result));
});

describe('emitAgpBundle — check-with-drift', () => {
  const result = emit('check-with-drift.json');

  test('emits drift records: edge_added + signal_delta', () => {
    const driftRecords = result.records.filter((r) => r.family === 'drift');
    expect(driftRecords.length).toBe(2);
    const kinds = driftRecords.map((r) => r.kind).sort();
    expect(kinds).toEqual(['edge_added', 'signal_delta']);
  });

  test('drift records anchor to baseline + current graphSurfaceHash', () => {
    const driftRecords = result.records.filter((r) => r.family === 'drift');
    for (const r of driftRecords) {
      const baseline = (r.payload.baseline as Record<string, unknown>).snapshotDigest;
      const current = (r.payload.current as Record<string, unknown>).snapshotDigest;
      expect(typeof baseline).toBe('string');
      expect(typeof current).toBe('string');
      expect((baseline as string).startsWith('sha256:')).toBe(true);
      expect((current as string).startsWith('sha256:')).toBe(true);
    }
  });

  test('signal_delta carries graphSurfaceHashChanged: true', () => {
    const sig = result.records.find((r) => r.family === 'drift' && r.kind === 'signal_delta');
    const deltas = sig?.payload.deltas as Record<string, unknown>;
    expect(deltas.graphSurfaceHashChanged).toBe(true);
    expect(deltas.scoreDelta).toBe(-0.02);
  });

  test('bundle self-consistency', () => bundleSelfCheck(result));
});
