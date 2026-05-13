/**
 * ═══════════════════════════════════════════════════════════
 *  Invalid-bundle tests (synthetic + schema-failure cases)
 * ═══════════════════════════════════════════════════════════
 *
 *  Constructs invalid bundles in-memory and verifies that:
 *    - missing snapshot.json / records.ndjson         → throws AgpVerifierError
 *    - bundle dir missing                             → throws AgpVerifierError
 *    - empty records.ndjson                           → invalid (parse)
 *    - unsupported agpVersion (`2.0.0`)               → unsupported_schema
 *    - unsupported record schemaVersion (`agp.record.v9`) → unsupported_schema
 *    - schema-level validation failure (extra field)  → invalid
 *    - id format invalid                              → invalid
 *    - plane invariant violated                       → invalid
 *
 *  These tests use the verifier programmatic API to construct
 *  bundle bags directly (no emitter dependency for invalid
 *  fixtures).
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { emitAgpBundle } from '@arch-engine/agp-emitter';
import {
  verifyAgpBundle,
  verifyAgpBundleDirectory,
  isAgpVerifierError,
  type AgpParsedBundle,
  type AgpRecord,
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

function loadValidBundle(): AgpParsedBundle {
  const raw = fs.readFileSync(path.join(EMITTER_FIXTURES, 'minimal-monorepo.json'));
  const parsed = JSON.parse(raw.toString('utf8'));
  const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
  return {
    snapshot: bundle.snapshot,
    records: bundle.records.map((r) => JSON.parse(JSON.stringify(r)) as AgpRecord),
    recordsRaw: bundle.records.map((r, i) => ({
      lineNumber: i + 1,
      line: JSON.stringify(r),
    })),
    snapshotJsonText: bundle.snapshotJson,
  };
}

describe('verifier — bundle path errors', () => {
  test('missing bundle directory throws AgpVerifierError BUNDLE_NOT_FOUND', () => {
    expect(() =>
      verifyAgpBundleDirectory({
        bundleDir: path.join(os.tmpdir(), 'agp-verifier-nonexistent-' + Date.now()),
      }),
    ).toThrowError(/BUNDLE_NOT_FOUND|not found/);
  });

  test('file path (not a directory) throws BUNDLE_NOT_DIRECTORY', () => {
    const f = path.join(os.tmpdir(), `agp-not-dir-${Date.now()}.txt`);
    fs.writeFileSync(f, 'hi');
    try {
      let captured: unknown;
      try {
        verifyAgpBundleDirectory({ bundleDir: f });
      } catch (e) {
        captured = e;
      }
      expect(isAgpVerifierError(captured)).toBe(true);
      expect((captured as { code: string }).code).toBe(
        'AGP_VERIFIER_BUNDLE_NOT_DIRECTORY',
      );
    } finally {
      fs.unlinkSync(f);
    }
  });

  test('directory missing snapshot.json throws SNAPSHOT_NOT_FOUND', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-verifier-nosnap-'));
    try {
      fs.writeFileSync(path.join(tmp, 'records.ndjson'), '');
      let captured: unknown;
      try {
        verifyAgpBundleDirectory({ bundleDir: tmp });
      } catch (e) {
        captured = e;
      }
      expect(isAgpVerifierError(captured)).toBe(true);
      expect((captured as { code: string }).code).toBe(
        'AGP_VERIFIER_SNAPSHOT_NOT_FOUND',
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('directory missing records.ndjson throws RECORDS_NOT_FOUND', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-verifier-norec-'));
    try {
      fs.writeFileSync(path.join(tmp, 'snapshot.json'), '{}');
      let captured: unknown;
      try {
        verifyAgpBundleDirectory({ bundleDir: tmp });
      } catch (e) {
        captured = e;
      }
      expect(isAgpVerifierError(captured)).toBe(true);
      expect((captured as { code: string }).code).toBe(
        'AGP_VERIFIER_RECORDS_NOT_FOUND',
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('malformed snapshot.json throws SNAPSHOT_PARSE_FAILED', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-verifier-badjson-'));
    try {
      fs.writeFileSync(path.join(tmp, 'snapshot.json'), '{ not-json ');
      fs.writeFileSync(path.join(tmp, 'records.ndjson'), '');
      let captured: unknown;
      try {
        verifyAgpBundleDirectory({ bundleDir: tmp });
      } catch (e) {
        captured = e;
      }
      expect(isAgpVerifierError(captured)).toBe(true);
      expect((captured as { code: string }).code).toBe(
        'AGP_VERIFIER_SNAPSHOT_PARSE_FAILED',
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('verifier — version gating', () => {
  test('unsupported agpVersion → unsupported_schema', () => {
    const bundle = loadValidBundle();
    bundle.snapshot = {
      ...bundle.snapshot,
      payload: { ...bundle.snapshot.payload, agpVersion: '2.0.0' },
    };
    const result = verifyAgpBundle({ bundle, options: { deterministic: true } });
    expect(result.verdict).toBe('unsupported_schema');
    expect(
      result.issues.some(
        (i) => i.code === 'AGP_VERIFIER_UNSUPPORTED_AGP_VERSION',
      ),
    ).toBe(true);
  });

  test('unsupported record schemaVersion → unsupported_schema', () => {
    const bundle = loadValidBundle();
    bundle.records = bundle.records.map((r, i) =>
      i === 0 ? { ...r, schemaVersion: 'agp.record.v9' } : r,
    );
    const result = verifyAgpBundle({ bundle, options: { deterministic: true } });
    expect(result.verdict).toBe('unsupported_schema');
    expect(
      result.issues.some(
        (i) => i.code === 'AGP_VERIFIER_UNSUPPORTED_SCHEMA_VERSION',
      ),
    ).toBe(true);
  });
});

describe('verifier — schema validation', () => {
  test('record envelope with unknown extra field → invalid / SCHEMA_VALIDATION_FAILED', () => {
    const bundle = loadValidBundle();
    bundle.records = bundle.records.map((r, i) =>
      i === 0 ? { ...r, somethingElse: 'oops' } : r,
    );
    const result = verifyAgpBundle({ bundle, options: { deterministic: true } });
    expect(['invalid', 'tampered']).toContain(result.verdict);
    // additionalProperties=false on record envelope → Ajv reports
    expect(
      result.issues.some(
        (i) => i.code === 'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED',
      ),
    ).toBe(true);
  });

  test('id format invalid → invalid / RECORD_ID_FORMAT_INVALID', () => {
    const bundle = loadValidBundle();
    bundle.records = bundle.records.map((r, i) =>
      i === 0 ? { ...r, id: 'not-an-agp-id' } : r,
    );
    const result = verifyAgpBundle({ bundle, options: { deterministic: true } });
    // Format check + schema check both fire; verdict invalid.
    expect(['invalid', 'tampered']).toContain(result.verdict);
    expect(
      result.issues.some(
        (i) =>
          i.code === 'AGP_VERIFIER_RECORD_ID_FORMAT_INVALID' ||
          i.code === 'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED',
      ),
    ).toBe(true);
  });

  test('plane invariant violated → invalid / PLANE_INVARIANT_FAILED', () => {
    const bundle = loadValidBundle();
    // Take a node (factual) and flip its plane to trust.
    bundle.records = bundle.records.map((r) =>
      r.family === 'node' ? { ...r, plane: 'trust' as const } : r,
    );
    const result = verifyAgpBundle({ bundle, options: { deterministic: true } });
    expect(['invalid', 'tampered']).toContain(result.verdict);
    expect(
      result.issues.some(
        (i) => i.code === 'AGP_VERIFIER_PLANE_INVARIANT_FAILED',
      ),
    ).toBe(true);
  });
});

describe('verifier — empty bundle', () => {
  test('records.ndjson empty → invalid / RECORD_PARSE_FAILED', () => {
    // Use minimal valid snapshot but pretend the record stream is
    // empty.
    const bundle = loadValidBundle();
    // Empty records but keep the manifest intact (so the bijection
    // check also fires).
    const empty: AgpParsedBundle = {
      snapshot: bundle.snapshot,
      records: [],
      recordsRaw: [],
      snapshotJsonText: bundle.snapshotJsonText,
    };
    const result = verifyAgpBundle({ bundle: empty, options: { deterministic: true } });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (i) => i.code === 'AGP_VERIFIER_RECORD_PARSE_FAILED',
      ),
    ).toBe(true);
  });
});
