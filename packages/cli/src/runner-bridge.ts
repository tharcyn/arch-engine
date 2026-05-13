/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Runner Bridge
 * ═══════════════════════════════════════════════════════════
 *
 *  Strict contract:
 *  - Resolve the active workspace adapter via the internal registry.
 *  - Instantiate EngineRunner.
 *  - Load resolved config / autodiscovery result.
 *  - Return normalized execution result with timing telemetry and
 *    structural adapter metadata (Pass 2 — surfaced under JSON v2
 *    `data.adapter`).
 *
 *  Adapter selection (Pass 2 + Pass 3, per
 *  docs/adapters/multi-adapter-surface-spec.md §7):
 *
 *    candidates (in precedence order):
 *      2 — @arch-engine/adapter-pnpm        (if installed)
 *      3 — @arch-engine/adapter-yarn-pnp    (if installed)
 *      4 — @arch-engine/adapter-monorepo    (always loadable)
 *
 *  The bridge:
 *    1. Lazily imports all three adapter packages. Any may be absent.
 *    2. Builds an adapter context with cache hints so lower-
 *       precedence adapters can decline overlapping signals:
 *         - `archengine:pnpmAdapterAvailable` — pnpm wins
 *            pnpm-workspace.yaml
 *         - `archengine:yarnPnpAdapterAvailable` — yarn-pnp wins
 *            .pnp.cjs / .pnp.loader.mjs
 *    3. Runs `selectArchitectureAdapter` and classifies the result.
 *    4. Dispatches to the chosen adapter's legacy-shape helper —
 *       `runPnpmExtraction(cwd)`, `runYarnPnpExtraction(cwd)`, or
 *       `runMonorepoExtraction(cwd)` — so downstream code consumes
 *       the unchanged `MonorepoExtractionResult` shape.
 *    5. Promotes adapter-level diagnostics to ARCH_ENGINE_* codes
 *       and propagates them up via the bridge result.
 */

import {
  EngineRunner,
  parseEngineManifest,
  type EngineExecutionResult,
  type EngineExecutionState,
} from '@arch-engine/core';

import type { ExecutionMetrics } from './snapshot.js';
import {
  createAdapterContext,
  isArchitectureAdapter,
  type ArchitectureAdapter,
  type AdapterDetectionResult,
} from './adapters/adapter-contract.js';
import {
  selectArchitectureAdapter,
  registerArchitectureAdapter,
  type AdapterSelectionResult,
} from './adapters/adapter-registry.js';
import {
  buildDiagnostic,
  type CliDiagnostic,
} from './format-error.js';

// ─── Lazy Adapter Resolution ────────────────────────────
// The monorepo adapter is an optional peer dependency.
// It must never be statically imported at module scope —
// CLI startup (--version, --help) must succeed without it.

type AdapterModule = typeof import('@arch-engine/adapter-monorepo');
type PnpmAdapterModule = typeof import('@arch-engine/adapter-pnpm');
type YarnPnpAdapterModule = typeof import('@arch-engine/adapter-yarn-pnp');

export async function loadMonorepoAdapter(): Promise<AdapterModule> {
  try {
    return await import('@arch-engine/adapter-monorepo');
  } catch {
    throw new Error(
      'This command requires @arch-engine/adapter-monorepo.\n\n' +
      'Install it with:\n\n' +
      '  npm install @arch-engine/adapter-monorepo\n',
    );
  }
}

async function tryLoadPnpmAdapter(): Promise<PnpmAdapterModule | null> {
  try {
    return await import('@arch-engine/adapter-pnpm');
  } catch {
    return null;
  }
}

async function tryLoadYarnPnpAdapter(): Promise<YarnPnpAdapterModule | null> {
  try {
    return await import('@arch-engine/adapter-yarn-pnp');
  } catch {
    return null;
  }
}

// ─── Adapter selection summary (used by commands → JSON v2) ──────

/**
 * Structural adapter-selection summary the bridge surfaces to
 * commands. Commands fold this into `data.adapter` in JSON v2 output.
 *
 * Pass 2 keeps this opaque enough that future adapters (yarn-pnp,
 * bun, …) can supply their own metadata without churning the bridge
 * surface.
 */
export interface BridgeAdapterSummary {
  readonly name: string;
  readonly version: string;
  readonly packageManager: string;
  readonly workspaceKind: string;
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  readonly reasons: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly alsoDetected: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
    readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    readonly reasons: ReadonlyArray<string>;
  }>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ─── Result Contract ────────────────────────────────────

