/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Output writer
 * ═══════════════════════════════════════════════════════════
 *
 *  Routes formatted output to either stdout or a file, per the
 *  `--output <path>` flag introduced in v1.1.0.
 *
 *  Rules (per docs/cli/json-v2-ci-flags-spec.md §8.4):
 *
 *  - `mkdir -p` parent directory.
 *  - Overwrite existing files (no `--no-overwrite` in v1.1.0).
 *  - UTF-8, no BOM.
 *  - LF (`\n`) line endings, regardless of host OS.
 *  - When writing to a file, ANSI escape sequences are stripped
 *    (files don't render color and a stray `^[[31m` would scare
 *    the user).
 *  - Trailing slash in path → exit 2 (handled in cli-options.ts).
 *  - Write failure (permission, disk full, etc.) → exit 2 with
 *    `ARCH_ENGINE_INVALID_CONFIG`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildDiagnostic,
  emitDiagnosticHuman,
  emitDiagnosticJson,
  exitCodeForDiagnostic,
} from './format-error.js';
import type { CliOutputOptions } from './cli-options.js';

/**
 * Strip ANSI escape sequences from a string. Used when writing
 * machine-output to a file.
 *
 * The regex matches the standard ANSI CSI sequences emitted by
 * picocolors and ChalkAlternatives. It does NOT match raw control
 * characters that aren't part of an escape (those are pass-through).
 */
export function stripAnsi(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Normalise line endings to LF.
 */
export function normalizeNewlines(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Write `content` to the configured destination (stdout or file)
 * for `options`. Handles ANSI stripping and parent-directory
 * creation. On write failure, emits a structured
 * `ARCH_ENGINE_INVALID_CONFIG` diagnostic and exits 2.
 *
 * For stdout, emits the content with `process.stdout.write` rather
 * than `console.log` so the renderer controls trailing newlines.
 *
 * Returns the absolute path written when `options.output` is set,
 * or `null` when writing to stdout.
 */
export function writeOutput(content: string, options: CliOutputOptions): string | null {
  if (options.output === undefined) {
    // Stdout — preserve content verbatim. Caller is responsible for
    // trailing newline.
    process.stdout.write(content);
    return null;
  }

  // File — strip ANSI, normalise newlines, ensure trailing newline.
  let payload = stripAnsi(content);
  payload = normalizeNewlines(payload);
  if (!payload.endsWith('\n')) {
    payload += '\n';
  }

  const absPath = path.isAbsolute(options.output)
    ? options.output
    : path.resolve(process.cwd(), options.output);

  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, payload, { encoding: 'utf8' });
  } catch (error) {
    const diagnostic = buildDiagnostic({
      code: 'ARCH_ENGINE_INVALID_CONFIG',
      title: 'Could not write --output file.',
      message:
        `Failed to write to "${options.output}": ${(error as Error).message}`,
      fix: 'Choose a writable path, or run with elevated permissions if the parent directory is read-only.',
    });
    if (options.json) {
      emitDiagnosticJson(diagnostic);
    } else {
      emitDiagnosticHuman(diagnostic, error);
    }
    process.exit(exitCodeForDiagnostic(diagnostic));
  }

  return absPath;
}

/**
 * Convenience: stdout-or-file emission with optional confirmation
 * line printed to stdout when `--output` is used in human/markdown
 * mode and `--quiet` is NOT set.
 *
 * The confirmation line is intentionally short and stable for CI
 * logs:  `Wrote <path>`. JSON mode never prints a confirmation
 * (machine output is never polluted with side-band info).
 */
export function emitFormattedOutput(
  content: string,
  options: CliOutputOptions,
): void {
  const written = writeOutput(content, options);

  if (written !== null && options.format !== 'json' && !options.quiet) {
    // Confirmation goes to stderr so stdout-piped tooling (e.g.
    // `arch-engine check --format markdown --output - 2>/dev/null`)
    // does not pick it up.
    const rel = relativeForDisplay(process.cwd(), written);
    process.stderr.write(`Wrote ${rel}\n`);
  }
}

