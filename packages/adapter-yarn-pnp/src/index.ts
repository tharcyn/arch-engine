/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-yarn-pnp
 * ═══════════════════════════════════════════════════════════
 *
 *  Yarn Berry / Plug'n'Play workspace adapter implementing the
 *  internal `ArchitectureAdapter` shape locked in
 *  `docs/adapters/multi-adapter-surface-spec.md` §6.1.
 *
 *  Public surface (Pass 3 MVP):
 *    - YarnPnpArchitectureAdapter        (class)
 *    - createYarnPnpArchitectureAdapter()(factory)
 *    - yarnPnpArchitectureAdapter        (singleton)
 *    - runYarnPnpExtraction(cwd)         (legacy-shape helper)
 *
 *  This package has NO runtime dependency on `@arch-engine/cli`. The
 *  CLI's internal registry consumes the class via structural typing.
 *
 *  Pass 3 safety invariants:
 *    - No execution of `.pnp.cjs` or `.pnp.loader.mjs`.
 *    - No `import()` of any repo-controlled JavaScript.
 *    - No invocation of any package-manager binary (no yarn).
 *    - No network.
 *    - No mutation of cwd.
 *    - No reading of `node_modules/`, `.yarn/cache`, `.yarn/unplugged`.
 *    - Deterministic byte-identical output on repeated runs.
 *
 *  Detection model (MVP):
 *    - HIGH:   .pnp.cjs OR .pnp.loader.mjs exists + valid package.json
 *              + workspaces field + at least one workspace package matches.
 *    - MEDIUM: PnP file exists + valid package.json + workspaces field
 *              but globs match no packages.
 *    - LOW:    PnP file exists but workspaces field is missing/malformed.
 *    - NONE:   No PnP file at the repository root.
 *
 *  Diagnostic invariants:
 *    - `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` is always emitted (INFO)
 *      when a PnP file exists, even at HIGH confidence — it explains
 *      that full PnP resolver parity is intentionally deferred. The
 *      diagnostic does not block extraction and does not affect exit
 *      codes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import {
  readYarnRootManifest,
  readYarnrc,
  resolveNodeLinker,
  type YarnRootManifest,
  type YarnPnpNodeLinkerSource,
} from './yarn-workspaces.js';
import { expandWorkspaceGlobs, type GlobExpansion } from './globs.js';
import {
  buildYarnPnpPackageGraph,
  type YarnPnpEdgeMetadata,
} from './package-graph.js';

// ─── Local contract types (structural, no CLI import) ────

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export interface YarnPnpAdapterContext {
  readonly cwd: string;
  readonly cache: Map<string, unknown>;
}

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export type YarnPnpAdapterConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export type YarnPnpAdapterPackageManager =
  | 'pnpm'
  | 'yarn'
  | 'npm'
  | 'yarn-pnp'
  | 'unknown';

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export interface YarnPnpAdapterDiagnostic {
  readonly code: string;
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
  readonly message: string;
  readonly path?: string;
  readonly details?: Record<string, unknown>;
}

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export interface YarnPnpAdapterDetectionResult {
  readonly adapterName: string;
  readonly detected: boolean;
  readonly confidence: YarnPnpAdapterConfidence;
  readonly workspaceKind: string;
  readonly packageManager: YarnPnpAdapterPackageManager;
  readonly reasons: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<YarnPnpAdapterDiagnostic>;
}

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export interface YarnPnpAdapterCanonicalNode {
  readonly id: string;
  readonly type: 'package';
}

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export interface YarnPnpAdapterCanonicalEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
}

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export interface YarnPnpAdapterSignalPayload {
  readonly workspaceType: string;
  readonly extractionMode: string;
  readonly [key: string]: unknown;
}

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export interface YarnPnpAdapterTopologyResult {
  readonly graphSurfaceVersion: '1.0.0';
  readonly graphSurfaceHash: string;
  readonly nodes: ReadonlyArray<YarnPnpAdapterCanonicalNode>;
  readonly edges: ReadonlyArray<YarnPnpAdapterCanonicalEdge>;
  readonly signals: YarnPnpAdapterSignalPayload;
  readonly coverage: number;
  readonly confidence: YarnPnpAdapterConfidence;
  readonly sourceFiles: ReadonlyArray<string>;
  readonly adapterMetadata: Readonly<Record<string, unknown>>;
  readonly diagnostics: ReadonlyArray<YarnPnpAdapterDiagnostic>;
}

