/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — JSON v2 envelope renderer
 * ═══════════════════════════════════════════════════════════
 *
 *  Implements the opt-in JSON v2 envelope locked in
 *  docs/cli/json-v2-ci-flags-spec.md §6 and the per-command
 *  `data.*` shapes locked in §7.
 *
 *  The renderer is a single funnel: every command computes its v1
 *  payload as before, then v2 mode wraps that payload under
 *  `data:` and produces the envelope.
 *
 *  Design rules (binding):
 *
 *  - Top-level keys emitted in alphabetical order.
 *  - `data.*` keys alphabetised recursively by the implementation.
 *  - `diagnostics[]` sorted by (severity desc, code asc, message asc).
 *  - `data.violations[]` (under `check`) sorted by `id` ascending.
 *  - `artifacts[]` sorted by (kind, relativePath).
 *  - `nextActions[]` preserves human-output display order.
 *  - `artifacts[].absolutePath` omitted by default; included only
 *    when `--verbose` is set.
 *  - All paths under `data.*` are repo-relative POSIX.
 *  - `emittedAt` is ISO 8601 UTC with second resolution. The only
 *    wall-clock-derived field. Never part of any record's identity.
 */

import * as path from 'node:path';
import { createRequire } from 'node:module';
import {
  type ArchEngineSeverity,
  type ArchEngineErrorCode,
  getArchEngineErrorMetadata,
} from './error-codes.js';
import {
  type CliDiagnostic,
  diagnosticToJson,
} from './format-error.js';

export type V2Command = 'doctor' | 'inspect' | 'analyze' | 'check' | 'explain';

export type V2Status =
  | 'passed'
  | 'blocked'
  | 'warning'
  | 'error'
  | 'internal_error'
  | 'not_enforced';

export type V2ExitCode = 0 | 1 | 2 | 3 | 5;

export interface V2Artifact {
  readonly kind: string;
  readonly relativePath: string;
  /**
   * Absolute path. Omitted by default; included only when
   * `includeAbsolutePath` is true (i.e., `--verbose` or future
   * `--with-absolute-paths`).
   */
  readonly absolutePath?: string;
}

export interface V2Summary {
  readonly headline: string;
  readonly verdict: V2Status;
  /** Stability score [0..1]. Present for `analyze` and `check`. */
  readonly score?: number;
  /** Number of blocking violations. Present for `check`. */
  readonly violations?: number;
  /** Number of WARNING-severity diagnostics. */
  readonly warnings?: number;
  /** Total `diagnostics[]` length. */
  readonly diagnostics?: number;
  /** Number of edge matches. Present for `explain` matched-target. */
  readonly matches?: number;
}

/**
 * Inputs the envelope renderer needs from a command. Each command
 * computes these and hands them off. The renderer owns the
 * envelope-level concerns (alphabetisation, sort orders, path
 * policy, `emittedAt`).
 */
export interface V2RenderInput {
  readonly command: V2Command;
  readonly exitCode: V2ExitCode;
  readonly status: V2Status;
  readonly summary: V2Summary;
  readonly data: Record<string, unknown>;
  readonly diagnostics: ReadonlyArray<CliDiagnostic>;
  readonly artifacts: ReadonlyArray<V2Artifact>;
  readonly nextActions: ReadonlyArray<string>;
  readonly includeAbsolutePath: boolean;
  /** Optional injection for tests. Defaults to `new Date().toISOString()`. */
  readonly emittedAt?: string;
}

/**
 * Render a v2 envelope as a deterministic, pretty-printed JSON
 * string with a trailing newline. Top-level keys are alphabetised.
 */
export function renderCliJsonV2(input: V2RenderInput): string {
  const envelope = buildV2Envelope(input);
  // Two-space indent for readability; matches v1.0.3 `--json` style.
  return JSON.stringify(envelope, null, 2);
}

/**
 * Build the envelope object (without serialising). Useful for
 * tests that want to inspect shape rather than parse JSON.
 */
export function buildV2Envelope(input: V2RenderInput): Record<string, unknown> {
  const archEngineVersion = readPackageVersion();
  const emittedAt = input.emittedAt ?? new Date().toISOString();

  const sortedDiagnostics = sortDiagnostics(input.diagnostics);
  const sortedArtifacts = sortArtifacts(input.artifacts);

  // Path-safe artifacts: omit `absolutePath` by default.
  const artifacts = sortedArtifacts.map((a) => {
    const out: { kind: string; relativePath: string; absolutePath?: string } = {
      kind: a.kind,
      relativePath: a.relativePath,
    };
    if (input.includeAbsolutePath && a.absolutePath !== undefined) {
      out.absolutePath = a.absolutePath;
    }
    return out;
  });

  // Alphabetise `data.*` recursively. We don't deep-clone arrays
  // wholesale; arrays preserve their element order (callers are
  // expected to have applied the right sort already, e.g.
  // `data.violations[]` sorted by `id`).
  const data = sortKeysRecursive(input.data);

  // Top-level alphabetical assembly. JSON.stringify on this object
  // preserves insertion order, so we insert in alphabetical order
  // and emit.
  const envelope: Record<string, unknown> = {};
  envelope.archEngineVersion = archEngineVersion;
  envelope.artifacts = artifacts;
  envelope.command = input.command;
  envelope.data = data;
  envelope.diagnostics = sortedDiagnostics.map(diagnosticToJson);
  envelope.emittedAt = emittedAt;
  envelope.exitCode = input.exitCode;
  envelope.nextActions = [...input.nextActions];
  envelope.schemaVersion = 'arch-engine.cli.v2';
  envelope.status = input.status;
  envelope.summary = sortKeysRecursive(input.summary as unknown as Record<string, unknown>);
  return envelope;
}

