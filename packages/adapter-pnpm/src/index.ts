/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-pnpm
 * ═══════════════════════════════════════════════════════════
 *
 *  Pnpm-workspace adapter implementing the internal
 *  `ArchitectureAdapter` shape locked in
 *  `docs/adapters/multi-adapter-surface-spec.md` §6.1.
 *
 *  Public surface (Pass 2):
 *    - PnpmArchitectureAdapter          (class)
 *    - createPnpmArchitectureAdapter()  (factory)
 *    - pnpmArchitectureAdapter          (singleton)
 *    - runPnpmExtraction(cwd)           (legacy-shape helper)
 *
 *  This package has NO runtime dependency on `@arch-engine/cli`. The
 *  CLI's internal registry consumes the class via structural typing.
 *
 *  Pass 2 invariants:
 *    - No execution of repository code.
 *    - No network.
 *    - No mutation of cwd.
 *    - No reading of `node_modules/` or `.pnpm-store/`.
 *    - No invocation of any package-manager binary.
 *    - Deterministic byte-identical output on repeated runs.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import {
  parsePnpmWorkspaceYaml,
  PnpmWorkspaceParseError,
} from './pnpm-workspace.js';
import { expandWorkspaceGlobs, type GlobExpansion } from './globs.js';
import {
  buildPnpmPackageGraph,
  type PnpmDiagnostic,
  type PnpmEdgeMetadata,
} from './package-graph.js';

// ─── Local contract types (structural, no CLI import) ────

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export interface PnpmAdapterContext {
  readonly cwd: string;
  readonly cache: Map<string, unknown>;
}

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export type PnpmAdapterConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export type PnpmAdapterPackageManager =
  | 'pnpm'
  | 'yarn'
  | 'npm'
  | 'yarn-pnp'
  | 'unknown';

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export interface PnpmAdapterDiagnostic {
  readonly code: string;
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
  readonly message: string;
  readonly path?: string;
  readonly details?: Record<string, unknown>;
}

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export interface PnpmAdapterDetectionResult {
  readonly adapterName: string;
  readonly detected: boolean;
  readonly confidence: PnpmAdapterConfidence;
  readonly workspaceKind: string;
  readonly packageManager: PnpmAdapterPackageManager;
  readonly reasons: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<PnpmAdapterDiagnostic>;
}

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export interface PnpmAdapterCanonicalNode {
  readonly id: string;
  readonly type: 'package';
}

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export interface PnpmAdapterCanonicalEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
}

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export interface PnpmAdapterSignalPayload {
  readonly workspaceType: string;
  readonly extractionMode: string;
  readonly [key: string]: unknown;
}

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export interface PnpmAdapterTopologyResult {
  readonly graphSurfaceVersion: '1.0.0';
  readonly graphSurfaceHash: string;
  readonly nodes: ReadonlyArray<PnpmAdapterCanonicalNode>;
  readonly edges: ReadonlyArray<PnpmAdapterCanonicalEdge>;
  readonly signals: PnpmAdapterSignalPayload;
  readonly coverage: number;
  readonly confidence: PnpmAdapterConfidence;
  readonly sourceFiles: ReadonlyArray<string>;
  readonly adapterMetadata: Readonly<Record<string, unknown>>;
  readonly diagnostics: ReadonlyArray<PnpmAdapterDiagnostic>;
}

/** @internal Pass 2 contract surface; not part of v1.x freeze. */
export interface PnpmAdapterCapabilitySummary {
  readonly adapterName: string;
  readonly supportsPackageJsonWorkspaces: boolean;
  readonly supportsPnpmWorkspaces: boolean;
  readonly supportsYarnPnp: boolean;
  readonly executesRepositoryCode: false;
  readonly readsLockfile: boolean;
  readonly notes: ReadonlyArray<string>;
}

// ─── Legacy-shape extraction result (consumed by the CLI bridge) ──