/** @internal Pass 3 contract surface; not part of v1.x freeze. */
export interface YarnPnpAdapterCapabilitySummary {
  readonly adapterName: string;
  readonly supportsPackageJsonWorkspaces: boolean;
  readonly supportsPnpmWorkspaces: boolean;
  readonly supportsYarnPnp: boolean;
  readonly executesRepositoryCode: false;
  readonly readsLockfile: boolean;
  readonly notes: ReadonlyArray<string>;
}

// ─── Legacy-shape extraction result (consumed by the CLI bridge) ──

export interface YarnPnpExtractionMetadata {
  coverage: number;
  connectivity: number;
  topologyConfidence: number;
  detectedNodes: number;
  connectedNodes: number;
  expectedNodes: number;
  warnings: string[];
  workspaceType: string;
  extractionMode: string;
}

export interface YarnPnpRouteServiceMapping {
  backend_route: string;
}

export interface YarnPnpExtractionResult {
  metadata: YarnPnpExtractionMetadata;
  adjacencyMap: Record<string, string[]>;
  routeServiceMap: { forward: Record<string, YarnPnpRouteServiceMapping> };
  authorityCrossings: any[];
  edgesByAdapter: Record<string, unknown>;
  /**
   * Pass 3 extra (not in the legacy MonorepoExtractionResult). Carries
   * the structural metadata the CLI surfaces under `data.adapter` and
   * the diagnostics the runtime promotes to ARCH_ENGINE_* codes.
   */
  adapterInfo: {
    name: string;
    version: string;
    confidence: YarnPnpAdapterConfidence;
    reasons: string[];
    warnings: string[];
    diagnostics: YarnPnpAdapterDiagnostic[];
    metadata: {
      yarnPnp: {
        /**
         * Parsed yarn version from `package.json#packageManager`
         * (e.g. `"4.0.2"` for `"yarn@4.0.2"`). `null` when absent or
         * not yarn. Always serialised — never `undefined`.
         */
        packageManagerVersion: string | null;
        pnpFilePresent: boolean;
        pnpLoaderPresent: boolean;
        yarnrcPresent: boolean;
        /**
         * Surfaced node-linker value. Either:
         *   - the value parsed from `.yarnrc.yml#nodeLinker`, or
         *   - `"pnp"` when a `.pnp.cjs` / `.pnp.loader.mjs` is
         *     present and `.yarnrc.yml` did not declare nodeLinker
         *     (matches Yarn Berry's documented default), or
         *   - `null` when neither signal is present.
         * Pair with `nodeLinkerSource` to distinguish the cases.
         */
        nodeLinker: 'pnp' | 'node-modules' | 'pnpm' | 'unknown' | null;
        /**
         * Provenance tag for `nodeLinker`. Added in v0.1.1 trust
         * polish so JSON v2 consumers can distinguish explicit-yarnrc,
         * inferred-from-PnP-file, and absent cases without ambiguity.
         * Always present.
         */
        nodeLinkerSource: YarnPnpNodeLinkerSource;
        workspacesPresent: boolean;
        workspacesObjectForm: boolean;
        rawGlobs: string[];
        excludedGlobs: string[];
        matchedGlobs: string[];
      };
      edges: Record<string, YarnPnpEdgeMetadata>;
    };
    graphSurfaceHash: string;
    sourceFiles: string[];
  };
}

// ─── Internal extraction state (shared by detect / extract / legacy) ──

interface InternalYarnPnpState {
  readonly pnpFilePresent: boolean;
  readonly pnpLoaderPresent: boolean;
  readonly yarnrcPresent: boolean;
  readonly nodeLinker: 'pnp' | 'node-modules' | 'pnpm' | 'unknown' | null;
  /**
   * Provenance of `nodeLinker`. Resolved by `resolveNodeLinker()`
   * from the explicit yarnrc value plus the PnP file signals so the
   * adapter never has to compute it twice.
   */
  readonly nodeLinkerSource: YarnPnpNodeLinkerSource;
  readonly manifest: YarnRootManifest | null;
  readonly globExpansion: GlobExpansion | null;
}

