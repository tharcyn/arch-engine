/**
 * ═══════════════════════════════════════════════════════════
 *  Emitter → verifier interop smoke
 * ═══════════════════════════════════════════════════════════
 *
 *  Proves the protocol trust loop end-to-end:
 *
 *    arch-engine JSON v2
 *      → @arch-engine/agp-emitter
 *      → snapshot.json + records.ndjson
 *      → @arch-engine/agp-verifier
 *      → verdict (`valid` / `tampered`)
 *
 *  Smoke test sequence:
 *    1. Emit a real bundle from a JSON v2 fixture.
 *    2. Verify it via the programmatic API → expect `valid`.
 *    3. Round-trip through disk and re-verify → expect `valid`.
 *    4. Mutate the bundle and verify → expect `tampered`.
 *    5. Tamper a different way and verify → expect `tampered`/`invalid`.
 *
 *  This is a small but high-signal test: if the emitter or
 *  verifier ever drift on canonicalisation, hashing, or sort
 *  order, this case fails first.
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { emitAgpBundle } from '@arch-engine/agp-emitter';
import {
  verifyAgpBundle,
  verifyAgpBundleDirectory,
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

describe('emitter → verifier interop smoke', () => {
  test('emit + verify (programmatic) round-trip is valid', () => {
    const raw = fs.readFileSync(path.join(EMITTER_FIXTURES, 'yarn-pnp-workspace.json'));
    const parsed = JSON.parse(raw.toString('utf8'));
    const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
    const cloned: AgpParsedBundle = {
      snapshot: bundle.snapshot,
      records: bundle.records.map((r) => ({ ...r })),
      recordsRaw: bundle.records.map((r, i) => ({
        lineNumber: i + 1,
        line: JSON.stringify(r),
      })),
      snapshotJsonText: bundle.snapshotJson,
    };
    const result = verifyAgpBundle({ bundle: cloned, options: { deterministic: true } });
    expect(result.verdict).toBe('valid');
    expect(result.summary.snapshotDigest).toBe(bundle.snapshot.snapshotDigest);
  });

  test('disk round-trip: emit-to-dir → verifyAgpBundleDirectory → valid', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-interop-disk-'));
    try {
      const raw = fs.readFileSync(path.join(EMITTER_FIXTURES, 'check-with-finding.json'));
      const parsed = JSON.parse(raw.toString('utf8'));
      const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
      fs.writeFileSync(path.join(tmp, 'snapshot.json'), bundle.snapshotJson);
      fs.writeFileSync(path.join(tmp, 'records.ndjson'), bundle.recordsNdjson);

      const result = verifyAgpBundleDirectory({
        bundleDir: tmp,
        options: { deterministic: true },
      });
      expect(result.verdict).toBe('valid');
      expect(result.summary.bundlePath).toBe(tmp);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('disk tamper: mutate snapshotDigest → tampered', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-interop-tamper-'));
    try {
      const raw = fs.readFileSync(path.join(EMITTER_FIXTURES, 'minimal-monorepo.json'));
      const parsed = JSON.parse(raw.toString('utf8'));
      const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
      fs.writeFileSync(path.join(tmp, 'snapshot.json'), bundle.snapshotJson);
      fs.writeFileSync(path.join(tmp, 'records.ndjson'), bundle.recordsNdjson);

      // Mutate snapshot.json by changing the embedded digest.
      const snapText = fs.readFileSync(path.join(tmp, 'snapshot.json'), 'utf8');
      const mutated = snapText.replace(
        /"snapshotDigest":"sha256:[0-9a-f]{64}"/,
        `"snapshotDigest":"sha256:${'c'.repeat(64)}"`,
      );
      fs.writeFileSync(path.join(tmp, 'snapshot.json'), mutated);

      const result = verifyAgpBundleDirectory({
        bundleDir: tmp,
        options: { deterministic: true },
      });
      expect(result.verdict).toBe('tampered');
      expect(
        result.issues.some((i) => i.code === 'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH'),
      ).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('disk tamper: mutate a record payload on disk → tampered', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-interop-tamper2-'));
    try {
      const raw = fs.readFileSync(path.join(EMITTER_FIXTURES, 'pnpm-workspace.json'));
      const parsedJson = JSON.parse(raw.toString('utf8'));
      const bundle = emitAgpBundle(parsedJson, raw, { deterministic: true });
      fs.writeFileSync(path.join(tmp, 'snapshot.json'), bundle.snapshotJson);
      fs.writeFileSync(path.join(tmp, 'records.ndjson'), bundle.recordsNdjson);

      // Mutate the first node record's nodeId on disk WITHOUT updating its
      // payloadHash. Reads-then-writes the file content.
      const recPath = path.join(tmp, 'records.ndjson');
      const lines = fs
        .readFileSync(recPath, 'utf8')
        .split('\n')
        .filter((l) => l.length > 0);
      let mutated = false;
      const out = lines.map((line) => {
        if (mutated) return line;
        try {
          const r = JSON.parse(line) as AgpRecord;
          if (r.family === 'node') {
            const payload = { ...(r.payload as Record<string, unknown>), nodeId: '@TAMPERED' };
            mutated = true;
            return JSON.stringify({ ...r, payload });
          }
        } catch {
          /* ignore */
        }
        return line;
      });
      fs.writeFileSync(recPath, out.join('\n') + '\n');
      expect(mutated).toBe(true);

      const result = verifyAgpBundleDirectory({
        bundleDir: tmp,
        options: { deterministic: true },
      });
      expect(result.verdict).toBe('tampered');
      expect(
        result.issues.some((i) => i.code === 'AGP_VERIFIER_PAYLOAD_HASH_MISMATCH'),
      ).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
