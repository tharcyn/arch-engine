/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Internal error-code vocabulary
 * ═══════════════════════════════════════════════════════════
 *
 *  Single source of truth for the v1.0.3 ARCH_ENGINE_* error
 *  codes documented in `docs/cli/json-error-language-spec.md`
 *  §6.2. The codes are *internal* to the CLI implementation —
 *  they are not exported from `@arch-engine/cli`'s package
 *  exports map and therefore do NOT widen the public API
 *  surface. They are used by:
 *
 *    - `format-error.ts` to render structured human errors
 *    - the `diagnostics: []` JSON field added to every
 *      command's --json output (per spec §3.1)
 *    - the `code` field on `check --json` violations[]
 *
 *  Adding a new code is a v1.0.x patch-safe change provided
 *  the rules in spec §6.3 are followed.
 */

/**
 * Severity vocabulary per spec §6.1.
 *
 * - `INFO`     — informational; not actionable; not a failure.
 * - `WARNING`  — actionable advisory; does not block CI.
 * - `BLOCKING` — stops a CI gate. The user must address it.
 * - `ERROR`    — user-side: invalid input or configuration.
 * - `INTERNAL` — engine bug. Tells the user this is a bug.
 */
export type ArchEngineSeverity =
  | 'INFO'
  | 'WARNING'
  | 'BLOCKING'
  | 'ERROR'
  | 'INTERNAL';

/**
 * Stable exit-code contract per spec §5.
 *
 * - 0  success / no blocking violation
 * - 1  blocking architecture violation
 * - 2  invalid input or configuration
 * - 3  adapter / workspace failure
 * - 5  internal invariant failure
 *
 * Note: 4 is intentionally unused. The spec reserves 4 for a
 * future "unsupported environment" semantic if needed.
 */
export type ArchEngineExitCode = 0 | 1 | 2 | 3 | 5;

/**
 * The ARCH_ENGINE_* code vocabulary. Order matches spec §6.2.
 */
export const ARCH_ENGINE_ERROR_CODES = [
  'ARCH_ENGINE_POLICY_NOT_FOUND',
  'ARCH_ENGINE_INVALID_POLICY',
  'ARCH_ENGINE_INVALID_CONFIG',
  'ARCH_ENGINE_ADAPTER_NOT_FOUND',
  'ARCH_ENGINE_UNSUPPORTED_WORKSPACE',
  'ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL',
  'ARCH_ENGINE_GRAPH_SHAPE_INVALID',
  'ARCH_ENGINE_TARGET_NOT_FOUND',
  'ARCH_ENGINE_BLOCKING_VIOLATION',
  'ARCH_ENGINE_INTERNAL_INVARIANT_FAILED',
  'ARCH_ENGINE_NO_BASELINE',
  // v1.2.0 — baseline comparison vocabulary, per
  // docs/cli/baseline-comparison-spec.md §16.
  'ARCH_ENGINE_BASELINE_NOT_FOUND',
  'ARCH_ENGINE_BASELINE_INVALID',
  'ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA',
  'ARCH_ENGINE_BASELINE_COMMAND_MISMATCH',
  'ARCH_ENGINE_DRIFT_DETECTED',
  // Adapter Pass 2 (v1.3-prep) — multi-adapter selection vocabulary, per
  // docs/adapters/multi-adapter-surface-spec.md §13.
  'ARCH_ENGINE_ADAPTER_CONFLICT',
  'ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE',
  'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
  'ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED',
  'ARCH_ENGINE_LOCKFILE_UNSUPPORTED',
  'ARCH_ENGINE_PNP_RESOLUTION_DEFERRED',
] as const;

export type ArchEngineErrorCode = typeof ARCH_ENGINE_ERROR_CODES[number];