function probeWorkspace(cwd: string): InternalYarnPnpState {
  const pnpFileAbs = path.join(cwd, '.pnp.cjs');
  const pnpLoaderAbs = path.join(cwd, '.pnp.loader.mjs');
  const yarnrcAbs = path.join(cwd, '.yarnrc.yml');

  const pnpFilePresent = fs.existsSync(pnpFileAbs);
  const pnpLoaderPresent = fs.existsSync(pnpLoaderAbs);
  const yarnrcPresent = fs.existsSync(yarnrcAbs);
  const yarnrc = yarnrcPresent ? readYarnrc(cwd) : null;

  // v0.1.1 trust polish: surface `nodeLinker` deterministically.
  // When `.yarnrc.yml#nodeLinker` is absent but a PnP file exists,
  // Yarn Berry's documented default is `pnp` — the adapter now
  // reports that explicitly with `nodeLinkerSource: "inferred_from_pnp_file"`
  // rather than the previous (technically literal but confusing)
  // `null`. Pure metadata-only change; selection/extraction/hash
  // unaffected.
  const resolved = resolveNodeLinker(
    yarnrc?.nodeLinker ?? null,
    pnpFilePresent,
    pnpLoaderPresent,
  );

  // No PnP signals at all → don't bother reading the manifest. The
  // adapter is opting out.
  if (!pnpFilePresent && !pnpLoaderPresent) {
    return {
      pnpFilePresent: false,
      pnpLoaderPresent: false,
      yarnrcPresent,
      nodeLinker: resolved.nodeLinker,
      nodeLinkerSource: resolved.nodeLinkerSource,
      manifest: null,
      globExpansion: null,
    };
  }

  const manifest = readYarnRootManifest(cwd);
  const globExpansion =
    manifest && manifest.globs.length > 0
      ? expandWorkspaceGlobs(cwd, manifest.globs)
      : null;

  return {
    pnpFilePresent,
    pnpLoaderPresent,
    yarnrcPresent,
    nodeLinker: resolved.nodeLinker,
    nodeLinkerSource: resolved.nodeLinkerSource,
    manifest,
    globExpansion,
  };
}

// ─── Public class ─────────────────────────────────────

const ADAPTER_NAME = 'yarn-pnp' as const;
const ADAPTER_VERSION = '0.1.0' as const;

/**
 * Yarn PnP adapter implementation. Structurally compatible with the
 * internal `ArchitectureAdapter` shape locked in
 * `docs/adapters/multi-adapter-surface-spec.md` §6.1.
 */
export class YarnPnpArchitectureAdapter {
  readonly adapterName: string = ADAPTER_NAME;
  readonly adapterVersion: string = ADAPTER_VERSION;

  detect(context: YarnPnpAdapterContext): YarnPnpAdapterDetectionResult {
    const state = probeWorkspace(context.cwd);
    // Pass 3 protocol: if pnpm-workspace.yaml is present AND the
    // dedicated pnpm adapter is registered, decline so the pnpm
    // adapter wins without surfacing ARCH_ENGINE_ADAPTER_CONFLICT.
    // pnpm workspaces happen to also ship `.pnp.cjs` in unusual setups
    // (e.g. migration from yarn-berry); pnpm precedence wins.
    if (
      state.pnpFilePresent &&
      fs.existsSync(path.join(context.cwd, 'pnpm-workspace.yaml')) &&
      context.cache.get('archengine:pnpmAdapterAvailable') === true
    ) {
      return {
        adapterName: ADAPTER_NAME,
        detected: false,
        confidence: 'NONE',
        workspaceKind: 'yarn-pnp',
        packageManager: 'yarn',
        reasons: [
          'pnpm-workspace.yaml also present; declining in favour of @arch-engine/adapter-pnpm',
        ],
        warnings: [],
        diagnostics: [],
      };
    }
    return computeDetection(state);
  }

