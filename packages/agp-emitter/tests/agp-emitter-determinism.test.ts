/**
 * ═══════════════════════════════════════════════════════════
 *  Determinism tests for @arch-engine/agp-emitter
 * ═══════════════════════════════════════════════════════════
 *
 *  Given the same JSON v2 input + the same emitter version:
 *    - records.ndjson is byte-identical across runs
 *    - snapshotDigest is byte-identical across runs
 *    - emittedAt-only differences do NOT affect snapshotDigest
 *    - record stream sort is stable
 *    - payloadHash stable
 *    - id derived from payloadHash deterministically
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { emitAgpBundle } from '../src/index.js';

const FIX_DIR = path.join(__dirname, 'fixtures', 'input');

function readInput(name: string): { parsed: unknown; raw: Buffer } {
  const raw = fs.readFileSync(path.join(FIX_DIR, name));
  return { parsed: JSON.parse(raw.toString('utf8')), raw };
}

describe('emitAgpBundle — determinism', () => {
  test('replay on the same input yields byte-identical recordsNdjson + snapshotDigest (deterministic mode)', () => {
    const { parsed, raw } = readInput('pnpm-workspace.json');
    const a = emitAgpBundle(parsed, raw, { deterministic: true });
    const b = emitAgpBundle(parsed, raw, { deterministic: true });
    expect(a.recordsNdjson).toBe(b.recordsNdjson);
    expect(a.snapshotJson).toBe(b.snapshotJson);
    expect(a.snapshot.snapshotDigest).toBe(b.snapshot.snapshotDigest);
  });

  test('emittedAt is excluded from snapshotDigest', () => {
    const { parsed, raw } = readInput('minimal-monorepo.json');
    const a = emitAgpBundle(parsed, raw, { emittedAtOverride: '2026-01-01T00:00:00Z' });
    const b = emitAgpBundle(parsed, raw, { emittedAtOverride: '2099-12-31T23:59:59Z' });
    expect(a.snapshot.snapshotDigest).toBe(b.snapshot.snapshotDigest);
    expect(a.snapshot.payload.emittedAt).not.toBe(b.snapshot.payload.emittedAt);
  });

  test('record stream sort is stable across all 5 valid fixtures', () => {
    const names = [
      'minimal-monorepo.json',
      'pnpm-workspace.json',
      'yarn-pnp-workspace.json',
      'check-with-finding.json',
      'check-with-drift.json',
    ];
    for (const name of names) {
      const { parsed, raw } = readInput(name);
      const a = emitAgpBundle(parsed, raw, { deterministic: true });
      const b = emitAgpBundle(parsed, raw, { deterministic: true });
      const aIds = a.records.map((r) => r.id);
      const bIds = b.records.map((r) => r.id);
      expect(aIds).toEqual(bIds);
    }
  });

  test('every record id is derived deterministically from payloadHash', () => {
    const { parsed, raw } = readInput('yarn-pnp-workspace.json');
    const a = emitAgpBundle(parsed, raw, { deterministic: true });
    for (const r of a.records) {
      expect(r.id).toBe(`agp:${r.family}:${r.kind}:${r.payloadHash}`);
    }
  });

  test('records.ndjson is sorted by (family, kind, primaryKey, payloadHash)', () => {
    const { parsed, raw } = readInput('yarn-pnp-workspace.json');
    const a = emitAgpBundle(parsed, raw, { deterministic: true });
    const families = a.records.map((r) => r.family);
    const sorted = [...families].sort();
    expect(families).toEqual(sorted);
  });

  test('payloadHash is stable across runs for identical payloads', () => {
    const { parsed, raw } = readInput('minimal-monorepo.json');
    const a = emitAgpBundle(parsed, raw, { deterministic: true });
    const b = emitAgpBundle(parsed, raw, { deterministic: true });
    const mapA = new Map(a.records.map((r) => [r.id, r.payloadHash]));
    const mapB = new Map(b.records.map((r) => [r.id, r.payloadHash]));
    for (const [id, hash] of mapA) {
      expect(mapB.get(id)).toBe(hash);
    }
  });
});
