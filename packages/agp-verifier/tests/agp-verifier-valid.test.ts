/**
 * ═══════════════════════════════════════════════════════════
 *  Valid-bundle verification tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Strategy: emit bundles from the emitter's own fixture inputs
 *  (real BLAKE3 / SHA-256 hashes), then verify them — exercising
 *  the full integrity loop end-to-end.
 *
 *  This is the canonical "valid" test path. The verifier returns
 *  `valid` and the result summary's count fields match the
 *  bundle's manifest.
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { emitAgpBundle } from '@arch-engine/agp-emitter';
import { verifyAgpBundle, readBundleDirectory } from '../src/index.js';

const EMITTER_FIXTURES = path.resolve(
  __dirname,
  '..',
  '..',
  'agp-emitter',
  'tests',
  'fixtures',
  'input',
);

function loadFixture(name: string) {
  const file = path.join(EMITTER_FIXTURES, name);
  const raw = fs.readFileSync(file);
  return { parsed: JSON.parse(raw.toString('utf8')), raw };
}

const FIXTURES = [
  'minimal-monorepo.json',
  'pnpm-workspace.json',
  'yarn-pnp-workspace.json',
  'check-with-finding.json',
  'check-with-drift.json',
] as const;

describe('verifyAgpBundle — valid bundles (emitter interop)', () => {
  for (const name of FIXTURES) {
    test(`emit → verify ${name} → verdict: valid`, () => {
      const { parsed, raw } = loadFixture(name);
      const bundle = emitAgpBundle(parsed, raw, { deterministic: true });

      const result = verifyAgpBundle({
        bundle: {
          snapshot: bundle.snapshot,
          records: bundle.records.map((r) => ({ ...r })),
          recordsRaw: bundle.records.map((r, i) => ({
            lineNumber: i + 1,
            line: JSON.stringify(r),
          })),
          snapshotJsonText: bundle.snapshotJson,
        },
        options: { deterministic: true },
      });

      if (result.verdict !== 'valid') {
        // Surface details to help debugging if a real regression hits.
        console.error(`Unexpected verdict for ${name}:`, result.verdict);
        console.error('Issues:', result.issues);
      }
      expect(result.verdict).toBe('valid');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.summary.totalRecords).toBe(bundle.records.length);
      expect(result.summary.snapshotDigest).toBe(bundle.snapshot.snapshotDigest);
      expect(result.summary.algorithms.recordPayload).toBe('b3');
      expect(result.summary.algorithms.snapshotDigest).toBe('sha256');
    });
  }
});

describe('verifyAgpBundleDirectory — valid bundles round-trip on disk', () => {
  for (const name of FIXTURES) {
    test(`emit-to-disk → readBundleDirectory → verify ${name}`, () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-verifier-valid-'));
      try {
        const { parsed, raw } = loadFixture(name);
        const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
        fs.writeFileSync(path.join(tmp, 'snapshot.json'), bundle.snapshotJson);
        fs.writeFileSync(path.join(tmp, 'records.ndjson'), bundle.recordsNdjson);

        const read = readBundleDirectory(tmp);
        expect(read.bundle).toBeDefined();
        expect(read.issues).toHaveLength(0);

        const result = verifyAgpBundle({
          bundle: read.bundle!,
          preIssues: read.issues,
          bundlePath: tmp,
          options: { deterministic: true },
        });
        expect(result.verdict).toBe('valid');
        expect(result.valid).toBe(true);
        expect(result.summary.manifestEntries).toBe(bundle.records.length);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  }
});

describe('verifyAgpBundle — strict + warning flag plumbing', () => {
  test('strict=true does not flip a valid bundle to invalid', () => {
    const { parsed, raw } = loadFixture('minimal-monorepo.json');
    const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
    const result = verifyAgpBundle({
      bundle: {
        snapshot: bundle.snapshot,
        records: bundle.records.map((r) => ({ ...r })),
        recordsRaw: bundle.records.map((r, i) => ({
          lineNumber: i + 1,
          line: JSON.stringify(r),
        })),
        snapshotJsonText: bundle.snapshotJson,
      },
      options: { strict: true, deterministic: true },
    });
    expect(result.verdict).toBe('valid');
    expect(result.valid).toBe(true);
  });
});