  extractTopology(context: YarnPnpAdapterContext): YarnPnpAdapterTopologyResult {
    const state = probeWorkspace(context.cwd);
    const detection = computeDetection(state);

    if (!state.manifest || !state.globExpansion) {
      return emptyTopology(detection, state);
    }

    const graph = buildYarnPnpPackageGraph(
      context.cwd,
      state.globExpansion.matchedDirs,
    );

    const adapterDiagnostics: YarnPnpAdapterDiagnostic[] = [];

    // Always-emitted PnP-resolution-deferred notice when a PnP file
    // is present. INFO severity — does not block extraction.
    if (state.pnpFilePresent || state.pnpLoaderPresent) {
      adapterDiagnostics.push(buildPnpDeferredDiagnostic(state));
    }

    for (const d of graph.diagnostics) adapterDiagnostics.push(d);

    for (const w of state.globExpansion.warnings) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'WARNING',
        message: w,
      });
    }

    for (const w of state.manifest.warnings) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'INFO',
        message: w,
        path: 'package.json',
      });
    }

    for (const ref of graph.unresolvedLocalReferences) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_PNP_RESOLUTION_DEFERRED',
        severity: 'INFO',
        message:
          `\`${ref.protocol}:\` reference from ${ref.from} → ${ref.dependency} ` +
          `(\`${ref.specifier}\`) does not resolve to a workspace package; ` +
          `treated as external.`,
      });
    }

    const sourceFiles = new Set<string>(graph.sourceFiles);
    sourceFiles.add('package.json');
    if (state.pnpFilePresent) sourceFiles.add('.pnp.cjs');
    if (state.pnpLoaderPresent) sourceFiles.add('.pnp.loader.mjs');
    if (state.yarnrcPresent) sourceFiles.add('.yarnrc.yml');

    return {
      graphSurfaceVersion: '1.0.0',
      graphSurfaceHash: graph.graphSurfaceHash,
      nodes: graph.nodes,
      edges: graph.edges,
      signals: {
        workspaceType: 'yarn-pnp',
        extractionMode: 'structured',
        matchedPackages: graph.matchedPackageCount,
        namedPackages: graph.namedPackageCount,
      },
      coverage:
        graph.matchedPackageCount > 0
          ? graph.namedPackageCount / graph.matchedPackageCount
          : 0,
      confidence: detection.confidence,
      sourceFiles: [...sourceFiles].sort(),
      adapterMetadata: {
        yarnPnp: {
          packageManagerVersion:
            state.manifest.packageManagerVersion,
          pnpFilePresent: state.pnpFilePresent,
          pnpLoaderPresent: state.pnpLoaderPresent,
          yarnrcPresent: state.yarnrcPresent,
          nodeLinker: state.nodeLinker,
          nodeLinkerSource: state.nodeLinkerSource,
          workspacesPresent: state.manifest.workspacesPresent,
          workspacesObjectForm: state.manifest.workspacesObjectForm,
          rawGlobs: [...state.manifest.globs],
          excludedGlobs: [...state.globExpansion.excludedDirs],
          matchedGlobs: [...state.globExpansion.matchedDirs],
        },
        edges: graph.edgeMetadata,
      },
      diagnostics: adapterDiagnostics,
    };
  }

  explain(): YarnPnpAdapterCapabilitySummary {
    return {
      adapterName: this.adapterName,
      supportsPackageJsonWorkspaces: true,
      supportsPnpmWorkspaces: false,
      supportsYarnPnp: true,
      executesRepositoryCode: false,
      readsLockfile: false,
      notes: [
        'v0.1.0 MVP — package.json-shape-based extraction. Detection requires `.pnp.cjs` or `.pnp.loader.mjs` at the repository root.',
        'Does not execute `.pnp.cjs` or `.pnp.loader.mjs`. Does not invoke yarn. Does not read node_modules / .yarn/cache.',
        'Full PnP resolver parity is intentionally deferred. ARCH_ENGINE_PNP_RESOLUTION_DEFERRED is emitted whenever a PnP file is detected.',
      ],
    };
  }
}

/**
 * Pass 3 factory. Returns a fresh adapter instance.
 *
 * NOT part of the v1.x stability contract — Pass 3 ships at v0.1.0
 * of `@arch-engine/adapter-yarn-pnp`; future minor versions may
 * refine the class shape.
 */
