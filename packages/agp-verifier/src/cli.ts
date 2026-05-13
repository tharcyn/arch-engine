#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 *  agp-verify — Private CLI for @arch-engine/agp-verifier
 * ═══════════════════════════════════════════════════════════
 *
 *  Usage:
 *    agp-verify --bundle <dir>
 *    agp-verify --bundle <dir> --json
 *    agp-verify --bundle <dir> --strict
 *
 *  Reads <dir>/snapshot.json + <dir>/records.ndjson and runs the
 *  full verification pipeline. Returns a verdict to stdout (human
 *  or JSON) and exits with one of:
 *
 *    0  valid OR valid_with_warnings
 *    1  invalid OR tampered
 *    2  unsupported_schema OR usage error OR bundle path missing
 *    5  internal verifier error
 *
 *  No stack traces by default. Set DEBUG=arch-engine:agp to see
 *  internal traces.
 */

import { verifyAgpBundleDirectory } from './verifyAgpBundleDirectory.js';
import { AgpVerifierError, isAgpVerifierError } from './errors.js';
import type { AgpVerificationResult } from './types.js';

interface ParsedArgs {
  readonly bundle?: string;
  readonly json: boolean;
  readonly strict: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  const out = {
    bundle: undefined as string | undefined,
    json: false,
    strict: false,
    help: false,
    version: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--version' || a === '-v') out.version = true;
    else if (a === '--json') out.json = true;
    else if (a === '--strict') out.strict = true;
    else if (a === '--bundle') out.bundle = argv[++i];
    else if (a.startsWith('--bundle=')) out.bundle = a.slice('--bundle='.length);
    // Tolerate `--bundle-dir` and a few aliases for ergonomics.
    else if (a === '--bundle-dir' || a === '--dir') out.bundle = argv[++i];
  }
  return out;
}

function printHelp(): void {
  const text = `agp-verify — private/experimental AGP canonical-bundle verifier

USAGE
  agp-verify --bundle <dir> [--json] [--strict]

OPTIONS
  --bundle <dir>     Directory containing snapshot.json + records.ndjson.
  --json             Emit a single JSON object on stdout.
  --strict           valid_with_warnings exits 1 instead of 0.
  --version          Print the verifier version.
  --help             Print this message.

EXIT CODES
  0   valid OR valid_with_warnings (without --strict)
  1   invalid OR tampered
  2   unsupported_schema OR usage/bundle-path error
  5   internal verifier error

NOTES
  - This binary is part of a private workspace package and is not
    published to npm. It is not wired into the main \`arch-engine\` CLI.
  - The verifier never executes repository code, never opens
    network connections, and never mutates the bundle directory.
  - Set DEBUG=arch-engine:agp for internal stack traces.
`;
  process.stdout.write(text);
}

function printVersion(): void {
  process.stdout.write('@arch-engine/agp-verifier 0.1.0 (private)\n');
}

function emitError(err: unknown): void {
  if (isAgpVerifierError(err)) {
    process.stderr.write(JSON.stringify(err.toJSON(), null, 2) + '\n');
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  const payload = { code: 'AGP_VERIFIER_INTERNAL_ERROR', message };
  process.stderr.write(JSON.stringify(payload, null, 2) + '\n');
  if (process.env.DEBUG?.includes('arch-engine:agp') && err instanceof Error) {
    process.stderr.write((err.stack ?? '') + '\n');
  }
}

function formatHumanResult(result: AgpVerificationResult): string {
  const s = result.summary;
  const lines: string[] = [];
  lines.push('AGP bundle verification');
  lines.push('');
  lines.push(`Verdict:    ${result.verdict}`);
  lines.push(`Snapshot:   ${s.snapshotDigest || '(missing)'}`);
  lines.push(`AGP:        ${s.agpVersion || '(missing)'}`);
  lines.push(`Source cmd: ${s.sourceCommand || '(missing)'} (arch-engine ${s.archEngineVersion || '?'})`);
  lines.push(`Records:    ${s.totalRecords} (factual=${s.factualRecords}, evidence=${s.evidenceRecords}, trust=${s.trustRecords})`);

  const fams = Object.keys(s.families).sort();
  if (fams.length > 0) {
    lines.push(`Families:   ${fams.map((k) => `${k}=${s.families[k]}`).join(', ')}`);
  }
  lines.push(`Algorithms: payload=${s.algorithms.recordPayload}, snapshot=${s.algorithms.snapshotDigest}`);

  const errCheck = (count: number) => (count === 0 ? 'ok' : `${count} issue${count === 1 ? '' : 's'}`);
  const tCount = s.tamperIssueCount;
  const pCount = s.pathLeakCount;
  lines.push(`Checks:     schema ${errCheck(0)}, hashes ${tCount === 0 ? 'ok' : `${tCount} mismatch`}, manifest ok, paths ${errCheck(pCount)}`);

  if (result.issues.length > 0) {
    lines.push('');
    lines.push('Issues:');
    for (const issue of result.issues) {
      const sev = issue.severity.toUpperCase();
      const where = issue.recordId
        ? issue.recordId
        : issue.lineNumber !== undefined
          ? `records.ndjson:${issue.lineNumber}`
          : issue.path ?? 'snapshot';
      lines.push(`  [${sev}] ${issue.code} (${where}): ${issue.message}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function exitFromVerdict(result: AgpVerificationResult, strict: boolean): number {
  switch (result.verdict) {
    case 'valid':
      return 0;
    case 'valid_with_warnings':
      return strict ? 1 : 0;
    case 'invalid':
    case 'tampered':
      return 1;
    case 'unsupported_schema':
      return 2;
    default:
      return 5;
  }
}

function main(argv: ReadonlyArray<string>): number {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }
  if (args.version) {
    printVersion();
    return 0;
  }

  if (!args.bundle) {
    emitError(
      new AgpVerifierError({
        code: 'AGP_VERIFIER_BUNDLE_NOT_FOUND',
        message: 'Missing required --bundle <dir> argument.',
        fix: 'Run: agp-verify --bundle <agp-output-dir>',
      }),
    );
    return 2;
  }

  let result: AgpVerificationResult;
  try {
    result = verifyAgpBundleDirectory({
      bundleDir: args.bundle,
      options: {
        strict: args.strict,
      },
    });
  } catch (err) {
    emitError(err);
    if (isAgpVerifierError(err)) {
      // Bundle/IO errors → exit 2 (usage / input error), per spec.
      return 2;
    }
    return 5;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(formatHumanResult(result));
  }

  return exitFromVerdict(result, args.strict);
}

const exitCode = main(process.argv.slice(2));
process.exit(exitCode);