export interface BridgeExecutionResult {
  engineResult: EngineExecutionResult;
  extractionMetadata: import('@arch-engine/adapter-monorepo').ExtractionMetadata;
  adjacencyMap: Record<string, string[]>;
  isAutoDiscovered: boolean;
  autoDiscoveryMessage?: string;
  durationMs: number;
  executionMetrics: ExecutionMetrics;
  /**
   * Pass 2 additive — full legacy-shape extraction. Identical to
   * `runMonorepoExtraction(cwd)` for monorepo-served extractions;
   * for pnpm-served extractions, the bridge converts the pnpm
   * adapter's output into the same shape so downstream code
   * (`renderers`, `analyze`, `inspect`, `doctor`) stays unchanged.
   */
  extractionLegacy: import('@arch-engine/adapter-monorepo').MonorepoExtractionResult;
  /**
   * Pass 2 additive — structural adapter identity for JSON v2
   * `data.adapter`. Always populated (defaults to the monorepo
   * adapter when no other candidate detected).
   */
  adapterSummary: BridgeAdapterSummary;
  /**
   * Pass 2 additive — adapter-level diagnostics promoted to
   * ARCH_ENGINE_* codes. Already deduped/sorted. Commands fold these
   * into their `diagnostics: []` arrays.
   */
  adapterDiagnostics: ReadonlyArray<CliDiagnostic>;
}

/**
 * Execute the full pipeline: adapter selection → extraction → engine
 * reasoning. Captures per-phase timing telemetry.
 */