export function createYarnPnpArchitectureAdapter(): YarnPnpArchitectureAdapter {
  return new YarnPnpArchitectureAdapter();
}

/**
 * Pre-built singleton. Consumers (the CLI's internal registry) read
 * this directly. NOT part of the v1.x stability contract.
 */
export const yarnPnpArchitectureAdapter = createYarnPnpArchitectureAdapter();

// ─── Legacy-shape free function (consumed by the CLI bridge) ──

/**
 * Run yarn-pnp extraction and return the legacy
 * `MonorepoExtractionResult`-compatible shape PLUS structured adapter
 * metadata the CLI's JSON v2 envelope surfaces under `data.adapter`.
 *
 * Returns `null` when no PnP signal is present at `cwd`. The CLI
 * bridge uses that signal to fall back to a lower-precedence adapter.
 */
export function runYarnPnpExtraction(
  cwd: string,
): YarnPnpExtractionResult | null {
  const state = probeWorkspace(cwd);
  if (!state.pnpFilePresent && !state.pnpLoaderPresent) return null;

  const detection = computeDetection(state);

  if (!state.manifest || !state.globExpansion) {
    // PnP file present but workspace declaration is missing or
    // unusable. Return an empty extraction with diagnostics so the
    // CLI can still surface the adapter choice.
    const adapterDiagnostics: YarnPnpAdapterDiagnostic[] = [
      buildPnpDeferredDiagnostic(state),
    ];
    if (!state.manifest) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'WARNING',
        message: 'Root package.json could not be read.',
        path: 'package.json',
      });
    } else if (!state.manifest.workspacesPresent) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'WARNING',
        message:
          'Root package.json does not declare a `workspaces` field; yarn-pnp adapter found no packages to extract.',
        path: 'package.json',
      });
    } else if (state.manifest.globs.length === 0) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'WARNING',
        message:
          'Root package.json `workspaces` field is empty; yarn-pnp adapter found no packages to extract.',
        path: 'package.json',
      });
    }

    return {
      metadata: {
        coverage: 0,
        connectivity: 1.0,
        topologyConfidence: 0,
        detectedNodes: 0,
        connectedNodes: 0,
        expectedNodes: 0,
        warnings: [],
        workspaceType: 'yarn-pnp',
        extractionMode: 'fallback_directory_scan',
      },
      adjacencyMap: {},
      routeServiceMap: { forward: {} },
      authorityCrossings: [],
      edgesByAdapter: { local_fs: [] },
      adapterInfo: {
        name: '@arch-engine/adapter-yarn-pnp',
        version: ADAPTER_VERSION,
        confidence: detection.confidence,
        reasons: [...detection.reasons],
        warnings: [...detection.warnings],
        diagnostics: adapterDiagnostics,
        metadata: {
          yarnPnp: {
            packageManagerVersion:
              state.manifest?.packageManagerVersion ?? null,
            pnpFilePresent: state.pnpFilePresent,
            pnpLoaderPresent: state.pnpLoaderPresent,
            yarnrcPresent: state.yarnrcPresent,
            nodeLinker: state.nodeLinker,
            nodeLinkerSource: state.nodeLinkerSource,
            workspacesPresent: state.manifest?.workspacesPresent ?? false,
            workspacesObjectForm:
              state.manifest?.workspacesObjectForm ?? false,
            rawGlobs: state.manifest ? [...state.manifest.globs] : [],
            excludedGlobs: [],
            matchedGlobs: [],
          },
          edges: {},
        },
        graphSurfaceHash: emptyGraphSurfaceHash(),
        sourceFiles: collectEmptySourceFiles(state),
      },
    };
  }

  const graph = buildYarnPnpPackageGraph(cwd, state.globExpansion.matchedDirs);

  const edges: Array<{
    source: string;
    target: string;
    type: string;
    confidence: 'namespace_inferred';
    adapter_id: 'local_fs';
  }> = [];
  for (const edge of graph.edges) {
    edges.push({
      source: edge.from,
      target: edge.to,
      type: edge.type,
      confidence: 'namespace_inferred',
      adapter_id: 'local_fs',
    });
  }

  const adjacencyMap: Record<string, string[]> = {};
  for (const nodeId of graph.nodes.map((n) => n.id)) adjacencyMap[nodeId] = [];
  for (const edge of graph.edges) {
    if (!adjacencyMap[edge.from]) adjacencyMap[edge.from] = [];
    if (!adjacencyMap[edge.from]!.includes(edge.to)) {
      adjacencyMap[edge.from]!.push(edge.to);
    }
  }
  for (const k of Object.keys(adjacencyMap)) adjacencyMap[k]!.sort();

  const routeServiceMap: {
    forward: Record<string, YarnPnpRouteServiceMapping>;
  } = { forward: {} };
  for (const [pkgName, relPath] of Object.entries(graph.packagePaths)) {
    routeServiceMap.forward[pkgName] = { backend_route: relPath };
  }

  const adapterDiagnostics: YarnPnpAdapterDiagnostic[] = [];
  adapterDiagnostics.push(buildPnpDeferredDiagnostic(state));

  for (const d of graph.diagnostics) adapterDiagnostics.push(d);

  for (const w of state.globExpansion.warnings) {
    adapterDiagnostics.push({
      code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
      severity: 'WARNING',
      message: w,
    });
  }

  for (const w of state.manifest.warnings) {
    adapterDiagnostics.push({
      code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
      severity: 'INFO',
      message: w,
      path: 'package.json',
    });
  }

  for (const ref of graph.unresolvedLocalReferences) {
    adapterDiagnostics.push({
      code: 'ARCH_ENGINE_PNP_RESOLUTION_DEFERRED',
      severity: 'INFO',
      message:
        `\`${ref.protocol}:\` reference from ${ref.from} → ${ref.dependency} ` +
        `(\`${ref.specifier}\`) does not resolve to a workspace package; ` +
        `treated as external.`,
    });
  }

  const sourceFiles = new Set<string>(graph.sourceFiles);
  sourceFiles.add('package.json');
  if (state.pnpFilePresent) sourceFiles.add('.pnp.cjs');
  if (state.pnpLoaderPresent) sourceFiles.add('.pnp.loader.mjs');
  if (state.yarnrcPresent) sourceFiles.add('.yarnrc.yml');

  return {
    metadata: {
      coverage:
        graph.matchedPackageCount > 0
          ? graph.namedPackageCount / graph.matchedPackageCount
          : 0,
      connectivity: 1.0,
      topologyConfidence:
        detection.confidence === 'HIGH'
          ? 1.0
          : detection.confidence === 'MEDIUM'
            ? 0.7
            : detection.confidence === 'LOW'
              ? 0.5
              : 0,
      detectedNodes: graph.namedPackageCount,
      connectedNodes: graph.namedPackageCount,
      expectedNodes: graph.namedPackageCount,
      warnings: [],
      workspaceType: 'yarn-pnp',
      extractionMode: 'structured',
    },
    adjacencyMap,
    routeServiceMap,
    authorityCrossings: [],
    edgesByAdapter: { local_fs: edges },
    adapterInfo: {
      name: '@arch-engine/adapter-yarn-pnp',
      version: ADAPTER_VERSION,
      confidence: detection.confidence,
      reasons: [...detection.reasons],
      warnings: [...detection.warnings],
      diagnostics: adapterDiagnostics,
      metadata: {
        yarnPnp: {
          packageManagerVersion: state.manifest.packageManagerVersion,
          pnpFilePresent: state.pnpFilePresent,
          pnpLoaderPresent: state.pnpLoaderPresent,
          yarnrcPresent: state.yarnrcPresent,
          nodeLinker: state.nodeLinker,
          nodeLinkerSource: state.nodeLinkerSource,
          workspacesPresent: state.manifest.workspacesPresent,
          workspacesObjectForm: state.manifest.workspacesObjectForm,
          rawGlobs: [...state.manifest.globs],
          excludedGlobs: [...state.globExpansion.excludedDirs],
          matchedGlobs: [...state.globExpansion.matchedDirs],
        },
        edges: graph.edgeMetadata,
      },
      graphSurfaceHash: graph.graphSurfaceHash,
      sourceFiles: [...sourceFiles].sort(),
    },
  };
}

