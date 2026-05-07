/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Structured error renderer
 * ═══════════════════════════════════════════════════════════
 *
 *  Renders structured CLI diagnostics in the v1.0.3 human-output
 *  shape locked by `docs/cli/json-error-language-spec.md` §7.1:
 *
 *      Title
 *
 *      Problem:
 *        ...
 *
 *      Fix:
 *        ...
 *
 *      Exit N:
 *        ...
 *
 *      (Docs: https://arch-engine.dev/...)
 *
 *  And carries the same structured data into JSON `diagnostics[]`
 *  arrays per spec §8.8.
 *
 *  Stack traces are HIDDEN by default. They surface only when
 *  `process.env.DEBUG` is set and contains `arch-engine` —
 *  matching the existing v1.0.x policy that this module
 *  documents and centralises.
 */

import pc from 'picocolors';
import {
  type ArchEngineErrorCode,
  type ArchEngineErrorMetadata,
  type ArchEngineSeverity,
  type ArchEngineExitCode,
  getArchEngineErrorMetadata,
} from './error-codes.js';

/**
 * The structured JSON shape that lands in `diagnostics[]`
 * arrays on every command's --json output, per spec §8.8.
 */
export interface CliDiagnostic {
  readonly code: ArchEngineErrorCode;
  readonly severity: ArchEngineSeverity;
  readonly title: string;
  readonly message: string;
  readonly fix?: string;
  readonly ciBlocking: boolean;
  readonly path?: string;
  readonly details?: Record<string, unknown>;
  readonly docsHint?: string;
}

/**
 * Build a CliDiagnostic from a code plus runtime context.
 *
 * `message` is a one-paragraph plain-English explanation
 * tailored to the specific occurrence (e.g. the actual missing
 * adapter name, the actual unsupported workspace type). The
 * default Title and Fix come from the metadata table; either
 * can be overridden when more specific wording helps.
 */
export interface BuildDiagnosticInput {
  readonly code: ArchEngineErrorCode;
  readonly message: string;
  readonly fix?: string;
  readonly title?: string;
  readonly path?: string;
  readonly details?: Record<string, unknown>;
}

export function buildDiagnostic(input: BuildDiagnosticInput): CliDiagnostic {
  const meta = getArchEngineErrorMetadata(input.code);
  return {
    code: meta.code,
    severity: meta.severity,
    title: input.title ?? meta.title,
    message: input.message,
    fix: input.fix ?? meta.defaultFix,
    ciBlocking: meta.ciBlocking,
    path: input.path,
    details: input.details,
    docsHint: meta.docsHint,
  };
}

/**
 * Render a diagnostic in the human-output shape per spec §7.1.
 *
 * - For `INFO` severity, the `Fix:` block is rendered as `Next:`
 *   because nothing is broken — Phase A's convention. The exit
 *   code line is omitted (informational diagnostics ride on top
 *   of the host command's normal output and don't terminate it).
 * - For `WARNING` severity, `Fix:` is shown but the exit-code
 *   line is omitted (warnings don't block).
 * - For `ERROR`, `BLOCKING`, and `INTERNAL`, the full
 *   Title/Problem/Fix/Exit/Docs block is shown.
 *
 * Color is conditional on the global `--no-color` flag. We rely
 * on `picocolors`'s own no-color detection (NO_COLOR env, isTTY,
 * etc.); no extra branching needed here.
 */
export function formatDiagnosticForHuman(d: CliDiagnostic): string {
  const lines: string[] = [];
  const meta = getArchEngineErrorMetadata(d.code);

  // Title — color depends on severity.
  const titleColor =
    meta.severity === 'BLOCKING' || meta.severity === 'ERROR' || meta.severity === 'INTERNAL'
      ? pc.red
      : meta.severity === 'WARNING'
        ? pc.yellow
        : pc.dim;
  lines.push(titleColor(pc.bold(d.title)));
  lines.push('');

  // Problem block (the per-occurrence message).
  if (d.message && d.message.length > 0) {
    lines.push('Problem:');
    for (const line of d.message.split('\n')) {
      lines.push(`  ${line}`);
    }
    lines.push('');
  }

  // Fix block (or Next: for INFO).
  if (d.fix && d.fix.length > 0) {
    const label = meta.severity === 'INFO' ? 'Next:' : 'Fix:';
    lines.push(label);
    for (const line of d.fix.split('\n')) {
      lines.push(`  ${line}`);
    }
    lines.push('');
  }

  // Exit-code line (only for terminal severities).
  if (
    meta.severity === 'BLOCKING' ||
    meta.severity === 'ERROR' ||
    meta.severity === 'INTERNAL'
  ) {
    const semantic = humanExitSemantic(meta.exitCode);
    lines.push(`Exit ${meta.exitCode}: ${semantic}.`);
  }

  // Docs link.
  if (meta.docsHint) {
    lines.push(`Docs: https://arch-engine.dev/${meta.docsHint}`);
  }

  return lines.join('\n');
}

/**
 * Return the canonical exit-code semantic phrase used in the
 * human "Exit N: …" line. Mirrors spec §5.
 */
function humanExitSemantic(exitCode: ArchEngineExitCode): string {
  switch (exitCode) {
    case 0:
      return 'no blocking architecture violations';
    case 1:
      return 'blocking architecture violations';
    case 2:
      return 'invalid input or configuration';
    case 3:
      return 'adapter or workspace failure';
    case 5:
      return 'internal invariant failure';
    default:
      return 'failure';
  }
}

/**
 * Map an unknown thrown value into a CliDiagnostic.
 *
 * Per spec §11.4: any uncaught error from a command path that
 * isn't already a structured `ARCH_ENGINE_*` failure is treated
 * as `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` with severity
 * `INTERNAL` and exit code 5.
 *
 * The original error message is preserved in `details.original`
 * so a bug report can include it. Stack traces never enter the
 * diagnostic itself — they are emitted to stderr by the renderer
 * only when DEBUG is set.
 */
export function diagnosticFromUnknownError(error: unknown): CliDiagnostic {
  const original = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : 'NonErrorThrown';
  return buildDiagnostic({
    code: 'ARCH_ENGINE_INTERNAL_INVARIANT_FAILED',
    message:
      `Arch-Engine encountered an unexpected internal error: ${original}\n` +
      `This is a bug in Arch-Engine, not in your repository.`,
    details: { original, errorName },
  });
}

/**
 * Print a diagnostic to stderr in human-readable form, then
 * (optionally) print the source error's stack trace iff debug
 * mode is active. Use this from CLI catch blocks.
 *
 * Returns the diagnostic so the caller can decide whether to
 * exit and with what code (we never call process.exit here —
 * exit is a host concern).
 */
export function emitDiagnosticHuman(d: CliDiagnostic, sourceError?: unknown): CliDiagnostic {
  const text = formatDiagnosticForHuman(d);
  console.error(text);
  if (isDebugEnabled() && sourceError instanceof Error && sourceError.stack) {
    console.error('');
    console.error('--- stack (DEBUG=arch-engine:* enabled) ---');
    console.error(sourceError.stack);
  }
  return d;
}

/**
 * Emit a diagnostic in JSON shape. Used when the host command
 * is in --json mode and decides to terminate via the diagnostic
 * path (rather than via the normal --json envelope which carries
 * its own `diagnostics: []`).
 */
export function emitDiagnosticJson(d: CliDiagnostic): CliDiagnostic {
  console.log(JSON.stringify({ diagnostics: [diagnosticToJson(d)] }, null, 2));
  return d;
}

/**
 * Convert a CliDiagnostic into its JSON-serializable form.
 *
 * Matches spec §8.8. `path` and `details` are omitted when not
 * provided (no `undefined` fields per spec §12.4).
 */
export function diagnosticToJson(d: CliDiagnostic): {
  code: ArchEngineErrorCode;
  severity: ArchEngineSeverity;
  title: string;
  message: string;
  fix?: string;
  ciBlocking: boolean;
  path?: string;
  details?: Record<string, unknown>;
  docsHint?: string;
} {
  const out: ReturnType<typeof diagnosticToJson> = {
    code: d.code,
    severity: d.severity,
    title: d.title,
    message: d.message,
    ciBlocking: d.ciBlocking,
  };
  if (d.fix !== undefined) out.fix = d.fix;
  if (d.path !== undefined) out.path = d.path;
  if (d.details !== undefined) out.details = d.details;
  if (d.docsHint !== undefined) out.docsHint = d.docsHint;
  return out;
}

/**
 * Returns true iff `DEBUG` env contains `arch-engine` (matching
 * the existing v1.0.x stack-trace gating in `cli.ts`). Centralised
 * so other call sites stay consistent.
 */
export function isDebugEnabled(): boolean {
  const debug = process.env.DEBUG;
  if (!debug) return false;
  // Loose match: `DEBUG=arch-engine`, `DEBUG=arch-engine:*`, `DEBUG=*` all enable.
  if (debug === '*') return true;
  return /(?:^|[,\s])arch-engine(?::\*|:[a-z-]+|\b)/i.test(debug);
}

/**
 * Convenience: get the spec exit code for a diagnostic.
 */
export function exitCodeForDiagnostic(d: CliDiagnostic): ArchEngineExitCode {
  return getArchEngineErrorMetadata(d.code).exitCode;
}

/**
 * Convenience: shape used by tests asserting the rendered shape.
 */
export interface RenderedDiagnostic {
  readonly title: string;
  readonly hasProblem: boolean;
  readonly hasFix: boolean;
  readonly hasExit: boolean;
  readonly hasDocs: boolean;
  readonly hasStack: boolean;
}

export function inspectRenderedDiagnostic(text: string): RenderedDiagnostic {
  return {
    title: text.split('\n')[0] ?? '',
    hasProblem: /^Problem:/m.test(text),
    hasFix: /^(Fix|Next):/m.test(text),
    hasExit: /^Exit \d+:/m.test(text),
    hasDocs: /^Docs:/m.test(text),
    // Stack traces include "    at " frames when emitted.
    hasStack: /\n\s+at\s+/m.test(text),
  };
}