// ─── Diagnostic ordering ────────────────────────────────────────

const SEVERITY_RANK: Record<ArchEngineSeverity, number> = {
  INTERNAL: 5,
  BLOCKING: 4,
  ERROR: 3,
  WARNING: 2,
  INFO: 1,
};

/**
 * Sort by (severity rank desc, code asc, message asc). Stable per
 * Array.prototype.sort guarantees in modern V8.
 */
export function sortDiagnostics(
  diags: ReadonlyArray<CliDiagnostic>,
): CliDiagnostic[] {
  return [...diags].sort((a, b) => {
    const r = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (r !== 0) return r;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    if (a.message !== b.message) return a.message < b.message ? -1 : 1;
    return 0;
  });
}

// ─── Artifact ordering ──────────────────────────────────────────

export function sortArtifacts(
  artifacts: ReadonlyArray<V2Artifact>,
): V2Artifact[] {
  return [...artifacts].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    if (a.relativePath !== b.relativePath)
      return a.relativePath < b.relativePath ? -1 : 1;
    return 0;
  });
}

// ─── Status derivation ──────────────────────────────────────────

/**
 * Derive `status` from `(exitCode, top diagnostic severity,
 * violations.length)` per spec §6.4.1.
 *
 * Mapping:
 *   exit 5  → internal_error
 *   exit 1  → blocked   (only `check` gets here)
 *   exit 2|3 → error
 *   exit 0 + INFO POLICY_NOT_FOUND in diagnostics → not_enforced
 *   exit 0 + WARNING in diagnostics → warning
 *   exit 0 + (INFO/none) → passed
 */
export function deriveStatusForExit(
  exitCode: V2ExitCode,
  diagnostics: ReadonlyArray<CliDiagnostic>,
  violationsCount: number,
): V2Status {
  if (exitCode === 5) return 'internal_error';
  if (exitCode === 1) return 'blocked';
  if (exitCode === 2 || exitCode === 3) return 'error';

  // exit 0
  if (violationsCount > 0) {
    // Shouldn't happen in v1.1.0 (only `check` produces violations
    // and it would exit 1), but defensively map to `warning`.
    return 'warning';
  }

  const hasWarning = diagnostics.some((d) => d.severity === 'WARNING');
  const hasPolicyNotFound = diagnostics.some(
    (d) => d.code === 'ARCH_ENGINE_POLICY_NOT_FOUND',
  );

  if (hasPolicyNotFound) return 'not_enforced';
  if (hasWarning) return 'warning';
  return 'passed';
}

// ─── Path normalisation ─────────────────────────────────────────

/**
 * Normalise a path for v2 emission: repo-relative POSIX.
 * If the path is outside cwd, render as `…/<basename>`.
 */
export function normalizeArtifactPath(cwd: string, absPath: string): string {
  const rel = path.relative(cwd, absPath);
  if (rel.startsWith('..')) {
    return `…/${path.basename(absPath)}`;
  }
  return rel.split(path.sep).join('/');
}

// ─── Object key alphabetisation ────────────────────────────────

/**
 * Recursively sort an object's keys alphabetically. Arrays preserve
 * order (their elements may have been sorted by the caller). Primitive
 * values are returned as-is.
 *
 * The implementation walks objects defensively: it does not invoke
 * accessors, only own enumerable properties.
 */
export function sortKeysRecursive(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((el) => sortKeysRecursive(el));
  }
  if (input !== null && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    for (const k of keys) {
      out[k] = sortKeysRecursive(obj[k]);
    }
    return out;
  }
  return input;
}

// ─── Summary builder ────────────────────────────────────────────

/**
 * Build a `summary` object for the envelope. Each command picks
 * which counters apply.
 */
export function buildSummary(
  headline: string,
  status: V2Status,
  counters: {
    score?: number;
    violations?: number;
    warnings?: number;
    diagnostics?: number;
    matches?: number;
  } = {},
): V2Summary {
  const out: V2Summary = {
    headline,
    verdict: status,
    ...(counters.score !== undefined ? { score: counters.score } : {}),
    ...(counters.violations !== undefined ? { violations: counters.violations } : {}),
    ...(counters.warnings !== undefined ? { warnings: counters.warnings } : {}),
    ...(counters.diagnostics !== undefined ? { diagnostics: counters.diagnostics } : {}),
    ...(counters.matches !== undefined ? { matches: counters.matches } : {}),
  };
  return out;
}

// ─── Package version (cached) ──────────────────────────────────

let _archEngineVersionCache: string | undefined;

/**
 * Read the `@arch-engine/cli` package version. Used by the envelope's
 * `archEngineVersion` field AND (in v1.2.0+) by the baseline reader's
 * newer-than-runtime warning gate. Exported so command code can
 * compare against baselines without redoing the require dance.
 */
export function readPackageVersion(): string {
  if (_archEngineVersionCache) return _archEngineVersionCache;
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version?: string };
    _archEngineVersionCache = pkg.version ?? '0.0.0';
  } catch {
    _archEngineVersionCache = '0.0.0';
  }
  return _archEngineVersionCache;
}

// Re-exports for convenient symmetry with format-error.ts ─────
export { type CliDiagnostic, type ArchEngineErrorCode };