// ─── Internal helpers ────────────────────────────────

function computeDetection(
  state: InternalYarnPnpState,
): YarnPnpAdapterDetectionResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!state.pnpFilePresent && !state.pnpLoaderPresent) {
    return {
      adapterName: ADAPTER_NAME,
      detected: false,
      confidence: 'NONE',
      workspaceKind: 'unknown',
      packageManager: 'unknown',
      reasons: ['no .pnp.cjs or .pnp.loader.mjs at repo root'],
      warnings: [],
      diagnostics: [],
    };
  }

  if (state.pnpFilePresent) reasons.push('.pnp.cjs present');
  if (state.pnpLoaderPresent) reasons.push('.pnp.loader.mjs present');
  if (state.yarnrcPresent) reasons.push('.yarnrc.yml present');
  if (state.nodeLinker === 'pnp') reasons.push('.yarnrc.yml#nodeLinker is pnp');
  if (state.manifest?.packageManagerVersion) {
    reasons.push('package.json#packageManager identifies yarn');
  }

  // No manifest readable → LOW; we still claim the workspace because
  // the PnP file existed and we want the CLI to surface a clear
  // adapter selection rather than silently fall through.
  if (!state.manifest) {
    return {
      adapterName: ADAPTER_NAME,
      detected: true,
      confidence: 'LOW',
      workspaceKind: 'yarn-pnp',
      packageManager: 'yarn',
      reasons,
      warnings: ['Could not read root package.json.'],
      diagnostics: [
        {
          code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
          severity: 'WARNING',
          message:
            'Root package.json could not be read; yarn-pnp adapter cannot extract topology.',
          path: 'package.json',
        },
      ],
    };
  }

  if (!state.manifest.workspacesPresent) {
    return {
      adapterName: ADAPTER_NAME,
      detected: true,
      confidence: 'LOW',
      workspaceKind: 'yarn-pnp',
      packageManager: 'yarn',
      reasons,
      warnings: ['Root package.json has no `workspaces` field.'],
      diagnostics: [
        {
          code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
          severity: 'WARNING',
          message:
            'PnP file is present but root package.json declares no `workspaces` field; yarn-pnp adapter cannot extract topology.',
          path: 'package.json',
        },
      ],
    };
  }

  if (state.manifest.globs.length === 0) {
    return {
      adapterName: ADAPTER_NAME,
      detected: true,
      confidence: 'LOW',
      workspaceKind: 'yarn-pnp',
      packageManager: 'yarn',
      reasons,
      warnings: ['Root package.json `workspaces` is empty.'],
      diagnostics: [
        {
          code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
          severity: 'WARNING',
          message: 'package.json `workspaces` field is empty.',
          path: 'package.json',
        },
      ],
    };
  }

  reasons.push('package.json#workspaces is set');

  const matched = state.globExpansion?.matchedDirs ?? [];
  if (matched.length === 0) {
    warnings.push('Workspace globs matched zero packages.');
    return {
      adapterName: ADAPTER_NAME,
      detected: true,
      confidence: 'MEDIUM',
      workspaceKind: 'yarn-pnp',
      packageManager: 'yarn',
      reasons,
      warnings,
      diagnostics: [
        {
          code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
          severity: 'WARNING',
          message: 'yarn workspaces globs matched no packages.',
          path: 'package.json',
          details: { globs: state.manifest.globs },
        },
      ],
    };
  }

  return {
    adapterName: ADAPTER_NAME,
    detected: true,
    confidence: 'HIGH',
    workspaceKind: 'yarn-pnp',
    packageManager: 'yarn',
    reasons,
    warnings,
    diagnostics: [],
  };
}

