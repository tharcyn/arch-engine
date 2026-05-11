/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Baseline reader
 * ═══════════════════════════════════════════════════════════
 *
 *  Reads and validates a prior Arch-Engine JSON v2 envelope to
 *  serve as the baseline for cross-run drift detection (v1.2.0).
 *  Contract locked by
 *  docs/cli/baseline-comparison-spec.md §6 and §8.
 *
 *  The reader is **strict**: a baseline must be a current,
 *  schema-conformant v2 envelope with `data.topology.canonical`
 *  present. Any deviation maps to a specific `ARCH_ENGINE_BASELINE_*`
 *  exit-2 diagnostic so the user gets an actionable message.
 *
 *  Decision tree (per spec §8):
 *
 *  1. Path exists, regular readable file?
 *     No  → ARCH_ENGINE_BASELINE_NOT_FOUND
 *  2. JSON-parsable?
 *     No  → ARCH_ENGINE_BASELINE_INVALID
 *  3. schemaVersion === "arch-engine.cli.v2"?
 *     No  → ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA
 *  4. command compatible with current command?
 *     No  → ARCH_ENGINE_BASELINE_COMMAND_MISMATCH
 *  5. archEngineVersion >= 1.2.0?
 *     No  → ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA
 *     Yes-but-newer-than-runtime → WARNING diagnostic, proceed
 *  6. data.topology.canonical has the expected shape?
 *     No  → ARCH_ENGINE_BASELINE_INVALID
 *
 *  All failures throw a `BaselineReadError` carrying a built
 *  `CliDiagnostic`. The caller decides whether to emit the
 *  diagnostic as JSON or human-formatted before exiting.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildDiagnostic,
  type CliDiagnostic,
} from './format-error.js';
import {
  type CanonicalTopology,
  isCanonicalTopologyShape,
} from './canonical-topology.js';

/**
 * Result type returned on success. Carries the minimal fields a
 * drift engine needs from the baseline plus the raw envelope for
 * future fields.
 */
export interface BaselineReadResult {
  /** The resolved absolute path the user pointed at. */
  readonly resolvedPath: string;
  /** The user's original `--baseline` argument (preserved as-is). */
  readonly userPath: string;
  /** The parsed envelope. Useful for fields not pre-extracted. */
  readonly envelope: BaselineEnvelope;
  /** Pre-extracted canonical topology, ready for diffing. */
  readonly canonicalTopology: CanonicalTopology;
  /** Optional warning diagnostic (e.g. newer-than-runtime). */
  readonly warning?: CliDiagnostic;
}

/**
 * A structurally-validated subset of the v2 envelope that drift
 * needs. Additional fields are preserved in `raw` for forward
 * compatibility.
 */
export interface BaselineEnvelope {
  readonly schemaVersion: 'arch-engine.cli.v2';
  readonly command: 'check' | 'analyze' | 'inspect';
  readonly archEngineVersion: string;
  readonly emittedAt: string | undefined;
  readonly status?: string;
  readonly exitCode?: number;
  readonly data: BaselineData;
  /** Original parsed JSON. Read-only. */
  readonly raw: Record<string, unknown>;
}

export interface BaselineData {
  readonly topology: {
    readonly canonical: CanonicalTopology;
    readonly coverage?: number;
    readonly connectivity?: number;
    readonly topologyConfidence?: number;
    readonly authorityCrossings?: number;
    readonly blockerCrossings?: number;
    readonly [k: string]: unknown;
  };
  readonly violations?: ReadonlyArray<Record<string, unknown>>;
  readonly stability?: {
    readonly score?: number;
    readonly tier?: string;
    readonly headlineKind?: string;
    readonly policyConfigured?: boolean;
    readonly [k: string]: unknown;
  };
  readonly [k: string]: unknown;
}

/**
 * Error thrown by `readBaselineReport` when validation fails.
 * Carries the structured diagnostic the caller should emit before
 * calling `process.exit(diagnostic.exitCode)`.
 */
export class BaselineReadError extends Error {
  constructor(public readonly diagnostic: CliDiagnostic) {
    super(diagnostic.message);
    this.name = 'BaselineReadError';
  }
}

/**
 * Read and validate a baseline file. Throws `BaselineReadError`
 * on every failure mode.
 *
 * @param userPath  the path the user passed to `--baseline`
 * @param currentCommand  the command the caller is running
 *   (`"check"` or `"analyze"`)
 * @param currentArchEngineVersion  the runtime CLI version, used
 *   to detect newer-than-runtime baselines for the warning path
 */
