/**
 * ═══════════════════════════════════════════════════════════
 *  Tamper-detection tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Strategy: emit a valid bundle, mutate one piece, verify, and
 *  assert the expected verdict + issue codes.
 *
 *  Coverage matrix (spec §16.3 + conformance README):
 *
 *    1. payload-content tamper        → tampered / PAYLOAD_HASH_MISMATCH
 *    2. payloadHash tamper            → tampered / RECORD_ID_MISMATCH
 *    3. record removed from stream    → invalid  / MANIFEST_RECORD_MISSING
 *    4. record added to stream        → invalid  / RECORD_NOT_IN_MANIFEST
 *    5. snapshotDigest tamper         → tampered / SNAPSHOT_DIGEST_MISMATCH
 *    6. records.ndjson reordered      → invalid  / SORT_ORDER_INVALID
 *    7. absolute path injected        → invalid  / ABSOLUTE_PATH_LEAK
 *    8. b3: → sha1: in payloadHash    → invalid  / UNSUPPORTED_HASH_ALGORITHM
 *                                       (also surfaces hash mismatch)
 *    9. duplicate record id           → tampered / DUPLICATE_RECORD_ID
 *   10. manifest count fudged         → invalid  / COUNT_MISMATCH
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { emitAgpBundle } from '@arch-engine/agp-emitter';
import {
  verifyAgpBundle,
  type AgpRecord,
  type AgpParsedBundle,
} from '../src/index.js';

const EMITTER_FIXTURES = path.resolve(
  __dirname,
  '..',
  '..',
  'agp-emitter',
  'tests',
  'fixtures',
  'input',
);

function loadBundle(name = 'pnpm-workspace.json') {
  const raw = fs.readFileSync(path.join(EMITTER_FIXTURES, name));
  const parsed = JSON.parse(raw.toString('utf8'));
  return emitAgpBundle(parsed, raw, { deterministic: true });
}

function toParsedBundle(bundle: ReturnType<typeof emitAgpBundle>): AgpParsedBundle {
  return {
    snapshot: bundle.snapshot,
    // Clone records so callers can mutate without churning the emitter result.
    records: bundle.records.map((r) => JSON.parse(JSON.stringify(r)) as AgpRecord),
    recordsRaw: bundle.records.map((r, i) => ({
      lineNumber: i + 1,
      line: JSON.stringify(r),
    })),
    snapshotJsonText: bundle.snapshotJson,
  };
}

function findNode(b: AgpParsedBundle, predicate: (r: AgpRecord) => boolean): AgpRecord {
  const r = b.records.find(predicate);
  if (!r) throw new Error('record not found');
  return r;
}

describe('verifier — content tampering', () => {
  test('payload mutation → tampered / PAYLOAD_HASH_MISMATCH', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    // Mutate a node payload without updating hash.
    const node = findNode(parsed, (r) => r.family === 'node');
    const newPayload = { ...node.payload, attributes: { workspacePath: 'mutated/dir' } };
    parsed.records = parsed.records.map((r) =>
      r.id === node.id ? { ...r, payload: newPayload } : r,
    );
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    expect(result.verdict).toBe('tampered');
    expect(result.issues.some((i) => i.code === 'AGP_VERIFIER_PAYLOAD_HASH_MISMATCH')).toBe(true);
  });

  test('payloadHash tamper (and id stays old) → tampered / PAYLOAD_HASH_MISMATCH', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    const node = findNode(parsed, (r) => r.family === 'node');
    // Same hex length, recognisable mutation.
    const mutated =
      'b3:' + 'f'.repeat(64);
    parsed.records = parsed.records.map((r) =>
      r.id === node.id ? { ...r, payloadHash: mutated } : r,
    );
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    // The mutated payloadHash no longer matches the recomputed
    // payload hash → PAYLOAD_HASH_MISMATCH. The id is still the
    // old hash → RECORD_ID_MISMATCH (formula uses the *declared*
    // payloadHash). Both surface; verdict is tampered either way.
    expect(result.verdict).toBe('tampered');
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_PAYLOAD_HASH_MISMATCH'),
    ).toBe(true);
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_RECORD_ID_MISMATCH'),
    ).toBe(true);
  });

  test('snapshotDigest tamper → tampered / SNAPSHOT_DIGEST_MISMATCH', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    // Override embedded digest with a believable but wrong value.
    const wrong =
      'sha256:' + 'a'.repeat(64);
    parsed.snapshot = { ...parsed.snapshot, snapshotDigest: wrong };
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    expect(result.verdict).toBe('tampered');
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH'),
    ).toBe(true);
  });
});

describe('verifier — manifest / stream alterations', () => {
  test('record removed from stream → invalid / MANIFEST_RECORD_MISSING', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    // Drop a node record from the stream but keep it in the manifest.
    const node = findNode(parsed, (r) => r.family === 'node');
    parsed.records = parsed.records.filter((r) => r.id !== node.id);
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    expect(['invalid', 'tampered']).toContain(result.verdict);
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_MANIFEST_RECORD_MISSING'),
    ).toBe(true);
  });

  test('record added to stream but not in manifest → invalid / RECORD_NOT_IN_MANIFEST', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    // Synthesise a new node record with a valid envelope but
    // missing-from-manifest.
    const example = parsed.records.find((r) => r.family === 'node')!;
    const extra: AgpRecord = {
      ...JSON.parse(JSON.stringify(example)),
      // Use a different id to prove it's "extra".
      id:
        'agp:node:package:b3:' + 'd'.repeat(64),
      payloadHash: 'b3:' + 'd'.repeat(64),
      payload: { ...example.payload, nodeId: '@fake/extra' },
    };
    parsed.records = [...parsed.records, extra];
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    expect(['invalid', 'tampered']).toContain(result.verdict);
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_RECORD_NOT_IN_MANIFEST'),
    ).toBe(true);
  });

  test('duplicate record id → tampered / DUPLICATE_RECORD_ID', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    const dup = parsed.records[0]!;
    parsed.records = [dup, dup, ...parsed.records.slice(1)];
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    expect(result.verdict).toBe('tampered');
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_DUPLICATE_RECORD_ID'),
    ).toBe(true);
  });

  test('snapshot counts fudged → invalid / COUNT_MISMATCH', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    const newCounts = {
      ...parsed.snapshot.payload.counts,
      nodes: (parsed.snapshot.payload.counts.nodes ?? 0) + 7,
    };
    parsed.snapshot = {
      ...parsed.snapshot,
      payload: { ...parsed.snapshot.payload, counts: newCounts },
    };
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    // Tampering with counts also invalidates the projection over
    // which snapshotDigest was computed → SNAPSHOT_DIGEST_MISMATCH
    // is the dominant signal and verdict is `tampered`. COUNT_MISMATCH
    // is the explanatory issue. Both should be present.
    expect(['invalid', 'tampered']).toContain(result.verdict);
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_COUNT_MISMATCH'),
    ).toBe(true);
  });
});

describe('verifier — sort order alteration', () => {
  test('reorder records → invalid / SORT_ORDER_INVALID', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    if (parsed.records.length < 2) return; // not enough to reorder
    // Swap the first two records that have different (family, kind).
    let i = 1;
    while (
      i < parsed.records.length &&
      parsed.records[i]!.family === parsed.records[0]!.family &&
      parsed.records[i]!.kind === parsed.records[0]!.kind
    ) {
      i++;
    }
    if (i >= parsed.records.length) return;
    const reordered = [
      parsed.records[i]!,
      ...parsed.records.slice(0, i),
      ...parsed.records.slice(i + 1),
    ];
    parsed.records = reordered;
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    // Reordering a record before its sort position WILL trigger
    // SORT_ORDER_INVALID. The manifest still references all ids,
    // so verdict is `invalid`.
    expect(['invalid', 'tampered']).toContain(result.verdict);
    expect(
      result.issues.some((i2) => i2.code === 'AGP_VERIFIER_SORT_ORDER_INVALID'),
    ).toBe(true);
  });
});

describe('verifier — path / algorithm tampers', () => {
  test('absolute path injected → invalid / ABSOLUTE_PATH_LEAK', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    const node = findNode(parsed, (r) => r.family === 'node');
    const newPayload = {
      ...(node.payload as Record<string, unknown>),
      attributes: {
        ...((node.payload as Record<string, unknown>).attributes as Record<
          string,
          unknown
        >),
        workspacePath: '/Users/thaasyn/some/abs/path',
      },
    };
    parsed.records = parsed.records.map((r) =>
      r.id === node.id ? { ...r, payload: newPayload } : r,
    );
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    // Tamper also disturbs the payload hash → tampered dominates,
    // but the ABSOLUTE_PATH_LEAK MUST be present.
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_ABSOLUTE_PATH_LEAK'),
    ).toBe(true);
  });

  test('payloadHash prefix swapped to sha1: → invalid / UNSUPPORTED_HASH_ALGORITHM', () => {
    const bundle = loadBundle();
    const parsed = toParsedBundle(bundle);
    const node = findNode(parsed, (r) => r.family === 'node');
    const sha1Like = 'sha1:' + 'b'.repeat(40);
    parsed.records = parsed.records.map((r) =>
      r.id === node.id ? { ...r, payloadHash: sha1Like } : r,
    );
    const result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
    expect(['invalid', 'tampered']).toContain(result.verdict);
    expect(
      result.issues.some((i) => i.code === 'AGP_VERIFIER_UNSUPPORTED_HASH_ALGORITHM'),
    ).toBe(true);
  });
});