export interface PnpmExtractionMetadata {
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

export interface PnpmRouteServiceMapping {
  backend_route: string;
}

export interface PnpmExtractionResult {
  metadata: PnpmExtractionMetadata;
  adjacencyMap: Record<string, string[]>;
  routeServiceMap: { forward: Record<string, PnpmRouteServiceMapping> };
  authorityCrossings: any[];
  edgesByAdapter: Record<string, unknown>;
  /**
   * Pass 2 extra (not in the legacy MonorepoExtractionResult). Carries
   * the structural metadata the CLI surfaces under `data.adapter` and
   * the diagnostics the runtime promotes to ARCH_ENGINE_* codes.
   */
  adapterInfo: {
    name: string;
    version: string;
    confidence: PnpmAdapterConfidence;
    reasons: string[];
    warnings: string[];
    diagnostics: PnpmAdapterDiagnostic[];
    metadata: {
      pnpm: {
        workspaceFile: string;
        lockfilePresent: boolean;
        catalogsDetected: boolean;
        excludedGlobs: string[];
        matchedGlobs: string[];
      };
      edges: Record<string, PnpmEdgeMetadata>;
    };
    graphSurfaceHash: string;
    sourceFiles: string[];
  };
}

// ─── Internal extraction state (shared by detect / extract / legacy) ──

interface InternalPnpmState {
  readonly workspaceFilePresent: boolean;
  readonly workspaceFilePath: string; // relative POSIX
  readonly parseFailed: boolean;
  readonly packagesParsed: boolean;
  readonly rawGlobs: ReadonlyArray<string>;
  readonly catalogsDetected: boolean;
  readonly yamlWarnings: ReadonlyArray<string>;
  readonly globExpansion: GlobExpansion | null;
  readonly lockfilePresent: boolean;
  readonly packageManagerHint: string | null; // package.json#packageManager value
}

function probeWorkspace(cwd: string): InternalPnpmState {
  const workspaceFileAbs = path.join(cwd, 'pnpm-workspace.yaml');
  const present = fs.existsSync(workspaceFileAbs);
  if (!present) {
    return {
      workspaceFilePresent: false,
      workspaceFilePath: 'pnpm-workspace.yaml',
      parseFailed: false,
      packagesParsed: false,
      rawGlobs: [],
      catalogsDetected: false,
      yamlWarnings: [],
      globExpansion: null,
      lockfilePresent: fs.existsSync(path.join(cwd, 'pnpm-lock.yaml')),
      packageManagerHint: readPackageManagerHint(cwd),
    };
  }

  let parsed: { packages: ReadonlyArray<string> | null; catalogsDetected: boolean; warnings: ReadonlyArray<string> } | null = null;
  try {
    parsed = parsePnpmWorkspaceYaml(fs.readFileSync(workspaceFileAbs, 'utf-8'));
  } catch (err) {
    if (err instanceof PnpmWorkspaceParseError) {
      return {
        workspaceFilePresent: true,
        workspaceFilePath: 'pnpm-workspace.yaml',
        parseFailed: true,
        packagesParsed: false,
        rawGlobs: [],
        catalogsDetected: false,
        yamlWarnings: [err.message],
        globExpansion: null,
        lockfilePresent: fs.existsSync(path.join(cwd, 'pnpm-lock.yaml')),
        packageManagerHint: readPackageManagerHint(cwd),
      };
    }
    throw err;
  }

  if (parsed.packages === null) {
    return {
      workspaceFilePresent: true,
      workspaceFilePath: 'pnpm-workspace.yaml',
      parseFailed: false,
      packagesParsed: false,
      rawGlobs: [],
      catalogsDetected: parsed.catalogsDetected,
      yamlWarnings: parsed.warnings,
      globExpansion: null,
      lockfilePresent: fs.existsSync(path.join(cwd, 'pnpm-lock.yaml')),
      packageManagerHint: readPackageManagerHint(cwd),
    };
  }

  const expansion = expandWorkspaceGlobs(cwd, parsed.packages);

  return {
    workspaceFilePresent: true,
    workspaceFilePath: 'pnpm-workspace.yaml',
    parseFailed: false,
    packagesParsed: true,
    rawGlobs: parsed.packages,
    catalogsDetected: parsed.catalogsDetected,
    yamlWarnings: parsed.warnings,
    globExpansion: expansion,
    lockfilePresent: fs.existsSync(path.join(cwd, 'pnpm-lock.yaml')),
    packageManagerHint: readPackageManagerHint(cwd),
  };
}

function readPackageManagerHint(cwd: string): string | null {
  const rootPkg = path.join(cwd, 'package.json');
  if (!fs.existsSync(rootPkg)) return null;
  try {
    const json = JSON.parse(fs.readFileSync(rootPkg, 'utf-8'));
    const pm = json?.packageManager;
    return typeof pm === 'string' ? pm : null;
  } catch {
    return null;
  }
}

// ─── Public class ─────────────────────────────────────

const ADAPTER_NAME = 'pnpm' as const;
const ADAPTER_VERSION = '0.1.0' as const;

/**
 * Adapter implementation. Structurally compatible with the internal
 * `ArchitectureAdapter` shape locked in
 * `docs/adapters/multi-adapter-surface-spec.md` §6.1.
 */
export class PnpmArchitectureAdapter {
  readonly adapterName: string = ADAPTER_NAME;
  readonly adapterVersion: string = ADAPTER_VERSION;

