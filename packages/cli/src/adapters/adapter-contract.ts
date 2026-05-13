/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Internal Adapter Contract (Pass 1)
 * ═══════════════════════════════════════════════════════════
 *
 *  Status: INTERNAL — not exported from any package index.ts.
 *
 *  This module defines the structural contract every workspace
 *  adapter implements going forward. It is consumed only by the
 *  internal adapter registry (./adapter-registry.ts) and by the
 *  runner-bridge layer; it is NOT part of the v1.x public surface
 *  of @arch-engine/cli or @arch-engine/adapter-monorepo.
 *
 *  Pass 1 scope:
 *    - Land the type contract.
 *    - Provide a registry-friendly structural shape.
 *    - Do NOT widen JSON v1/v2 output.
 *    - Do NOT introduce new ARCH_ENGINE_* codes.
 *
 *  Forward references:
 *    - docs/adapters/multi-adapter-surface-spec.md §6.1–§6.4
 *    - audits/ARCH_ENGINE_MULTI_ADAPTER_SURFACE_SPECIFICATION_AUDIT.md
 *
 *  Determinism invariants (locked here for Pass 1):
 *    - Adapters MUST NOT mutate cwd, env, or process state.
 *    - Adapters MUST NOT open sockets or call child processes.
 *    - Adapters MUST NOT execute repository-controlled JavaScript.
 *    - Adapters MUST produce byte-identical output across runs.
 *    - Adapters MUST emit relative POSIX paths only.
 *
 *  These invariants are documented for adapter authors. Pass 1
 *  ships only the structural contract; full conformance tests
 *  arrive in Pass 2 / Phase H.
 */

// ─── Adapter Identity ───────────────────────────────────

/**
 * Stable adapter identity. Surfaced to JSON v2 `data.adapter` in
 * Pass 2 — Pass 1 keeps the identity internal and does not render
 * it.
 */
export interface AdapterIdentity {
  /** Stable name. Mirrors the npm package name when possible. */
  readonly adapterName: string;
  /** Semver string matching the adapter package's version. */
  readonly adapterVersion: string;
}

// ─── Adapter Context ────────────────────────────────────

/**
 * Read-only context passed to every adapter call. The CLI populates
 * `cwd` and a fresh `cache` per invocation; future passes may add
 * pre-resolved file/dir helpers per spec §6.1, but Pass 1 keeps
 * the surface minimal so we don't churn the contract during
 * implementation.
 */
export interface AdapterContext {
  /** Absolute path to the repository root being analysed. */
  readonly cwd: string;
  /** Adapter-private storage for cross-step state (detect → extract). */
  readonly cache: Map<string, unknown>;
}

// ─── Detection Result ───────────────────────────────────

/**
 * Three-tier confidence per spec §6.2. NONE is reserved for
 * "adapter explicitly opts out" — distinct from LOW, which means
 * "I would handle this but the signal is weak". Pass 1 uses NONE
 * only when `detected === false`.
 */
export type AdapterConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/**
 * Inferred package manager. `unknown` is reserved for adapters that
 * cannot identify the manager (e.g. single-package fallback).
 */
export type AdapterPackageManager =
  | 'pnpm'
  | 'yarn'
  | 'npm'
  | 'yarn-pnp'
  | 'unknown';

/**
 * Adapter-level diagnostic. Intentionally narrower than the
 * CLI-level `CliDiagnostic` so adapters need not depend on the
 * CLI's error-codes table. The CLI maps these to
 * `ARCH_ENGINE_*` codes when it surfaces them — Pass 1 does not
 * yet surface any of these to user-visible output.
 */
export interface AdapterDiagnostic {
  /** Canonical code; the CLI maps these to ARCH_ENGINE_* codes. */
  readonly code: string;
  /** Severity hint; the CLI may upgrade/downgrade based on context. */
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
  /** Per-occurrence message. */
  readonly message: string;
  /** Optional relative POSIX path the diagnostic relates to. */
  readonly path?: string;
  /** Optional structured context (sorted keys for determinism). */
  readonly details?: Record<string, unknown>;
}

/**
 * Result of an adapter's cheap, side-effect-free detection probe.
 * Mirrors spec §6.2.
 */
export interface AdapterDetectionResult {
  /** Owning adapter identity (echoed back for consumer convenience). */
  readonly adapterName: string;
  /** True when this adapter is willing to extract. */
  readonly detected: boolean;
  /** Confidence tier — HIGH/MEDIUM/LOW/NONE. */
  readonly confidence: AdapterConfidence;
  /** Canonical workspace shape this adapter would handle. */
  readonly workspaceKind: string;
  /** Inferred package manager. */
  readonly packageManager: AdapterPackageManager;
  /** Human-readable reasons (file paths checked, decisions made). */
  readonly reasons: ReadonlyArray<string>;
  /** Soft warnings — present at HIGH confidence too. */
  readonly warnings: ReadonlyArray<string>;
  /** Structured diagnostics (mappable to ARCH_ENGINE_* codes). */
  readonly diagnostics: ReadonlyArray<AdapterDiagnostic>;
}

// ─── Topology Result ────────────────────────────────────

/**
 * Canonical node id. Currently a workspace package name; locked by
 * the canonical-topology contract.
 */
export interface AdapterCanonicalNode {
  readonly id: string;
  readonly [key: string]: unknown;
}

