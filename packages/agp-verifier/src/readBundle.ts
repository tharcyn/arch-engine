/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — Bundle Reader
 * ═══════════════════════════════════════════════════════════
 *
 *  Reads:
 *    <bundleDir>/snapshot.json
 *    <bundleDir>/records.ndjson
 *
 *  Returns a parsed bundle bag plus per-line bookkeeping.
 *
 *  Errors:
 *    - missing path / not a directory             → AgpVerifierError
 *    - missing snapshot.json / records.ndjson     → AgpVerifierError
 *    - snapshot.json parse failure                → AgpVerifierError
 *
 *  Per-line record parse failures DO NOT throw; they are returned
 *  to the caller as issues so the result can still report partial
 *  detail (verdict: invalid).
 *
 *  Does NOT validate schemas, hashes, or any structural rules.
 *  That is the verifier's job. This module is purely the
 *  filesystem reader.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { AgpVerifierError } from './errors.js';
import type {
  AgpParsedBundle,
  AgpRecord,
  AgpSnapshot,
  AgpVerificationIssue,
} from './types.js';

export interface ReadBundleResult {
  readonly bundle?: AgpParsedBundle;
  readonly issues: ReadonlyArray<AgpVerificationIssue>;
  readonly snapshotPath: string;
  readonly recordsPath: string;
}

/**
 * Read a bundle directory. Throws on hard IO/parse failures so the
 * CLI can decide between exit codes 1 and 2; partial line-parse
 * issues are appended to `issues` and the function still returns
 * (verdict: invalid will be determined later).
 */
export function readBundleDirectory(bundleDir: string): ReadBundleResult {
  if (!fs.existsSync(bundleDir)) {
    throw new AgpVerifierError({
      code: 'AGP_VERIFIER_BUNDLE_NOT_FOUND',
      message: `Bundle directory not found: ${bundleDir}`,
      fix: 'Pass a path that points to an AGP bundle directory containing snapshot.json + records.ndjson.',
    });
  }
  const stat = fs.statSync(bundleDir);
  if (!stat.isDirectory()) {
    throw new AgpVerifierError({
      code: 'AGP_VERIFIER_BUNDLE_NOT_DIRECTORY',
      message: `Bundle path is not a directory: ${bundleDir}`,
      fix: 'Pass the directory that contains snapshot.json + records.ndjson, not a file.',
    });
  }

  const snapshotPath = path.join(bundleDir, 'snapshot.json');
  const recordsPath = path.join(bundleDir, 'records.ndjson');

  if (!fs.existsSync(snapshotPath)) {
    throw new AgpVerifierError({
      code: 'AGP_VERIFIER_SNAPSHOT_NOT_FOUND',
      message: `snapshot.json not found in ${bundleDir}`,
      fix: 'A canonical AGP bundle MUST contain snapshot.json. Re-emit the bundle.',
    });
  }
  if (!fs.existsSync(recordsPath)) {
    throw new AgpVerifierError({
      code: 'AGP_VERIFIER_RECORDS_NOT_FOUND',
      message: `records.ndjson not found in ${bundleDir}`,
      fix: 'A canonical AGP bundle MUST contain records.ndjson. Re-emit the bundle.',
    });
  }

  const snapshotJsonText = fs.readFileSync(snapshotPath, 'utf8');
  let snapshot: AgpSnapshot;
  try {
    snapshot = JSON.parse(snapshotJsonText) as AgpSnapshot;
  } catch (err) {
    throw new AgpVerifierError({
      code: 'AGP_VERIFIER_SNAPSHOT_PARSE_FAILED',
      message: `Failed to parse snapshot.json as JSON: ${(err as Error).message}`,
      fix: 'snapshot.json must be a single canonical JSON object.',
      details: { path: snapshotPath },
    });
  }

  const recordsText = fs.readFileSync(recordsPath, 'utf8');
  const lines = splitNdjsonLines(recordsText);

  const issues: AgpVerificationIssue[] = [];
  const records: AgpRecord[] = [];
  const recordsRaw: Array<{ lineNumber: number; line: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const lineNumber = i + 1;
    recordsRaw.push({ lineNumber, line: raw });
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      issues.push({
        code: 'AGP_VERIFIER_RECORD_PARSE_FAILED',
        severity: 'error',
        message: `Failed to parse records.ndjson line ${lineNumber}: ${(err as Error).message}`,
        fix: 'Each line of records.ndjson must be a single JCS-canonical JSON object.',
        lineNumber,
      });
      continue;
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      issues.push({
        code: 'AGP_VERIFIER_RECORD_PARSE_FAILED',
        severity: 'error',
        message: `records.ndjson line ${lineNumber} is not a JSON object`,
        lineNumber,
      });
      continue;
    }
    records.push(parsed as AgpRecord);
  }

  return {
    bundle: {
      snapshot,
      records,
      recordsRaw,
      snapshotJsonText,
    },
    issues,
    snapshotPath,
    recordsPath,
  };
}

/**
 * NDJSON splitter — supports LF and the trailing-newline pattern
 * the emitter writes. Empty trailing line is ignored; lines
 * containing only whitespace are also ignored (treat as empty
 * separator). Internal whitespace inside an object IS preserved.
 */
function splitNdjsonLines(text: string): string[] {
  if (text.length === 0) return [];
  const out: string[] = [];
  // Split on LF only; spec §6.4 locks LF as line terminator.
  const parts = text.split('\n');
  // Drop trailing empty string if the file ended with \n.
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (p.length === 0) continue;
    out.push(p);
  }
  return out;
}