function emptyTopology(
  detection: YarnPnpAdapterDetectionResult,
  state: InternalYarnPnpState,
): YarnPnpAdapterTopologyResult {
  const diagnostics: YarnPnpAdapterDiagnostic[] = [];
  if (state.pnpFilePresent || state.pnpLoaderPresent) {
    diagnostics.push(buildPnpDeferredDiagnostic(state));
  }
  if (!state.manifest) {
    diagnostics.push({
      code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
      severity: 'WARNING',
      message:
        'Root package.json could not be read; yarn-pnp adapter cannot extract topology.',
      path: 'package.json',
    });
  } else if (!state.manifest.workspacesPresent) {
    diagnostics.push({
      code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
      severity: 'WARNING',
      message:
        'PnP file is present but root package.json declares no `workspaces` field.',
      path: 'package.json',
    });
  }

  const sourceFiles: string[] = [];
  if (state.manifest) sourceFiles.push('package.json');
  if (state.pnpFilePresent) sourceFiles.push('.pnp.cjs');
  if (state.pnpLoaderPresent) sourceFiles.push('.pnp.loader.mjs');
  if (state.yarnrcPresent) sourceFiles.push('.yarnrc.yml');

  return {
    graphSurfaceVersion: '1.0.0',
    graphSurfaceHash: emptyGraphSurfaceHash(),
    nodes: [],
    edges: [],
    signals: {
      workspaceType: 'yarn-pnp',
      extractionMode: 'fallback_directory_scan',
      matchedPackages: 0,
      namedPackages: 0,
    },
    coverage: 0,
    confidence: detection.confidence,
    sourceFiles: sourceFiles.sort(),
    adapterMetadata: {
      yarnPnp: {
        packageManagerVersion: state.manifest?.packageManagerVersion ?? null,
        pnpFilePresent: state.pnpFilePresent,
        pnpLoaderPresent: state.pnpLoaderPresent,
        yarnrcPresent: state.yarnrcPresent,
        nodeLinker: state.nodeLinker,
        nodeLinkerSource: state.nodeLinkerSource,
        workspacesPresent: state.manifest?.workspacesPresent ?? false,
        workspacesObjectForm: state.manifest?.workspacesObjectForm ?? false,
        rawGlobs: state.manifest ? [...state.manifest.globs] : [],
        excludedGlobs: [],
        matchedGlobs: [],
      },
      edges: {},
    },
    diagnostics,
  };
}