export async function executeRunnerBridge(
  cwd: string,
  discoveryResult: import('./autodiscovery.js').DiscoveryResult,
): Promise<BridgeExecutionResult> {
  const totalStart = Date.now();

  // 1. Resolve all three adapters lazily.
  const monorepoModule = await loadMonorepoAdapter();
  const pnpmModule = await tryLoadPnpmAdapter();
  const yarnPnpModule = await tryLoadYarnPnpAdapter();

  // 2. Build registry. Lower number = higher priority.
  const registry = [] as ReturnType<typeof registerArchitectureAdapter>[];
  if (pnpmModule) {
    const candidate = (pnpmModule.pnpmArchitectureAdapter as unknown);
    if (isArchitectureAdapter(candidate as ArchitectureAdapter)) {
      registry.push(registerArchitectureAdapter(candidate as ArchitectureAdapter, 2));
    }
  }
  if (yarnPnpModule) {
    const candidate = (yarnPnpModule.yarnPnpArchitectureAdapter as unknown);
    if (isArchitectureAdapter(candidate as ArchitectureAdapter)) {
      registry.push(registerArchitectureAdapter(candidate as ArchitectureAdapter, 3));
    }
  }
  if (monorepoModule.monorepoArchitectureAdapter) {
    const candidate = monorepoModule.monorepoArchitectureAdapter as unknown;
    if (isArchitectureAdapter(candidate as ArchitectureAdapter)) {
      registry.push(registerArchitectureAdapter(candidate as ArchitectureAdapter, 4));
    }
  }

  // 3. Construct adapter context with cache hints so lower-precedence
  //    adapters can decline overlapping signals:
  //      - pnpm wins pnpm-workspace.yaml
  //      - yarn-pnp wins .pnp.cjs / .pnp.loader.mjs
  const ctx = createAdapterContext(cwd);
  if (pnpmModule) {
    ctx.cache.set('archengine:pnpmAdapterAvailable', true);
  }
  if (yarnPnpModule) {
    ctx.cache.set('archengine:yarnPnpAdapterAvailable', true);
  }

  // 4. Run deterministic selection.
  const selection = registry.length > 0
    ? selectArchitectureAdapter(registry, ctx)
    : null;

  const adapterDiagnostics: CliDiagnostic[] = [];

  // 5. Dispatch to the chosen adapter's legacy-shape helper.
  const extractionStart = Date.now();
  let extraction: ReturnType<typeof monorepoModule.runMonorepoExtraction>;
  let adapterSummary: BridgeAdapterSummary;

  if (selection && selection.status === 'CONFLICT') {
    const winner = selection.selected!;
    const loser = selection.runnersUp[0]!.adapter;
    const detail = {
      chosen: winner.adapter.adapterName,
      conflictingAdapters: [winner.adapter.adapterName, loser.adapter.adapterName],
    };
    adapterDiagnostics.push(
      buildDiagnostic({
        code: 'ARCH_ENGINE_ADAPTER_CONFLICT',
        title: 'Multiple workspace adapters matched this repository.',
        message:
          `Both \`${winner.adapter.adapterName}\` and \`${loser.adapter.adapterName}\` reported HIGH confidence. ` +
          `Resolve by removing the conflicting workspace declaration, or install only one of the conflicting adapters.`,
        details: detail,
      }),
    );
    // Conflict → throw so the calling command can exit 3 cleanly.
    throw new BridgeAdapterConflictError(adapterDiagnostics);
  }

  if (
    selection &&
    selection.selected &&
    selection.selected.adapter.adapterName === 'pnpm' &&
    pnpmModule
  ) {
    const result = pnpmModule.runPnpmExtraction(cwd);
    if (!result) {
      // pnpm-workspace.yaml disappeared between selection and extract,
      // or detection found something extract couldn't. Fall back.
      extraction = monorepoModule.runMonorepoExtraction(cwd);
      adapterSummary = buildSummaryForMonorepo(monorepoModule, selection);
    } else {
      // Adapt pnpm legacy shape → MonorepoExtractionResult shape.
      extraction = result as unknown as ReturnType<typeof monorepoModule.runMonorepoExtraction>;
      // Promote pnpm diagnostics to CLI diagnostics.
      for (const d of result.adapterInfo.diagnostics) {
        const code = d.code as Parameters<typeof buildDiagnostic>[0]['code'];
        adapterDiagnostics.push(
          buildDiagnostic({
            code,
            message: d.message,
            details: d.details,
          }),
        );
      }
      adapterSummary = {
        name: result.adapterInfo.name,
        version: result.adapterInfo.version,
        packageManager: 'pnpm',
        workspaceKind: 'pnpm-workspace',
        confidence: result.adapterInfo.confidence,
        reasons: result.adapterInfo.reasons,
        warnings: result.adapterInfo.warnings,
        alsoDetected: selection.runnersUp.map((r) => ({
          name: prettyAdapterName(r.adapter.adapter.adapterName),
          version: r.adapter.adapter.adapterVersion,
          confidence: r.detection.confidence,
          reasons: r.detection.reasons,
        })),
        metadata: {
          pnpm: result.adapterInfo.metadata.pnpm,
          edges: result.adapterInfo.metadata.edges,
          graphSurfaceHash: result.adapterInfo.graphSurfaceHash,
          sourceFiles: result.adapterInfo.sourceFiles,
        },
      };
    }
  } else if (
    selection &&
    selection.selected &&
    selection.selected.adapter.adapterName === 'yarn-pnp' &&
    yarnPnpModule
  ) {
    // Pass 3 — yarn-pnp dispatch branch.
    const result = yarnPnpModule.runYarnPnpExtraction(cwd);
    if (!result) {
      // PnP signals disappeared between detection and extraction
      // (unlikely but defensible). Fall back to monorepo.
      extraction = monorepoModule.runMonorepoExtraction(cwd);
      adapterSummary = buildSummaryForMonorepo(monorepoModule, selection);
    } else {
      extraction = result as unknown as ReturnType<
        typeof monorepoModule.runMonorepoExtraction
      >;
      for (const d of result.adapterInfo.diagnostics) {
        const code = d.code as Parameters<typeof buildDiagnostic>[0]['code'];
        adapterDiagnostics.push(
          buildDiagnostic({
            code,
            message: d.message,
            details: d.details,
          }),
        );
      }
      adapterSummary = {
        name: result.adapterInfo.name,
        version: result.adapterInfo.version,
        packageManager: 'yarn',
        workspaceKind: 'yarn-pnp',
        confidence: result.adapterInfo.confidence,
        reasons: result.adapterInfo.reasons,
        warnings: result.adapterInfo.warnings,
        alsoDetected: selection.runnersUp.map((r) => ({
          name: prettyAdapterName(r.adapter.adapter.adapterName),
          version: r.adapter.adapter.adapterVersion,
          confidence: r.detection.confidence,
          reasons: r.detection.reasons,
        })),
        metadata: {
          yarnPnp: result.adapterInfo.metadata.yarnPnp,
          edges: result.adapterInfo.metadata.edges,
          graphSurfaceHash: result.adapterInfo.graphSurfaceHash,
          sourceFiles: result.adapterInfo.sourceFiles,
        },
      };
    }
  } else {
    // Default path: monorepo adapter (or no adapter selected → still
    // call monorepo's runMonorepoExtraction for fallback parity).
    extraction = monorepoModule.runMonorepoExtraction(cwd);

    if (selection) {
      if (selection.status === 'LOW_CONFIDENCE') {
        adapterDiagnostics.push(
          buildDiagnostic({
            code: 'ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE',
            message:
              'No workspace adapter reported HIGH or MEDIUM confidence. ' +
              'Falling back to the lowest-confidence detection.',
            details: pnpmModule
              ? undefined
              : { suggestion: 'npm install --save-dev @arch-engine/adapter-pnpm' },
          }),
        );
      }
      adapterSummary = selection.selected
        ? buildSummaryFromSelection(monorepoModule, selection)
        : buildSummaryForMonorepo(monorepoModule, selection);
    } else {
      adapterSummary = buildSummaryForMonorepo(monorepoModule, null);
    }
  }
  const extractionMs = Date.now() - extractionStart;

  // 6. Create engine manifest (unchanged).
  const manifest = parseEngineManifest({
    engine_id: 'arch-engine-cli',
    engine_version: '1.0.0-rc.3',
    schema_versions: {
      capability_schema: '1.0.0',
      topology_schema: '1.0.0',
      entity_identity_schema: '1.0.0',
      reasoning_protocol: '1.0.0',
      adapter_contract: '1.0.0',
      mutation_model: '1.0.0',
      authority_model: '1.0.0',
      confidence_model: '1.0.0',
    },
    supported_adapter_contract_versions: ['1.0.0'],
    minimum_adapter_contract_version: '1.0.0',
    models: {
      mutation_hierarchy: 'canonical-v1',
      authority_scoring: 'trust-weighted-v1',
      confidence_propagation: 'minimum-path-v1',
    },
  });

  const runner = new EngineRunner(manifest, {
    logger: discoveryResult.isFallback ? () => {} : console.log,
  });

  // 7. Map adapter output to EngineExecutionState (unchanged).
  const state: EngineExecutionState = {
    adjacencyMap: extraction.adjacencyMap as any,
    routeServiceMap: { forward: extraction.routeServiceMap.forward as any, reverse: {} },
    crossings: extraction.authorityCrossings,
    edgesByAdapter: extraction.edgesByAdapter as any,
  };

  // 8. Execute reasoning pipeline (timed).
  const pipelineStart = Date.now();
  const engineResult = await runner.executePipeline(state);
  const pipelineMs = Date.now() - pipelineStart;

  const totalMs = Date.now() - totalStart;

  return {
    engineResult,
    extractionMetadata: extraction.metadata,
    adjacencyMap: extraction.adjacencyMap,
    extractionLegacy: extraction as unknown as import('@arch-engine/adapter-monorepo').MonorepoExtractionResult,
    isAutoDiscovered: discoveryResult.isFallback,
    autoDiscoveryMessage: discoveryResult.message,
    durationMs: totalMs,
    executionMetrics: {
      extractionMs,
      pipelineMs,
      totalMs,
    },
    adapterSummary,
    adapterDiagnostics,
  };
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Bridge-level conflict error. Commands catch this and exit 3 with
 * the embedded ARCH_ENGINE_ADAPTER_CONFLICT diagnostic.
 */
export class BridgeAdapterConflictError extends Error {
  public readonly diagnostics: ReadonlyArray<CliDiagnostic>;
  constructor(diagnostics: ReadonlyArray<CliDiagnostic>) {
    super('Workspace adapter selection conflict.');
    this.name = 'BridgeAdapterConflictError';
    this.diagnostics = diagnostics;
  }
}

function buildSummaryFromSelection(
  monorepoModule: AdapterModule,
  selection: AdapterSelectionResult,
): BridgeAdapterSummary {
  const sel = selection.selected!.adapter;
  const det = selection.detection!;
  return {
    name: prettyAdapterName(sel.adapterName),
    version: sel.adapterVersion,
    packageManager: det.packageManager,
    workspaceKind: det.workspaceKind,
    confidence: det.confidence,
    reasons: det.reasons,
    warnings: det.warnings,
    alsoDetected: selection.runnersUp.map((r) => ({
      name: prettyAdapterName(r.adapter.adapter.adapterName),
      version: r.adapter.adapter.adapterVersion,
      confidence: r.detection.confidence,
      reasons: r.detection.reasons,
    })),
    metadata: {},
  };
}

function buildSummaryForMonorepo(
  monorepoModule: AdapterModule,
  selection: AdapterSelectionResult | null,
): BridgeAdapterSummary {
  const det: AdapterDetectionResult | null = selection?.detection ?? null;
  return {
    name: '@arch-engine/adapter-monorepo',
    version:
      (monorepoModule as any).monorepoArchitectureAdapter?.adapterVersion ?? '1.2.0',
    packageManager: det?.packageManager ?? 'npm',
    workspaceKind: det?.workspaceKind ?? 'package-json-workspaces',
    confidence: det?.confidence ?? 'HIGH',
    reasons: det?.reasons ?? [],
    warnings: det?.warnings ?? [],
    alsoDetected:
      selection?.runnersUp.map((r) => ({
        name: prettyAdapterName(r.adapter.adapter.adapterName),
        version: r.adapter.adapter.adapterVersion,
        confidence: r.detection.confidence,
        reasons: r.detection.reasons,
      })) ?? [],
    metadata: {},
  };
}

/**
 * Map an internal adapter `adapterName` (e.g. `pnpm`,
 * `@arch-engine/adapter-monorepo`) to the npm-package-style identifier
 * surfaced under `data.adapter.name` in JSON v2.
 */
function prettyAdapterName(internal: string): string {
  if (internal === 'pnpm') return '@arch-engine/adapter-pnpm';
  if (internal === 'yarn-pnp') return '@arch-engine/adapter-yarn-pnp';
  if (internal.startsWith('@arch-engine/')) return internal;
  return internal;
}