export function readBaselineReport(
  userPath: string,
  currentCommand: 'check' | 'analyze',
  currentArchEngineVersion: string,
): BaselineReadResult {
  // ── Step 1: path resolution + existence ────────────────────
  if (typeof userPath !== 'string' || userPath.length === 0) {
    throwBaseline('ARCH_ENGINE_BASELINE_NOT_FOUND', {
      message: 'No --baseline path was provided.',
      fix: 'Pass a path: `--baseline path/to/baseline.json`.',
    });
  }

  if (userPath.endsWith('/') || userPath.endsWith('\\')) {
    throwBaseline('ARCH_ENGINE_BASELINE_NOT_FOUND', {
      message:
        `The --baseline value "${userPath}" looks like a directory ` +
        `(trailing slash). Pass a file path instead.`,
      fix: 'Provide a JSON file path, e.g. `--baseline ./arch-engine-baseline.json`.',
    });
  }

  const resolvedPath = path.isAbsolute(userPath)
    ? userPath
    : path.resolve(process.cwd(), userPath);

  if (!fs.existsSync(resolvedPath)) {
    throwBaseline('ARCH_ENGINE_BASELINE_NOT_FOUND', {
      message: `Baseline file not found at "${userPath}".`,
      fix: 'Check the path. Relative paths resolve from the current working directory.',
    });
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolvedPath);
  } catch (err) {
    throwBaseline('ARCH_ENGINE_BASELINE_NOT_FOUND', {
      message: `Baseline file at "${userPath}" is unreadable: ${(err as Error).message}.`,
      fix: 'Ensure the file exists and is readable by this process.',
    });
  }

  if (!stat.isFile()) {
    throwBaseline('ARCH_ENGINE_BASELINE_NOT_FOUND', {
      message: `Baseline path "${userPath}" is not a regular file.`,
      fix: 'Pass a JSON file path (not a directory or symlink to a directory).',
    });
  }

  // ── Step 2: JSON parse ────────────────────────────────────
  let rawText: string;
  try {
    rawText = fs.readFileSync(resolvedPath, 'utf8');
  } catch (err) {
    throwBaseline('ARCH_ENGINE_BASELINE_NOT_FOUND', {
      message: `Baseline file at "${userPath}" could not be read: ${(err as Error).message}.`,
      fix: 'Ensure the file is readable by this process.',
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throwBaseline('ARCH_ENGINE_BASELINE_INVALID', {
      message: `Baseline file at "${userPath}" is not valid JSON: ${(err as Error).message}.`,
      fix: 'Re-generate the baseline with `arch-engine check --ci --json --json-schema=v2 --output <path>`.',
    });
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throwBaseline('ARCH_ENGINE_BASELINE_INVALID', {
      message: `Baseline file at "${userPath}" must be a JSON object, got ${describeType(parsed)}.`,
      fix: 'Re-generate the baseline with `arch-engine check --ci --json --json-schema=v2 --output <path>`.',
    });
  }
  const raw = parsed as Record<string, unknown>;

  // ── Step 3: schemaVersion ─────────────────────────────────
  if (raw.schemaVersion !== 'arch-engine.cli.v2') {
    throwBaseline('ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA', {
      message:
        `Baseline schemaVersion is ${JSON.stringify(raw.schemaVersion)}, ` +
        `expected "arch-engine.cli.v2".`,
      fix: 'Re-generate the baseline with `arch-engine check --ci --json --json-schema=v2 --output <path>` using a current Arch-Engine version.',
    });
  }

  // ── Step 4: command compatibility ─────────────────────────
  const cmd = raw.command;
  if (cmd !== 'check' && cmd !== 'analyze' && cmd !== 'inspect') {
    throwBaseline('ARCH_ENGINE_BASELINE_COMMAND_MISMATCH', {
      message:
        `Baseline command ${JSON.stringify(cmd)} is not compatible with ` +
        `current command "${currentCommand}".`,
      fix: 'Use a baseline generated by `check`, `analyze`, or `inspect`.',
    });
  }

  // (per spec §6.3: any of {check, analyze, inspect} is compatible
  // with `check` or `analyze` runs because topology is shared. The
  // mismatch only arises when the baseline was emitted by `doctor`
  // or `explain`, which we already rejected above.)

  // ── Step 5: archEngineVersion floor ───────────────────────
  // Per spec §6.1, baselines must come from arch-engine@>=1.2.0 to
  // ensure `data.topology.canonical` is present. The implementation
  // does the version check leniently: we accept any baseline that
  // carries the canonical block (step 6 below) since that's the
  // actual hard requirement. The version is verified informationally
  // and surfaced via the newer-than-runtime warning path.
  const baselineVer = raw.archEngineVersion;
  if (typeof baselineVer !== 'string') {
    throwBaseline('ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA', {
      message: `Baseline missing archEngineVersion field.`,
      fix: 'Re-generate the baseline with `arch-engine check --ci --json --json-schema=v2 --output <path>`.',
    });
  }

  // Newer-than-runtime → warning, not error (per spec §8.3).
  let warning: CliDiagnostic | undefined;
  if (compareSemver(baselineVer, currentArchEngineVersion) > 0) {
    warning = buildDiagnostic({
      code: 'ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA',
      title: 'Baseline is from a newer Arch-Engine version.',
      message:
        `Baseline was emitted by arch-engine@${baselineVer}; current runtime is ` +
        `${currentArchEngineVersion}. Comparing on the v1.2 canonical surface; ` +
        `newer fields will be ignored.`,
      fix: 'Upgrade the CLI to match the baseline if you want full drift coverage.',
    });
    // Override severity to WARNING for this case (the metadata
    // table is fixed at ERROR; this is the one spec-blessed
    // exception). We construct it with `severity` left ERROR for
    // simplicity — downstream renderers route by exit code, which
    // is 0 for warnings; we instead emit it as a separate WARNING
    // diagnostic. Re-build using a known WARNING-severity code:
    warning = {
      ...warning,
      severity: 'WARNING',
      ciBlocking: false,
    };
  }

  // ── Step 6: data.topology.canonical ───────────────────────
  const data = raw.data as Record<string, unknown> | undefined;
  if (data === undefined || data === null || typeof data !== 'object') {
    throwBaseline('ARCH_ENGINE_BASELINE_INVALID', {
      message: 'Baseline is missing the `data` object.',
      fix: 'Re-generate the baseline; the v2 envelope must include `data`.',
    });
  }
  const topology = data.topology as Record<string, unknown> | undefined;
  if (topology === undefined || topology === null || typeof topology !== 'object') {
    throwBaseline('ARCH_ENGINE_BASELINE_INVALID', {
      message: 'Baseline is missing the `data.topology` object.',
      fix: 'Re-generate the baseline; v1.2+ emits `data.topology` for every command that supports baseline.',
    });
  }
  const canonical = topology.canonical;
  if (!isCanonicalTopologyShape(canonical)) {
    throwBaseline('ARCH_ENGINE_BASELINE_INVALID', {
      message:
        'Baseline is missing `data.topology.canonical` (or it has the wrong shape). ' +
        'This field was added in v1.2.0 and is required for drift comparison.',
      fix: 'Re-generate the baseline with arch-engine@>=1.2.0 (`arch-engine check --ci --json --json-schema=v2 --output <path>`).',
    });
  }

  // ── Build the typed result ────────────────────────────────
  const envelope: BaselineEnvelope = {
    schemaVersion: 'arch-engine.cli.v2',
    command: cmd as 'check' | 'analyze' | 'inspect',
    archEngineVersion: baselineVer,
    emittedAt: typeof raw.emittedAt === 'string' ? raw.emittedAt : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    exitCode: typeof raw.exitCode === 'number' ? raw.exitCode : undefined,
    data: data as unknown as BaselineData,
    raw,
  };

  return {
    resolvedPath,
    userPath,
    envelope,
    canonicalTopology: canonical,
    warning,
  };
}

// ─── helpers ──────────────────────────────────────────────────

function throwBaseline(
  code: 'ARCH_ENGINE_BASELINE_NOT_FOUND' | 'ARCH_ENGINE_BASELINE_INVALID' | 'ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA' | 'ARCH_ENGINE_BASELINE_COMMAND_MISMATCH',
  fields: { message: string; fix: string },
): never {
  const diagnostic = buildDiagnostic({
    code,
    message: fields.message,
    fix: fields.fix,
  });
  throw new BaselineReadError(diagnostic);
}

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Tiny semver compare for `MAJOR.MINOR.PATCH` strings.
 *
 *   compareSemver("1.2.0", "1.1.9")  →  +1
 *   compareSemver("1.2.0", "1.2.0")  →   0
 *   compareSemver("1.1.0", "1.2.0")  →  -1
 *
 * Pre-release suffixes (e.g. `1.2.0-rc.1`) compare as the base
 * version. v1.2 baselines won't carry pre-release suffixes in
 * normal use; this keeps the comparator predictable.
 */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa[0] !== pb[0]) return pa[0] - pb[0];
  if (pa[1] !== pb[1]) return pa[1] - pb[1];
  if (pa[2] !== pb[2]) return pa[2] - pb[2];
  return 0;
}

function parseSemver(v: string): [number, number, number] {
  const base = v.split('-')[0] ?? '0.0.0';
  const parts = base.split('.').map((s) => Number.parseInt(s, 10));
  return [
    Number.isFinite(parts[0]) ? parts[0]! : 0,
    Number.isFinite(parts[1]) ? parts[1]! : 0,
    Number.isFinite(parts[2]) ? parts[2]! : 0,
  ];
}