  detect(context: PnpmAdapterContext): PnpmAdapterDetectionResult {
    const state = probeWorkspace(context.cwd);
    return computeDetection(state);
  }

  extractTopology(context: PnpmAdapterContext): PnpmAdapterTopologyResult {
    const state = probeWorkspace(context.cwd);
    const detection = computeDetection(state);

    // No glob expansion → empty topology with detection's diagnostics.
    if (!state.packagesParsed || !state.globExpansion) {
      return emptyTopology(detection, state);
    }

    const graph = buildPnpmPackageGraph(context.cwd, state.globExpansion.matchedDirs);

    const adapterDiagnostics: PnpmAdapterDiagnostic[] = [];

    // Promote graph-builder diagnostics (e.g. unnamed packages).
    for (const d of graph.diagnostics) adapterDiagnostics.push(d);

    // Glob expansion warnings carried through as INFO diagnostics.
    for (const w of state.globExpansion.warnings) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'WARNING',
        message: w,
      });
    }

    // Catalog protocol references → LOCKFILE_UNSUPPORTED.
    if (graph.catalogReferences.length > 0) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_LOCKFILE_UNSUPPORTED',
        severity: 'INFO',
        message:
          `Encountered ${graph.catalogReferences.length} ` +
          `catalog:* dependency specifier${graph.catalogReferences.length === 1 ? '' : 's'} which the v0.1.0 adapter does not resolve.`,
        details: {
          references: graph.catalogReferences.slice(0, 10),
        },
      });
    }

    // YAML soft warnings surfaced as INFO diagnostics.
    for (const w of state.yamlWarnings) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'INFO',
        message: w,
        path: state.workspaceFilePath,
      });
    }

    const sourceFiles = new Set<string>(graph.sourceFiles);
    sourceFiles.add(state.workspaceFilePath);
    if (state.lockfilePresent) sourceFiles.add('pnpm-lock.yaml');

    return {
      graphSurfaceVersion: '1.0.0',
      graphSurfaceHash: graph.graphSurfaceHash,
      nodes: graph.nodes,
      edges: graph.edges,
      signals: {
        workspaceType: 'pnpm',
        extractionMode: 'structured',
        matchedPackages: graph.matchedPackageCount,
        namedPackages: graph.namedPackageCount,
      },
      coverage: graph.matchedPackageCount > 0
        ? graph.namedPackageCount / graph.matchedPackageCount
        : 0,
      confidence: detection.confidence,
      sourceFiles: [...sourceFiles].sort(),
      adapterMetadata: {
        pnpm: {
          workspaceFile: state.workspaceFilePath,
          packageManagerVersion: state.packageManagerHint,
          lockfilePresent: state.lockfilePresent,
          catalogsDetected: state.catalogsDetected,
          excludedGlobs: state.globExpansion.excludedDirs,
          matchedGlobs: state.globExpansion.matchedDirs,
        },
        edges: graph.edgeMetadata,
      },
      diagnostics: adapterDiagnostics,
    };
  }

  explain(): PnpmAdapterCapabilitySummary {
    return {
      adapterName: this.adapterName,
      supportsPackageJsonWorkspaces: false,
      supportsPnpmWorkspaces: true,
      supportsYarnPnp: false,
      executesRepositoryCode: false,
      readsLockfile: false,
      notes: [
        'v0.1.0 — full glob expansion + workspace:* protocol. catalog:* surfaces ARCH_ENGINE_LOCKFILE_UNSUPPORTED.',
        'No execution of repo-controlled JavaScript; no pnpm CLI invocation; no node_modules read.',
      ],
    };
  }
}