/**
 * Canonical edge id. Stable `e_<hex8>` per canonical-topology spec.
 */
export interface AdapterCanonicalEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
  readonly [key: string]: unknown;
}

/**
 * Adapter topology output per spec §6.3. Pass 1 reads this through
 * the registry path but the CLI's user-visible rendering continues
 * to consume the legacy `MonorepoExtractionResult` shape; Pass 2
 * adds the `data.adapter` JSON v2 block that surfaces this directly.
 */
export interface AdapterTopologyResult {
  /** Locked at "1.0.0" by the canonical-topology contract. */
  readonly graphSurfaceVersion: '1.0.0';
  /** sha256 of the canonical (sorted_nodes, sorted_edges) pair. */
  readonly graphSurfaceHash: string;
  /** Canonical nodes (sorted by id). */
  readonly nodes: ReadonlyArray<AdapterCanonicalNode>;
  /** Canonical edges (sorted by id). */
  readonly edges: ReadonlyArray<AdapterCanonicalEdge>;
  /** Adapter-supplied signal payload (workspace type, mode, etc.). */
  readonly signals: AdapterSignalPayload;
  /** Coverage [0, 1] — fraction of detected packages with a name. */
  readonly coverage: number;
  /** Confidence carried forward from detect(); may be downgraded. */
  readonly confidence: AdapterConfidence;
  /** Relative POSIX paths of every file the adapter read. */
  readonly sourceFiles: ReadonlyArray<string>;
  /** Adapter-private metadata; surfaces under `data.adapter.metadata` in Pass 2. */
  readonly adapterMetadata: Readonly<Record<string, unknown>>;
  /** Structured diagnostics emitted during extraction. */
  readonly diagnostics: ReadonlyArray<AdapterDiagnostic>;
}

/**
 * Adapter signal payload — the legacy `workspace.type` /
 * `workspace.mode` etc. exposed via JSON v1 `signals.workspace.*`.
 * Pass 1 preserves the existing keys verbatim; future passes may
 * extend this with adapter-specific signals under nested keys.
 */
export interface AdapterSignalPayload {
  /** Workspace type ("yarn-npm", "pnpm", "single", etc.). */
  readonly workspaceType: string;
  /** Extraction mode ("structured", "fallback_directory_scan", etc.). */
  readonly extractionMode: string;
  /** Reserved for adapter-supplied extra signals. */
  readonly [key: string]: unknown;
}

// ─── Capability Summary (optional) ──────────────────────

/**
 * Optional self-description per spec §6.1. Pass 1 defines the
 * shape; consumers may call `explain?.()` if available, but the
 * CLI does not yet surface this to user output. Pass 2 wires it
 * to `arch-engine doctor --verbose` and to `data.adapter.metadata`.
 *
 * Locked field: `executesRepositoryCode: false`. Any adapter
 * setting this to `true` violates the determinism contract; the
 * field exists explicitly as a contract-level invariant.
 */
export interface AdapterCapabilitySummary {
  readonly adapterName: string;
  readonly supportsPackageJsonWorkspaces: boolean;
  readonly supportsPnpmWorkspaces: boolean;
  readonly supportsYarnPnp: boolean;
  /**
   * MUST be false. Documented invariant; conformance tests in Pass
   * 2 will static-check this.
   */
  readonly executesRepositoryCode: false;
  readonly readsLockfile: boolean;
  /** Free-form human notes; surfaces only via --verbose. */
  readonly notes: ReadonlyArray<string>;
}

// ─── Adapter Interface ──────────────────────────────────

/**
 * The structural contract every workspace adapter implements.
 * Locked by spec §6.1.
 *
 * Adapters are consumed by the internal registry via structural
 * typing: they need not import this interface — they only need to
 * expose the same field names and shapes. This keeps
 * `@arch-engine/adapter-monorepo` and future adapter packages free
 * of any dependency on `@arch-engine/cli`.
 */
export interface ArchitectureAdapter extends AdapterIdentity {
  /** Cheap, side-effect-free probe. */
  detect(context: AdapterContext): AdapterDetectionResult;
  /** Full topology extraction. Called when this adapter wins selection. */
  extractTopology(context: AdapterContext): AdapterTopologyResult;
  /** Optional self-description; consumers must tolerate absence. */
  explain?(): AdapterCapabilitySummary;
}

// ─── Construction Helpers ───────────────────────────────

/**
 * Construct a fresh AdapterContext for the given cwd. The CLI calls
 * this once per invocation. The cache map is intentionally fresh so
 * adapters cannot accidentally retain state across runs.
 */
export function createAdapterContext(cwd: string): AdapterContext {
  return {
    cwd,
    cache: new Map<string, unknown>(),
  };
}

/**
 * Structural type-guard. Useful when consuming an adapter loaded
 * from an external module (e.g. dynamic import of
 * `@arch-engine/adapter-monorepo`) without a static type binding.
 *
 * Pass 1: callers may pass a candidate through this guard to assert
 * the structural shape before adding to the registry. The guard is
 * deliberately permissive on field types — it checks presence and
 * callability of the required methods.
 */
export function isArchitectureAdapter(
  candidate: unknown,
): candidate is ArchitectureAdapter {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.adapterName === 'string' &&
    typeof obj.adapterVersion === 'string' &&
    typeof obj.detect === 'function' &&
    typeof obj.extractTopology === 'function'
  );
}