/**
 * Helper: convert an absolute path to a repo-relative POSIX form
 * for display. Mirrors the v1.0.3 `toRepoRelative` helper but lives
 * in this module so it can be reused by every command.
 */
export function relativeForDisplay(cwd: string, absPath: string): string {
  const rel = path.relative(cwd, absPath);
  if (rel.startsWith('..')) {
    return `…/${path.basename(absPath)}`;
  }
  return rel.split(path.sep).join('/');
}

/**
 * Helper: full repo-relative POSIX form WITHOUT the `…` elision.
 * Used in `--ci` mode where the spec requires "full repo-relative
 * paths (no `…` elision)" so a CI log line is greppable.
 */
export function relativeForCi(cwd: string, absPath: string): string {
  const rel = path.relative(cwd, absPath);
  return rel.split(path.sep).join('/');
}

// ─── stdout capture (for human + --output) ──────────────────

let _capturedHumanChunks: string[] = [];
let _originalWrite: typeof process.stdout.write | null = null;
let _captureOptions: CliOutputOptions | null = null;

/**
 * If `--format human --output <path>` is in effect, install a
 * `process.stdout.write` interceptor that captures all human output
 * for later flushing to the file. `console.log` writes to
 * `process.stdout`, so this transparently captures every existing
 * command's render path without requiring per-command refactoring.
 *
 * Calling more than once is a no-op (the original write is captured
 * on the first call and reused).
 *
 * Installs an `exit` hook that flushes the buffer to the file before
 * the process actually exits — this handles `process.exit(...)` calls
 * from inside command code.
 */
export function installHumanCaptureIfNeeded(options: CliOutputOptions): void {
  if (options.format !== 'human' || options.output === undefined) return;
  if (_originalWrite) return;
  _captureOptions = options;
  _originalWrite = process.stdout.write.bind(process.stdout);
  _capturedHumanChunks = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stdout.write = ((
    chunk: any,
    encodingOrCb?: any,
    cb?: any,
  ): boolean => {
    let str: string;
    let callback: ((err?: Error | null) => void) | undefined = undefined;
    if (typeof chunk === 'string') {
      str = chunk;
      if (typeof encodingOrCb === 'function') callback = encodingOrCb;
      else if (typeof cb === 'function') callback = cb;
    } else {
      const encoding = typeof encodingOrCb === 'string' ? encodingOrCb : 'utf8';
      str = (chunk as Buffer).toString(encoding as BufferEncoding);
      if (typeof cb === 'function') callback = cb;
    }
    _capturedHumanChunks.push(str);
    if (callback) callback();
    return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  // Synchronous flush on exit. Node guarantees the `exit` event runs
  // synchronously before the process actually terminates.
  process.once('exit', flushHumanCapture);
}

/**
 * Flush the captured human output to the configured `--output` path
 * and restore the original `process.stdout.write`.
 *
 * Called automatically via the `exit` hook installed in
 * `installHumanCaptureIfNeeded`. Idempotent.
 */
function flushHumanCapture(): void {
  if (!_originalWrite || !_captureOptions) return;
  const content = _capturedHumanChunks.join('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stdout.write = _originalWrite as any;
  _originalWrite = null;
  const opts = _captureOptions;
  _captureOptions = null;
  _capturedHumanChunks = [];
  // Write to file (ANSI-stripped, LF normalised by writeOutput).
  writeOutput(content, opts);
  // Print confirmation line on stderr unless --quiet.
  if (!opts.quiet) {
    const rel = relativeForDisplay(process.cwd(), path.isAbsolute(opts.output!) ? opts.output! : path.resolve(process.cwd(), opts.output!));
    process.stderr.write(`Wrote ${rel}\n`);
  }
}