/**
 * Pass 2 factory. Returns a fresh adapter instance.
 *
 * NOT part of the v1.x stability contract — Pass 2 ships at v0.1.0
 * of `@arch-engine/adapter-pnpm`; future minor versions may refine
 * the class shape.
 */
export function createPnpmArchitectureAdapter(): PnpmArchitectureAdapter {
  return new PnpmArchitectureAdapter();
}

/**
 * Pre-built singleton. Consumers (the CLI's internal registry) read
 * this directly. NOT part of the v1.x stability contract.
 */
export const pnpmArchitectureAdapter = createPnpmArchitectureAdapter();

// ─── Legacy-shape free function (consumed by the CLI bridge) ──

/**
 * Run pnpm extraction and return the legacy
 * `MonorepoExtractionResult`-compatible shape PLUS structured adapter
 * metadata the CLI's JSON v2 envelope surfaces under `data.adapter`.
 *
 * Returns `null` when `pnpm-workspace.yaml` is not present at `cwd`.
 * The CLI bridge uses that signal to fall back to the monorepo adapter.
 */
export function runPnpmExtraction(cwd: string): PnpmExtractionResult | null {
  const state = probeWorkspace(cwd);
  if (!state.workspaceFilePresent) return null;

  const detection = computeDetection(state);

  if (!state.packagesParsed || !state.globExpansion) {
    // Workspace file present but unparseable / empty.
    const adapterDiagnostics: PnpmAdapterDiagnostic[] = [];
    if (state.parseFailed) {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'ERROR',
        message: state.yamlWarnings[0] ?? 'Could not parse pnpm-workspace.yaml.',
        path: state.workspaceFilePath,
      });
    } else {
      adapterDiagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
        severity: 'WARNING',
        message: 'pnpm-workspace.yaml has no `packages:` entries.',
        path: state.workspaceFilePath,
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
        workspaceType: 'pnpm',
        extractionMode: state.parseFailed ? 'fallback_directory_scan' : 'structured',
      },
      adjacencyMap: {},
      routeServiceMap: { forward: {} },
      authorityCrossings: [],
      edgesByAdapter: { local_fs: [] },
      adapterInfo: {
        name: '@arch-engine/adapter-pnpm',
        version: ADAPTER_VERSION,
        confidence: detection.confidence,
        reasons: [...detection.reasons],
        warnings: [...detection.warnings],
        diagnostics: adapterDiagnostics,
        metadata: {
          pnpm: {
            workspaceFile: state.workspaceFilePath,
            lockfilePresent: state.lockfilePresent,
            catalogsDetected: state.catalogsDetected,
            excludedGlobs: [],
            matchedGlobs: [],
          },
          edges: {},
        },
        graphSurfaceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // sha256 of empty
        sourceFiles: [state.workspaceFilePath],
      },
    };
  }

  const graph = buildPnpmPackageGraph(cwd, state.globExpansion.matchedDirs);

  // Legacy edgesByAdapter.local_fs shape.
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

  const routeServiceMap: { forward: Record<string, PnpmRouteServiceMapping> } = {
    forward: {},
  };
  for (const [pkgName, relPath] of Object.entries(graph.packagePaths)) {
    routeServiceMap.forward[pkgName] = { backend_route: relPath };
  }

  const adapterDiagnostics: PnpmAdapterDiagnostic[] = [];
  for (const d of graph.diagnostics) adapterDiagnostics.push(d);
  for (const w of state.globExpansion.warnings) {
    adapterDiagnostics.push({
      code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
      severity: 'WARNING',
      message: w,
    });
  }
  if (graph.catalogReferences.length > 0) {
    adapterDiagnostics.push({
      code: 'ARCH_ENGINE_LOCKFILE_UNSUPPORTED',
      severity: 'INFO',
      message:
        `Encountered ${graph.catalogReferences.length} ` +
        `catalog:* dependency specifier${graph.catalogReferences.length === 1 ? '' : 's'} which the v0.1.0 adapter does not resolve.`,
    });
  }
  for (const w of state.yamlWarnings) {
    adapterDiagnostics.push({
      code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
      severity: 'INFO',
      message: w,
      path: state.workspaceFilePath,
    });
  }

  const sourceFiles = new Set<string>(graph.sourceFiles);
  sourceFiles.add(state.workspaceFilePath);
  if (state.lockfilePresent) sourceFiles.add('pnpm-lock.yaml');

  return {
    metadata: {
      coverage: graph.matchedPackageCount > 0
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
      workspaceType: 'pnpm',
      extractionMode: 'structured',
    },
    adjacencyMap,
    routeServiceMap,
    authorityCrossings: [],
    edgesByAdapter: { local_fs: edges },
    adapterInfo: {
      name: '@arch-engine/adapter-pnpm',
      version: ADAPTER_VERSION,
      confidence: detection.confidence,
      reasons: [...detection.reasons],
      warnings: [...detection.warnings],
      diagnostics: adapterDiagnostics,
      metadata: {
        pnpm: {
          workspaceFile: state.workspaceFilePath,
          lockfilePresent: state.lockfilePresent,
          catalogsDetected: state.catalogsDetected,
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

function computeDetection(state: InternalPnpmState): PnpmAdapterDetectionResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const diagnostics: PnpmAdapterDiagnostic[] = [];

  if (!state.workspaceFilePresent) {
    return {
      adapterName: ADAPTER_NAME,
      detected: false,
      confidence: 'NONE',
      workspaceKind: 'unknown',
      packageManager: 'unknown',
      reasons: ['no pnpm-workspace.yaml at repo root'],
      warnings: [],
      diagnostics: [],
    };
  }

  reasons.push(`${state.workspaceFilePath} present`);

  if (state.parseFailed) {
    diagnostics.push({
      code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
      severity: 'ERROR',
      message: state.yamlWarnings[0] ?? 'pnpm-workspace.yaml could not be parsed.',
      path: state.workspaceFilePath,
    });
    return {
      adapterName: ADAPTER_NAME,
      detected: true,
      confidence: 'LOW',
      workspaceKind: 'pnpm-workspace',
      packageManager: 'pnpm',
      reasons,
      warnings: ['YAML parse failed; using degraded detection'],
      diagnostics,
    };
  }

  if (!state.packagesParsed) {
    warnings.push('pnpm-workspace.yaml has no `packages:` key.');
    return {
      adapterName: ADAPTER_NAME,
      detected: true,
      confidence: 'LOW',
      workspaceKind: 'pnpm-workspace',
      packageManager: 'pnpm',
      reasons,
      warnings,
      diagnostics: [
        {
          code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
          severity: 'WARNING',
          message: 'pnpm-workspace.yaml has no `packages:` key.',
          path: state.workspaceFilePath,
        },
      ],
    };
  }

  // Globs parsed: check if anything matched.
  const matched = state.globExpansion?.matchedDirs ?? [];
  if (matched.length === 0) {
    warnings.push('Workspace globs matched zero packages.');
    return {
      adapterName: ADAPTER_NAME,
      detected: true,
      confidence: 'MEDIUM',
      workspaceKind: 'pnpm-workspace',
      packageManager: 'pnpm',
      reasons,
      warnings,
      diagnostics: [
        {
          code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
          severity: 'WARNING',
          message: 'pnpm workspace globs matched no packages.',
          path: state.workspaceFilePath,
          details: { globs: state.rawGlobs },
        },
      ],
    };
  }

  if (state.lockfilePresent) reasons.push('pnpm-lock.yaml present');
  if (state.packageManagerHint && state.packageManagerHint.startsWith('pnpm@')) {
    reasons.push(`package.json#packageManager starts with pnpm@`);
  }

  return {
    adapterName: ADAPTER_NAME,
    detected: true,
    confidence: 'HIGH',
    workspaceKind: 'pnpm-workspace',
    packageManager: 'pnpm',
    reasons,
    warnings,
    diagnostics: [],
  };
}

function emptyTopology(
  detection: PnpmAdapterDetectionResult,
  state: InternalPnpmState,
): PnpmAdapterTopologyResult {
  // sha256 of '[]\n[]' — used as the canonical empty-topology hash.
  const emptyHash = crypto
    .createHash('sha256')
    .update(JSON.stringify([]))
    .update('\n')
    .update(JSON.stringify([]))
    .digest('hex');

  const diagnostics: PnpmAdapterDiagnostic[] = state.parseFailed
    ? [
        {
          code: 'ARCH_ENGINE_WORKSPACE_GLOBS_INVALID',
          severity: 'ERROR',
          message: state.yamlWarnings[0] ?? 'Could not parse pnpm-workspace.yaml.',
          path: state.workspaceFilePath,
        },
      ]
    : [];

  return {
    graphSurfaceVersion: '1.0.0',
    graphSurfaceHash: emptyHash,
    nodes: [],
    edges: [],
    signals: {
      workspaceType: 'pnpm',
      extractionMode: state.parseFailed ? 'fallback_directory_scan' : 'structured',
      matchedPackages: 0,
      namedPackages: 0,
    },
    coverage: 0,
    confidence: detection.confidence,
    sourceFiles: [state.workspaceFilePath],
    adapterMetadata: {
      pnpm: {
        workspaceFile: state.workspaceFilePath,
        packageManagerVersion: state.packageManagerHint,
        lockfilePresent: state.lockfilePresent,
        catalogsDetected: state.catalogsDetected,
        excludedGlobs: [],
        matchedGlobs: [],
      },
      edges: {},
    },
    diagnostics,
  };
}

// Re-exports of submodule types so consumers (CLI bridge / tests) can
// pick them up from the package entry without reaching into submodules.
export {
  parsePnpmWorkspaceYaml,
  PnpmWorkspaceParseError,
  type PnpmWorkspaceFile,
} from './pnpm-workspace.js';
export { expandWorkspaceGlobs, type GlobExpansion } from './globs.js';
export {
  buildPnpmPackageGraph,
  edgeIdFor,
  type PnpmDependencyKind,
  type PnpmEdgeProtocol,
  type PnpmEdgeMetadata,
  type PnpmCanonicalNode,
  type PnpmCanonicalEdge,
  type PnpmPackageGraph,
  type PnpmDiagnostic,
} from './package-graph.js';
