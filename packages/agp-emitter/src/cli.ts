#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 *  agp-emit — Private CLI for @arch-engine/agp-emitter
 * ═══════════════════════════════════════════════════════════
 *
 *  Usage:
 *    agp-emit --from <report.json> --output <dir> [--force] [--deterministic]
 *
 *  Reads an Arch-Engine JSON v2 report and writes a deterministic
 *  AGP canonical bundle (snapshot.json + records.ndjson) into the
 *  output directory.
 *
 *  Exits:
 *    0  success
 *    2  invalid CLI args or input rejected by validator
 *    3  unexpected emitter error (internal)
 *
 *  No stack traces by default. Set DEBUG=arch-engine:agp to see
 *  internal traces.
 */

import { emitAgpBundleToDirectory } from './emitAgpBundleToDirectory.js';
import { AgpEmitterError, isAgpEmitterError } from './errors.js';

interface ParsedArgs {
  readonly from?: string;
  readonly output?: string;
  readonly force: boolean;
  readonly deterministic: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  const args = {
    from: undefined as string | undefined,
    output: undefined as string | undefined,
    force: false,
    deterministic: false,
    help: false,
    version: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--version' || a === '-v') args.version = true;
    else if (a === '--force') args.force = true;
    else if (a === '--deterministic') args.deterministic = true;
    else if (a === '--from') args.from = argv[++i];
    else if (a.startsWith('--from=')) args.from = a.slice('--from='.length);
    else if (a === '--output' || a === '--out') args.output = argv[++i];
    else if (a.startsWith('--output=')) args.output = a.slice('--output='.length);
    else if (a.startsWith('--out=')) args.output = a.slice('--out='.length);
    else if (!a.startsWith('-')) {
      // Positional ignored; emitter is flag-based.
    }
  }
  return args;
}

function printHelp(): void {
  const text = `agp-emit — private/experimental AGP canonical-bundle emitter

USAGE
  agp-emit --from <report.json> --output <dir> [--force] [--deterministic]

OPTIONS
  --from <path>        Arch-Engine JSON v2 report (inspect/analyze/check).
  --output <dir>       Output directory for snapshot.json + records.ndjson.
  --force              Overwrite a non-empty output directory.
  --deterministic      Omit emittedAt for byte-identical snapshot.json.
  --version            Print the emitter version.
  --help               Print this message.

NOTES
  - This binary is part of a private workspace package and is not
    published to npm. It is not wired into the main \`arch-engine\` CLI.
  - Only Arch-Engine JSON v2 envelopes are accepted. JSON v1 input is
    rejected with AGP_EMITTER_UNSUPPORTED_SCHEMA_VERSION.
  - The emitter never executes repository code or invokes package
    managers. It only reads the input file and writes the bundle.
`;
  process.stdout.write(text);
}

function printVersion(): void {
  process.stdout.write('@arch-engine/agp-emitter 0.1.0 (private)\n');
}

function emitError(err: unknown): void {
  if (isAgpEmitterError(err)) {
    const out = JSON.stringify(err.toJSON(), null, 2);
    process.stderr.write(out + '\n');
    return;
  }
  // Unknown error — print a minimal record without stack by default.
  const message = err instanceof Error ? err.message : String(err);
  const payload = {
    code: 'AGP_EMITTER_INTERNAL_ERROR',
    message,
  };
  process.stderr.write(JSON.stringify(payload, null, 2) + '\n');
  if (process.env.DEBUG?.includes('arch-engine:agp') && err instanceof Error) {
    process.stderr.write((err.stack ?? '') + '\n');
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

  if (!args.from) {
    emitError(
      new AgpEmitterError({
        code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
        message: 'Missing required --from <report.json> argument.',
        fix: 'Run: agp-emit --from <arch-engine-report.json> --output <dir>',
      }),
    );
    return 2;
  }
  if (!args.output) {
    emitError(
      new AgpEmitterError({
        code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
        message: 'Missing required --output <dir> argument.',
        fix: 'Run: agp-emit --from <arch-engine-report.json> --output <dir>',
      }),
    );
    return 2;
  }

  try {
    const result = emitAgpBundleToDirectory({
      inputPath: args.from,
      outputDir: args.output,
      options: {
        force: args.force,
        deterministic: args.deterministic,
      },
    });
    const summary = {
      ok: true,
      snapshotDigest: result.snapshot.snapshotDigest,
      snapshotPath: result.snapshotPath,
      recordsPath: result.recordsPath,
      counts: result.snapshot.payload.counts,
    };
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    return 0;
  } catch (err) {
    emitError(err);
    return isAgpEmitterError(err) ? 2 : 3;
  }
}

const exitCode = main(process.argv.slice(2));
process.exit(exitCode);