function buildPnpDeferredDiagnostic(
  state: InternalYarnPnpState,
): YarnPnpAdapterDiagnostic {
  const presentParts: string[] = [];
  if (state.pnpFilePresent) presentParts.push('.pnp.cjs');
  if (state.pnpLoaderPresent) presentParts.push('.pnp.loader.mjs');
  return {
    code: 'ARCH_ENGINE_PNP_RESOLUTION_DEFERRED',
    severity: 'INFO',
    message:
      `Detected Yarn PnP file${presentParts.length === 1 ? '' : 's'} ` +
      `(${presentParts.join(', ')}). The v0.1.0 adapter intentionally does ` +
      `not execute \`.pnp.cjs\`; topology is derived from ` +
      `\`package.json#workspaces\` only.`,
    details: {
      pnpFilePresent: state.pnpFilePresent,
      pnpLoaderPresent: state.pnpLoaderPresent,
    },
  };
}

function emptyGraphSurfaceHash(): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify([]))
    .update('\n')
    .update(JSON.stringify([]))
    .digest('hex');
}

function collectEmptySourceFiles(state: InternalYarnPnpState): string[] {
  const out: string[] = [];
  if (state.manifest) out.push('package.json');
  if (state.pnpFilePresent) out.push('.pnp.cjs');
  if (state.pnpLoaderPresent) out.push('.pnp.loader.mjs');
  if (state.yarnrcPresent) out.push('.yarnrc.yml');
  return out.sort();
}

// Re-exports for convenient symmetry with adapter-pnpm.
export {
  readYarnRootManifest,
  normaliseManifest,
  deriveYarnVersion,
  readYarnrc,
  resolveNodeLinker,
  type YarnRootManifest,
  type YarnrcReadResult,
  type YarnPnpNodeLinkerSource,
} from './yarn-workspaces.js';
export { expandWorkspaceGlobs, type GlobExpansion } from './globs.js';
export {
  buildYarnPnpPackageGraph,
  edgeIdFor,
  type YarnPnpDependencyKind,
  type YarnPnpEdgeProtocol,
  type YarnPnpEdgeMetadata,
  type YarnPnpCanonicalNode,
  type YarnPnpCanonicalEdge,
  type YarnPnpPackageGraph,
  type YarnPnpDiagnostic,
} from './package-graph.js';