export interface ArchEngineErrorMetadata {
  readonly code: ArchEngineErrorCode;
  readonly severity: ArchEngineSeverity;
  readonly exitCode: ArchEngineExitCode;
  readonly title: string;
  readonly defaultFix: string;
  readonly ciBlocking: boolean;
  /** Suggested docs URL fragment. The renderer prepends https://arch-engine.dev/. */
  readonly docsHint?: string;
}

const METADATA: Record<ArchEngineErrorCode, ArchEngineErrorMetadata> = {
  ARCH_ENGINE_POLICY_NOT_FOUND: {
    code: 'ARCH_ENGINE_POLICY_NOT_FOUND',
    severity: 'INFO',
    exitCode: 0,
    title: 'No policy configured.',
    defaultFix:
      'Add `arch-policy.yml` (or `.archengine/policy.yml`) to start enforcing architecture rules.',
    ciBlocking: false,
    docsHint: 'policies',
  },
  ARCH_ENGINE_INVALID_POLICY: {
    code: 'ARCH_ENGINE_INVALID_POLICY',
    severity: 'ERROR',
    exitCode: 2,
    title: 'Invalid policy file.',
    defaultFix:
      'Edit your policy file to fix the problem reported above. See the policy syntax reference for the supported shape.',
    ciBlocking: true,
    docsHint: 'policies/syntax',
  },
  ARCH_ENGINE_INVALID_CONFIG: {
    code: 'ARCH_ENGINE_INVALID_CONFIG',
    severity: 'ERROR',
    exitCode: 2,
    title: 'Invalid configuration.',
    defaultFix:
      'Review your `arch-engine.yml` (or equivalent) configuration and correct the problem reported above.',
    ciBlocking: true,
    docsHint: 'configuration',
  },
  ARCH_ENGINE_ADAPTER_NOT_FOUND: {
    code: 'ARCH_ENGINE_ADAPTER_NOT_FOUND',
    severity: 'ERROR',
    exitCode: 3,
    title: 'Workspace topology adapter is missing.',
    defaultFix:
      'Install the workspace adapter:\n    npm install --save-dev @arch-engine/adapter-monorepo',
    ciBlocking: true,
    docsHint: 'adapters',
  },
  ARCH_ENGINE_UNSUPPORTED_WORKSPACE: {
    code: 'ARCH_ENGINE_UNSUPPORTED_WORKSPACE',
    severity: 'ERROR',
    exitCode: 3,
    title: 'Workspace type not supported.',
    defaultFix:
      'Add a `workspaces` field to your root package.json, or run from a directory containing a recognised workspace layout.',
    ciBlocking: true,
    docsHint: 'adapters',
  },
  ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL: {
    code: 'ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL',
    severity: 'WARNING',
    exitCode: 0,
    title: 'Topology coverage is too low to evaluate confidently.',
    defaultFix:
      'Add adapter hints, broaden the workspace globs, or run on a larger repo to improve extraction confidence.',
    ciBlocking: false,
    docsHint: 'adapters',
  },
  ARCH_ENGINE_GRAPH_SHAPE_INVALID: {
    code: 'ARCH_ENGINE_GRAPH_SHAPE_INVALID',
    severity: 'INTERNAL',
    exitCode: 5,
    title: 'Internal graph shape invariant failed.',
    defaultFix:
      'This is a bug in Arch-Engine. Open an issue at https://github.com/tharcyn/arch-engine/issues with the output of `arch-engine doctor --json` and `arch-engine inspect --json`.',
    ciBlocking: true,
  },
  ARCH_ENGINE_TARGET_NOT_FOUND: {
    code: 'ARCH_ENGINE_TARGET_NOT_FOUND',
    severity: 'INFO',
    exitCode: 0,
    title: 'Explain target not found.',
    defaultFix:
      'List available targets with `arch-engine inspect` (see the nodes and edges sections), or use one of the special targets `regression` or `policy`.',
    ciBlocking: false,
    docsHint: 'cli/explain',
  },
  ARCH_ENGINE_BLOCKING_VIOLATION: {
    code: 'ARCH_ENGINE_BLOCKING_VIOLATION',
    severity: 'BLOCKING',
    exitCode: 1,
    title: 'Blocked: blocking architecture violation(s).',
    defaultFix:
      'Remove or re-route the offending edge(s), or update your policy to allow them.',
    ciBlocking: true,
    docsHint: 'cli/check',
  },
  ARCH_ENGINE_INTERNAL_INVARIANT_FAILED: {
    code: 'ARCH_ENGINE_INTERNAL_INVARIANT_FAILED',
    severity: 'INTERNAL',
    exitCode: 5,
    title: 'Arch-Engine internal invariant failed (bug).',
    defaultFix:
      'This is a bug in Arch-Engine. Open an issue at https://github.com/tharcyn/arch-engine/issues with the output of `arch-engine doctor --json`.',
    ciBlocking: true,
  },
  ARCH_ENGINE_NO_BASELINE: {
    code: 'ARCH_ENGINE_NO_BASELINE',
    severity: 'INFO',
    exitCode: 0,
    title: 'No baseline artifact for regression comparison.',
    defaultFix:
      'Run `arch-engine analyze` or `arch-engine check` first to write the baseline artifact at `.arch-engine/stability-score.json`.',
    ciBlocking: false,
    docsHint: 'cli/explain',
  },
  // ── v1.2.0 baseline comparison codes ───────────────────────────
  ARCH_ENGINE_BASELINE_NOT_FOUND: {
    code: 'ARCH_ENGINE_BASELINE_NOT_FOUND',
    severity: 'ERROR',
    exitCode: 2,
    title: 'Baseline file not found.',
    defaultFix:
      'Check the path passed to `--baseline`. Relative paths resolve from the current working directory.',
    ciBlocking: true,
    docsHint: 'cli/baseline',
  },
  ARCH_ENGINE_BASELINE_INVALID: {
    code: 'ARCH_ENGINE_BASELINE_INVALID',
    severity: 'ERROR',
    exitCode: 2,
    title: 'Baseline file is structurally invalid.',
    defaultFix:
      'Re-generate the baseline with `arch-engine check --ci --json --json-schema=v2 --output <path>` on a clean checkout.',
    ciBlocking: true,
    docsHint: 'cli/baseline',
  },
  ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA: {
    code: 'ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA',
    severity: 'ERROR',
    exitCode: 2,
    title: 'Baseline schema is not supported.',
    defaultFix:
      'Baseline must be Arch-Engine JSON v2 (`schemaVersion: "arch-engine.cli.v2"`) emitted by `arch-engine@>=1.2.0`. Re-generate with a current CLI version.',
    ciBlocking: true,
    docsHint: 'cli/baseline',
  },
  ARCH_ENGINE_BASELINE_COMMAND_MISMATCH: {
    code: 'ARCH_ENGINE_BASELINE_COMMAND_MISMATCH',
    severity: 'ERROR',
    exitCode: 2,
    title: 'Baseline command is incompatible with current command.',
    defaultFix:
      'Use a baseline generated by `check`, `analyze`, or `inspect` when running `check` or `analyze`.',
    ciBlocking: true,
    docsHint: 'cli/baseline',
  },
  ARCH_ENGINE_DRIFT_DETECTED: {
    code: 'ARCH_ENGINE_DRIFT_DETECTED',
    severity: 'INFO',
    exitCode: 0,
    title: 'Architecture drift detected.',
    defaultFix:
      'Review the drift section; update policy or revert the change if it is unintentional.',
    ciBlocking: false,
    docsHint: 'cli/baseline',
  },
  // ── Adapter Pass 2 codes ───────────────────────────────────────
  ARCH_ENGINE_ADAPTER_CONFLICT: {
    code: 'ARCH_ENGINE_ADAPTER_CONFLICT',
    severity: 'ERROR',
    exitCode: 3,
    title: 'Multiple workspace adapters matched this repository.',
    defaultFix:
      'Two or more workspace adapters reported HIGH confidence. Remove the conflicting declaration (e.g. delete `pnpm-workspace.yaml` or remove `package.json#workspaces`), or install only one of the conflicting adapters.',
    ciBlocking: true,
    docsHint: 'adapters',
  },
  ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE: {
    code: 'ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE',
    severity: 'WARNING',
    exitCode: 0,
    title: 'Workspace adapter selection used low-confidence fallback.',
    defaultFix:
      'No adapter reported HIGH or MEDIUM confidence. ' +
      'For pnpm workspaces, ensure `pnpm-workspace.yaml` exists at the repository root — a `pnpm-lock.yaml` alone does not define a pnpm workspace. ' +
      'For npm or yarn workspaces, ensure the root `package.json` declares a `workspaces` field. ' +
      'For single-package repositories, this warning is informational. ' +
      'If a more specific adapter package is available, install it (e.g. `npm install --save-dev @arch-engine/adapter-pnpm`).',
    ciBlocking: false,
    docsHint: 'adapters',
  },
  ARCH_ENGINE_WORKSPACE_GLOBS_INVALID: {
    code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
    severity: 'ERROR',
    exitCode: 3,
    title: 'Workspace globs failed to parse.',
    defaultFix:
      'Open `pnpm-workspace.yaml` (or the equivalent workspace declaration) and ensure the `packages:` list uses the supported subset: quoted or unquoted glob strings under a `packages:` block.',
    ciBlocking: true,
    docsHint: 'adapters',
  },
  ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED: {
    code: 'ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED',
    severity: 'ERROR',
    exitCode: 3,
    title: 'Workspace package is missing a `name` field.',
    defaultFix:
      'Add a `"name": "<unique-id>"` field to the offending `package.json`. Unnamed packages cannot be represented as nodes in the architecture topology.',
    ciBlocking: true,
    docsHint: 'adapters',
  },
  ARCH_ENGINE_LOCKFILE_UNSUPPORTED: {
    code: 'ARCH_ENGINE_LOCKFILE_UNSUPPORTED',
    severity: 'WARNING',
    exitCode: 0,
    title: 'Lockfile feature is not yet supported.',
    defaultFix:
      'The current adapter version does not interpret this lockfile feature (e.g. pnpm catalogs). Topology extraction continues; affected dependency specifiers are treated as opaque strings.',
    ciBlocking: false,
    docsHint: 'adapters',
  },
  ARCH_ENGINE_PNP_RESOLUTION_DEFERRED: {
    code: 'ARCH_ENGINE_PNP_RESOLUTION_DEFERRED',
    severity: 'WARNING',
    exitCode: 0,
    title: 'Yarn PnP resolution is deferred.',
    defaultFix:
      'The v0.1.0 Yarn PnP adapter does not execute `.pnp.cjs`. Topology is derived from `package.json#workspaces` only.',
    ciBlocking: false,
    docsHint: 'adapters',
  },
};

/**
 * Look up the canonical metadata for a given error code.
 *
 * Throws if the code is not registered — callers MUST pass a
 * value of type `ArchEngineErrorCode`. TypeScript catches the
 * misuse statically; the throw guards a runtime regression
 * (e.g. a future code added to the array but not to METADATA).
 */
export function getArchEngineErrorMetadata(
  code: ArchEngineErrorCode,
): ArchEngineErrorMetadata {
  const meta = METADATA[code];
  if (!meta) {
    throw new Error(
      `Unknown ARCH_ENGINE_* error code: ${code}. ` +
        `Register it in packages/cli/src/error-codes.ts.`,
    );
  }
  return meta;
}

/**
 * Convenience: every code's metadata as an array, in the
 * declared order. Used by tests to verify completeness.
 */
export function listArchEngineErrorCodes(): ReadonlyArray<ArchEngineErrorMetadata> {
  return ARCH_ENGINE_ERROR_CODES.map((c) => getArchEngineErrorMetadata(c));
}
