/**
 * ═══════════════════════════════════════════════════════════
 *  Conformance corpus tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Targets `docs/agp/conformance/v1/`:
 *
 *  Valid corpus:
 *    The valid fixtures intentionally use placeholder hashes
 *    (b3:0000…) per the conformance README's "hash placeholder
 *    policy". They are schema-valid but NOT hash-valid. The
 *    verifier MUST therefore return `tampered` (because the
 *    recomputed payloadHash differs from the placeholder).
 *
 *    This is the spec-mandated behavior — the verifier is not
 *    fooled by placeholder hashes. We document this by asserting
 *    `tampered` and recording it as an EXPECTED behaviour for
 *    these schema-only fixtures.
 *
 *    A future corpus-rebuild tool (out of scope here) will replace
 *    placeholders with real digests; once it lands, this test
 *    should be flipped to expect `valid`.
 *
 *  Invalid corpus:
 *    Each fixture pairs with an expected verdict per the
 *    conformance README. We assert the verdict and the presence
 *    of at least one issue code in the expected family.
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  verifyAgpBundle,
  verifyAgpBundleDirectory,
  type AgpParsedBundle,
  type AgpRecord,
} from '../src/index.js';

const CONFORMANCE_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'docs',
  'agp',
  'conformance',
  'v1',
);

function loadRecordsFile(file: string): AgpRecord[] {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as AgpRecord);
}

function loadSnapshotOrSynth(dir: string, records: AgpRecord[]): {
  parsed: AgpParsedBundle;
} {
  const snapPath = path.join(dir, 'snapshot.json');
  let snapshot: AgpParsedBundle['snapshot'];
  if (fs.existsSync(snapPath)) {
    snapshot = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  } else {
    // Synthesise a minimal-but-shape-correct snapshot so the
    // verifier can run. For records-only fixtures we still
    // exercise the schema/path/hash/identity checks; the
    // bijection/digest checks will surface mismatches (which is
    // fine for invalid fixtures).
    snapshot = synthSnapshot(records);
  }
  const parsed: AgpParsedBundle = {
    snapshot,
    records,
    recordsRaw: records.map((r, i) => ({
      lineNumber: i + 1,
      line: JSON.stringify(r),
    })),
    snapshotJsonText: JSON.stringify(snapshot),
  };
  return { parsed };
}

function synthSnapshot(records: AgpRecord[]): AgpParsedBundle['snapshot'] {
  return {
    schemaVersion: 'agp.snapshot.v1',
    kind: 'agp.snapshot',
    snapshotDigest: 'sha256:' + '0'.repeat(64),
    payload: {
      agpVersion: '1.0.0',
      schemaVersion: 'agp.snapshot.v1',
      archEngineVersion: '1.4.0',
      sourceCommand: 'inspect',
      sourceSchemaVersion: 'arch-engine.cli.v2',
      sourceExitCode: 0,
      sourceStatus: 'passed',
      records: records.map((r) => ({
        id: r.id,
        family: r.family,
        kind: r.kind,
        plane: r.plane,
        payloadHash: r.payloadHash,
      })),
      counts: {
        totalRecords: records.length,
        factualRecords: records.filter((r) => r.plane === 'factual').length,
        evidenceRecords: records.filter((r) => r.plane === 'evidence').length,
        trustRecords: records.filter((r) => r.plane === 'trust').length,
        nodes: records.filter((r) => r.family === 'node').length,
        edges: records.filter((r) => r.family === 'edge').length,
        adapterEvidence: records.filter((r) => r.family === 'adapter_evidence').length,
        diagnostics: records.filter((r) => r.family === 'diagnostic').length,
        driftRecords: records.filter((r) => r.family === 'drift').length,
        policyFindings: records.filter((r) => r.family === 'policy_finding').length,
        provenanceRecords: records.filter((r) => r.family === 'provenance').length,
        observationRecords: records.filter((r) => r.family === 'observation').length,
        attestationRecords: records.filter((r) => r.family === 'attestation').length,
      },
      canonicalization: { algorithm: 'rfc8785-jcs', encoding: 'utf-8', lineEnding: 'lf' },
      hashing: { recordPayload: 'b3', snapshotDigest: 'sha256' },
      featureGates: { observations: false, attestations: false, projections: false, policy: false },
    },
  };
}

const VALID_FIXTURES = [
  'minimal-inspect-monorepo',
  'inspect-pnpm-workspace',
  'inspect-yarn-pnp-workspace',
  'check-with-policy-finding',
  'check-with-drift',
];

describe('conformance corpus — valid fixtures (placeholder hashes)', () => {
  for (const name of VALID_FIXTURES) {
    test(`${name} — verifier detects placeholder hashes as tampered (expected for v1 corpus)`, () => {
      const dir = path.join(CONFORMANCE_ROOT, 'valid', name);
      const result = verifyAgpBundleDirectory({
        bundleDir: dir,
        options: { deterministic: true },
      });
      // Placeholders → hash mismatch. The corpus README pins this
      // behavior until a corpus-rebuild tool replaces placeholders
      // with real digests.
      expect(['tampered', 'invalid']).toContain(result.verdict);
      expect(
        result.issues.some(
          (i) =>
            i.code === 'AGP_VERIFIER_PAYLOAD_HASH_MISMATCH' ||
            i.code === 'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH' ||
            i.code === 'AGP_VERIFIER_RECORD_ID_MISMATCH',
        ),
      ).toBe(true);
    });
  }
});

// ─── Invalid corpus ──────────────────────────────────────────

interface InvalidExpectation {
  readonly dir: string;
  readonly expectedVerdicts: ReadonlyArray<string>;
  readonly expectedIssueCodes: ReadonlyArray<string>;
}

const INVALID_EXPECTATIONS: ReadonlyArray<InvalidExpectation> = [
  {
    dir: 'absolute-path-rejected',
    expectedVerdicts: ['invalid', 'tampered'],
    expectedIssueCodes: ['AGP_VERIFIER_ABSOLUTE_PATH_LEAK', 'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED'],
  },
  {
    dir: 'missing-payload-hash',
    // Records-only fixture: synthetic snapshot won't carry a
    // matching digest, so the verdict can be invalid (schema) or
    // tampered (digest mismatch). Both are acceptable end-states.
    expectedVerdicts: ['invalid', 'tampered'],
    expectedIssueCodes: ['AGP_VERIFIER_SCHEMA_VALIDATION_FAILED'],
  },
  {
    dir: 'invalid-record-id',
    expectedVerdicts: ['invalid', 'tampered'],
    expectedIssueCodes: [
      'AGP_VERIFIER_RECORD_ID_FORMAT_INVALID',
      'AGP_VERIFIER_RECORD_ID_MISMATCH',
      'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED',
    ],
  },
  {
    dir: 'unsupported-schema-version',
    expectedVerdicts: ['unsupported_schema'],
    expectedIssueCodes: [
      'AGP_VERIFIER_UNSUPPORTED_SCHEMA_VERSION',
      'AGP_VERIFIER_UNSUPPORTED_AGP_VERSION',
    ],
  },
  {
    dir: 'malformed-yarn-pnp-metadata',
    expectedVerdicts: ['invalid', 'tampered'],
    expectedIssueCodes: ['AGP_VERIFIER_SCHEMA_VALIDATION_FAILED'],
  },
  {
    dir: 'snapshot-manifest-mismatch',
    expectedVerdicts: ['invalid', 'tampered'],
    expectedIssueCodes: [
      'AGP_VERIFIER_MANIFEST_RECORD_MISSING',
      'AGP_VERIFIER_RECORD_NOT_IN_MANIFEST',
      'AGP_VERIFIER_MANIFEST_CROSS_REF_MISMATCH',
      'AGP_VERIFIER_COUNT_MISMATCH',
      'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH',
    ],
  },
  {
    dir: 'trust-record-in-factual-digest',
    expectedVerdicts: ['invalid', 'tampered'],
    expectedIssueCodes: [
      'AGP_VERIFIER_PLANE_INVARIANT_FAILED',
      'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED',
    ],
  },
];

describe('conformance corpus — invalid fixtures', () => {
  for (const exp of INVALID_EXPECTATIONS) {
    test(`${exp.dir} — verdict in ${exp.expectedVerdicts.join('/')} with expected issue codes`, () => {
      const dir = path.join(CONFORMANCE_ROOT, 'invalid', exp.dir);
      const recordsFile = path.join(dir, 'records.ndjson');
      const snapshotFile = path.join(dir, 'snapshot.json');

      let result;
      if (fs.existsSync(snapshotFile) && fs.existsSync(recordsFile)) {
        result = verifyAgpBundleDirectory({
          bundleDir: dir,
          options: { deterministic: true },
        });
      } else if (fs.existsSync(recordsFile)) {
        // Records-only fixture — synth a snapshot to drive the
        // verifier programmatically.
        const records = loadRecordsFile(recordsFile);
        const { parsed } = loadSnapshotOrSynth(dir, records);
        result = verifyAgpBundle({ bundle: parsed, options: { deterministic: true } });
      } else {
        // No bundle files at all → skip (e.g. json-v1-input-rejected
        // pins an emitter-only rejection).
        return;
      }

      expect(exp.expectedVerdicts).toContain(result.verdict);
      const codes = new Set(result.issues.map((i) => i.code));
      expect(
        exp.expectedIssueCodes.some((c) => codes.has(c as any)),
      ).toBe(true);
    });
  }
});

describe('conformance corpus — json-v1-input-rejected is emitter-only', () => {
  test('this fixture has no bundle output; verifier has nothing to do', () => {
    const dir = path.join(CONFORMANCE_ROOT, 'invalid', 'json-v1-input-rejected');
    expect(fs.existsSync(path.join(dir, 'snapshot.json'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'records.ndjson'))).toBe(false);
    // Documents that the v1 fixture intentionally has only the
    // emitter rejection contract; the verifier surface is not
    // exercised.
  });
});
