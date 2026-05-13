import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ═══════════════════════════════════════════════════════════
//  @arch-engine/adapter-monorepo
// ═══════════════════════════════════════════════════════════
//
//  Public surface (locked by v1.x freeze):
//    - runMonorepoExtraction(cwd)
//    - classifyAuthorityDomain(route)
//    - createMonorepoAdapter()
//    - monorepoAdapter
//    - types: ExtractionMetadata, MonorepoExtractionResult,
//      AuthorityDomain, RouteServiceMapping
//
//  Pass 1 internal additions (NOT part of the v1.x freeze, but
//  exposed as exports for the CLI runner-bridge / registry to
//  consume structurally):
//    - MonorepoArchitectureAdapter         class implementing the
//                                          ArchitectureAdapter shape
//                                          documented in
//                                          docs/adapters/multi-adapter-surface-spec.md §6.1
//    - createMonorepoArchitectureAdapter() factory helper
//    - monorepoArchitectureAdapter         pre-built singleton
//
//  These additions are STRUCTURAL ONLY. This package does NOT
//  import any type from @arch-engine/cli — the registry consumes
//  this class via structural typing.
//
//  All existing function signatures and return shapes are
//  byte-identical to v1.2.0. The class internally reuses the same
//  extraction pipeline so legacy and new surfaces stay in sync.

// ─── Public types (locked) ──────────────────────────────

export interface ExtractionMetadata {
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

export type AuthorityDomain =
  | 'APPLICATION'
  | 'SERVICE'
  | 'LIBRARY'
  | 'FOUNDATION'
  | 'INFRASTRUCTURE'
  | 'UNCLASSIFIED';

export interface RouteServiceMapping {
  backend_route: string;
}

export interface MonorepoExtractionResult {
  metadata: ExtractionMetadata;
  adjacencyMap: Record<string, string[]>;
  routeServiceMap: { forward: Record<string, RouteServiceMapping> };
  authorityCrossings: any[];
  edgesByAdapter: Record<string, unknown>;
}

// ─── Pass 1 internal types (structural; not in v1.x freeze) ────
//
// These mirror docs/adapters/multi-adapter-surface-spec.md §6
// EXACTLY. We declare them locally rather than importing from
// @arch-engine/cli so this package has no dependency on the CLI.

/**
 * Read-only context passed to every adapter method.
 * @internal Pass 1 contract surface; not part of v1.x freeze.
 */
export interface MonorepoAdapterContext {
  readonly cwd: string;
  readonly cache: Map<string, unknown>;
}

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export type MonorepoAdapterConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export type MonorepoAdapterPackageManager =
  | 'pnpm'
  | 'yarn'
  | 'npm'
  | 'yarn-pnp'
  | 'unknown';

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export interface MonorepoAdapterDiagnostic {
  readonly code: string;
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
  readonly message: string;
  readonly path?: string;
  readonly details?: Record<string, unknown>;
}

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export interface MonorepoAdapterDetectionResult {
  readonly adapterName: string;
  readonly detected: boolean;
  readonly confidence: MonorepoAdapterConfidence;
  readonly workspaceKind: string;
  readonly packageManager: MonorepoAdapterPackageManager;
  readonly reasons: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<MonorepoAdapterDiagnostic>;
}

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export interface MonorepoAdapterCanonicalNode {
  readonly id: string;
  readonly type: 'package';
}

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export interface MonorepoAdapterCanonicalEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
}

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export interface MonorepoAdapterSignalPayload {
  readonly workspaceType: string;
  readonly extractionMode: string;
  readonly [key: string]: unknown;
}

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export interface MonorepoAdapterTopologyResult {
  readonly graphSurfaceVersion: '1.0.0';
  readonly graphSurfaceHash: string;
  readonly nodes: ReadonlyArray<MonorepoAdapterCanonicalNode>;
  readonly edges: ReadonlyArray<MonorepoAdapterCanonicalEdge>;
  readonly signals: MonorepoAdapterSignalPayload;
  readonly coverage: number;
  readonly confidence: MonorepoAdapterConfidence;
  readonly sourceFiles: ReadonlyArray<string>;
  readonly adapterMetadata: Readonly<Record<string, unknown>>;
  readonly diagnostics: ReadonlyArray<MonorepoAdapterDiagnostic>;
}

/** @internal Pass 1 contract surface; not part of v1.x freeze. */
export interface MonorepoAdapterCapabilitySummary {
  readonly adapterName: string;
  readonly supportsPackageJsonWorkspaces: boolean;
  readonly supportsPnpmWorkspaces: boolean;
  readonly supportsYarnPnp: boolean;
  readonly executesRepositoryCode: false;
  readonly readsLockfile: boolean;
  readonly notes: ReadonlyArray<string>;
}

// ─── Authority classification (locked) ──────────────────

export function classifyAuthorityDomain(route: string): AuthorityDomain {
  const segment = route.split(/[\/\\]/)[0]?.toLowerCase() || '';
  if (['app', 'apps'].includes(segment)) return 'APPLICATION';
  if (['service', 'services'].includes(segment)) return 'SERVICE';
  if (['package', 'packages', 'pkg'].includes(segment)) return 'LIBRARY';
  if (['lib', 'libs'].includes(segment)) return 'FOUNDATION';
  if (['infra', 'scripts', 'config', 'action'].includes(segment)) return 'INFRASTRUCTURE';
  return 'UNCLASSIFIED';
}

// ─── Internal: workspace detection (unchanged behaviour) ───

/**
 * @internal Workspace probe — unchanged from v1.2.0 behaviour.
 *
 * Returns the workspace identity plus the raw glob list, so the
 * single extraction pipeline can serve both `runMonorepoExtraction`
 * (legacy free function) and `MonorepoArchitectureAdapter` (Pass 1
 * structural contract).
 */
interface InternalWorkspaceProbe {
  readonly workspaceType: 'pnpm' | 'yarn-npm' | 'single';
  readonly extractionMode: 'structured' | 'fallback_directory_scan';
  readonly packageGlobs: ReadonlyArray<string>;
  readonly sourceFiles: ReadonlyArray<string>;
}

function probeWorkspace(cwd: string): InternalWorkspaceProbe {
  const sourceFiles: string[] = [];

  // pnpm-workspace.yaml takes precedence (matches v1.2.0).
  const pnpmYamlPath = path.join(cwd, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmYamlPath)) {
    sourceFiles.push('pnpm-workspace.yaml');
    const content = fs.readFileSync(pnpmYamlPath, 'utf-8');
    const lines = content.split('\n');
    let inPackages = false;
    const packages: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('packages:')) inPackages = true;
      else if (inPackages && line.trim().startsWith('-'))
        packages.push(line.replace('-', '').trim().replace(/['"]/g, ''));
      else if (inPackages && line.trim() && !line.startsWith(' ')) inPackages = false;
    }
    return {
      workspaceType: 'pnpm',
      extractionMode: 'structured',
      packageGlobs: packages,
      sourceFiles,
    };
  }

  // package.json#workspaces array form (yarn / npm classic).
  const rootPkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    sourceFiles.push('package.json');
    try {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
      if (Array.isArray(pkg.workspaces)) {
        return {
          workspaceType: 'yarn-npm',
          extractionMode: 'structured',
          packageGlobs: pkg.workspaces,
          sourceFiles,
        };
      }
    } catch {
      // Malformed root package.json; fall through to single mode.
    }
  }

  // Fallback: single-package directory scan.
  return {
    workspaceType: 'single',
    extractionMode: 'fallback_directory_scan',
    packageGlobs: [],
    sourceFiles,
  };
}

// ─── Internal: shared extraction pipeline ───────────────

/**
 * @internal Raw extraction state shared by the legacy free function
 * and the Pass 1 adapter class. Doing the work once guarantees
 * legacy and structural outputs stay byte-deterministic with each
 * other.
 */
interface InternalExtractionState {
  readonly workspaceType: 'pnpm' | 'yarn-npm' | 'single';
  readonly extractionMode: 'structured' | 'fallback_directory_scan';
  readonly adjacencyMap: Record<string, string[]>;
  readonly routeServiceMap: { forward: Record<string, RouteServiceMapping> };
  readonly detectedNodes: number;
  readonly edges: Array<{
    source: string;
    target: string;
    type: string;
    confidence: 'namespace_inferred';
    adapter_id: 'local_fs';
  }>;
  readonly internalNodeIds: ReadonlyArray<string>;
  readonly sourceFiles: ReadonlyArray<string>;
}

function runInternalExtraction(cwd: string): InternalExtractionState {
  const adjacencyMap: Record<string, string[]> = {};
  const routeServiceMap: { forward: Record<string, RouteServiceMapping> } = { forward: {} };
  let detectedNodes = 0;

  const probe = probeWorkspace(cwd);
  const sourceFiles: string[] = [...probe.sourceFiles];

  // Resolve glob list into a sorted set of project paths.
  const resolvedPaths = new Set<string>();
  resolvedPaths.add(cwd); // Root always included.

  for (const glob of [...probe.packageGlobs].sort()) {
    if (glob.endsWith('/*')) {
      const baseDir = path.join(cwd, glob.slice(0, -2));
      if (fs.existsSync(baseDir)) {
        const entries = fs
          .readdirSync(baseDir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
          .sort();
        for (const entryName of entries) {
          if (fs.existsSync(path.join(baseDir, entryName, 'package.json'))) {
            resolvedPaths.add(path.join(baseDir, entryName));
          }
        }
      }
    } else if (fs.existsSync(path.join(cwd, glob, 'package.json'))) {
      resolvedPaths.add(path.join(cwd, glob));
    }
  }

  const sortedPaths = Array.from(resolvedPaths).sort();

  for (const projPath of sortedPaths) {
    try {
      const pkgPath = path.join(projPath, 'package.json');
      if (!fs.existsSync(pkgPath)) continue;

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (!pkg.name) continue;

      detectedNodes++;
      // POSIX conversion for determinism across platforms.
      const relative = path.relative(cwd, projPath).split(path.sep).join('/');
      routeServiceMap.forward[pkg.name] = { backend_route: relative || '.' };

      const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      adjacencyMap[pkg.name] = Object.keys(deps).sort();

      // Track each package.json we read (relative POSIX, for adapter sourceFiles).
      // `relative === ''` happens at the repo root (path.relative(cwd, cwd)).
      const relManifest =
        relative === '' || relative === '.'
          ? 'package.json'
          : `${relative}/package.json`;
      if (!sourceFiles.includes(relManifest)) sourceFiles.push(relManifest);
    } catch {
      // Skip unreadable package.json files (matches v1.2.0 behaviour).
    }
  }

  // Filter dependency edges down to internal nodes only.
  const internalNodes = new Set(Object.keys(adjacencyMap));
  for (const [node, edges] of Object.entries(adjacencyMap)) {
    adjacencyMap[node] = edges.filter((e) => internalNodes.has(e)).sort();
  }

  // Project adjacency map into the flat edge list expected by the
  // reconciliation runner. Historically this was a count, which
  // tripped 'edges is not iterable' downstream; we keep it as the
  // canonical array shape v1.2.0 shipped with.
  const edges: InternalExtractionState['edges'] = [];
  for (const source of Object.keys(adjacencyMap).sort()) {
    for (const target of adjacencyMap[source]!) {
      edges.push({
        source,
        target,
        type: 'workspace_dependency',
        confidence: 'namespace_inferred',
        adapter_id: 'local_fs',
      });
    }
  }

  sourceFiles.sort();

  return {
    workspaceType: probe.workspaceType,
    extractionMode: probe.extractionMode,
    adjacencyMap,
    routeServiceMap,
    detectedNodes,
    edges,
    internalNodeIds: Array.from(internalNodes).sort(),
    sourceFiles,
  };
}

// ─── Public: runMonorepoExtraction (LEGACY SHAPE, byte-identical) ──

export function runMonorepoExtraction(cwd: string): MonorepoExtractionResult {
  const state = runInternalExtraction(cwd);
  const internalCount = state.internalNodeIds.length;

  return {
    metadata: {
      coverage: internalCount > 0 ? 1.0 : 0,
      connectivity: 1.0,
      topologyConfidence: 1.0,
      detectedNodes: state.detectedNodes,
      connectedNodes: state.detectedNodes,
      expectedNodes: state.detectedNodes,
      warnings: [],
      workspaceType: state.workspaceType,
      // v1.2.0 hard-coded "structured" here even for the single-mode
      // path. Preserve byte-identical output.
      extractionMode: 'structured',
    },
    adjacencyMap: state.adjacencyMap,
    routeServiceMap: state.routeServiceMap,
    authorityCrossings: [],
    edgesByAdapter: { local_fs: state.edges },
  };
}

// ─── Public: legacy factory and singleton (byte-identical) ──

export function createMonorepoAdapter() {
  return { runMonorepoExtraction };
}

export const monorepoAdapter = createMonorepoAdapter();

// ─── Pass 1: ArchitectureAdapter-compatible class ───────

const ADAPTER_NAME = '@arch-engine/adapter-monorepo' as const;
const ADAPTER_VERSION = '1.3.1' as const;

/**
 * @internal Deterministic edge id matching the CLI canonical-topology
 * algorithm.
 */
function edgeId(from: string, to: string, type: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${from}|${to}|${type}`)
    .digest('hex')
    .slice(0, 8);
  return `e_${hash}`;
}

/**
 * @internal Deterministic graph-surface hash matching the CLI
 * canonical-topology algorithm. Identical sort, identical
 * serialisation, identical separator.
 */
function computeGraphSurfaceHash(
  nodes: ReadonlyArray<MonorepoAdapterCanonicalNode>,
  edges: ReadonlyArray<MonorepoAdapterCanonicalEdge>,
): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(nodes))
    .update('\n')
    .update(JSON.stringify(edges))
    .digest('hex');
}

/**
 * Adapter implementing the structural shape locked in
 * docs/adapters/multi-adapter-surface-spec.md §6.1.
 *
 * The class is exported so the CLI's internal registry can consume
 * it, but it is intentionally NOT part of the v1.x stability
 * contract — the public surface remains `runMonorepoExtraction`,
 * `classifyAuthorityDomain`, `createMonorepoAdapter`,
 * `monorepoAdapter`. Future minor releases MAY refine this class
 * (rename methods, change field shapes) without a major bump as
 * long as the public surface stays byte-identical.
 *
 * Determinism invariants (locked):
 *   - `detect()` performs at most two file existence checks and one
 *     synchronous JSON parse; no globbing, no recursion.
 *   - `extractTopology()` runs the same pipeline as
 *     `runMonorepoExtraction()` and produces a canonical
 *     (sorted-nodes, sorted-edges) shape with a deterministic
 *     `graphSurfaceHash`.
 *   - No wall-clock, no network, no process spawn, no repo
 *     mutation, no repo-code execution.
 */
export class MonorepoArchitectureAdapter {
  readonly adapterName: string = ADAPTER_NAME;
  readonly adapterVersion: string = ADAPTER_VERSION;

  detect(context: MonorepoAdapterContext): MonorepoAdapterDetectionResult {
    const probe = probeWorkspace(context.cwd);
    const reasons: string[] = [];
    const warnings: string[] = [];

    let detected = false;
    let confidence: MonorepoAdapterConfidence = 'NONE';
    let workspaceKind = 'unknown';
    let packageManager: MonorepoAdapterPackageManager = 'unknown';

    // Pass 2: when the dedicated pnpm adapter is registered, decline
    // pnpm-workspace.yaml so the pnpm adapter wins without surfacing
    // ARCH_ENGINE_ADAPTER_CONFLICT. Bridge sets this cache hint per
    // docs/adapters/multi-adapter-surface-spec.md §11.4.
    const pnpmAdapterAvailable = context.cache.get('archengine:pnpmAdapterAvailable') === true;

    // Pass 3: parallel decline for Yarn PnP. When the yarn-pnp adapter
    // is registered, decline `package.json#workspaces` repos that
    // *also* carry a `.pnp.cjs` or `.pnp.loader.mjs` so the yarn-pnp
    // adapter wins without triggering ARCH_ENGINE_ADAPTER_CONFLICT.
    // The monorepo adapter retains the fallback for yarn classic /
    // npm workspaces (no PnP file present).
    const yarnPnpAdapterAvailable =
      context.cache.get('archengine:yarnPnpAdapterAvailable') === true;
    const hasYarnPnpFile =
      fs.existsSync(path.join(context.cwd, '.pnp.cjs')) ||
      fs.existsSync(path.join(context.cwd, '.pnp.loader.mjs'));

    if (probe.workspaceType === 'pnpm') {
      if (pnpmAdapterAvailable) {
        return {
          adapterName: this.adapterName,
          detected: false,
          confidence: 'NONE',
          workspaceKind: 'pnpm-workspace',
          packageManager: 'pnpm',
          reasons: ['pnpm-workspace.yaml present; declining in favour of @arch-engine/adapter-pnpm'],
          warnings: [],
          diagnostics: [],
        };
      }
      detected = true;
      // Pass 1 fallback: monorepo still handles pnpm-workspace.yaml
      // when @arch-engine/adapter-pnpm is not installed.
      confidence = 'HIGH';
      workspaceKind = 'pnpm-workspace';
      packageManager = 'pnpm';
      reasons.push('pnpm-workspace.yaml present');
      if (probe.packageGlobs.length === 0) {
        warnings.push('pnpm-workspace.yaml had no parseable `packages:` entries');
      }
    } else if (probe.workspaceType === 'yarn-npm') {
      if (hasYarnPnpFile && yarnPnpAdapterAvailable) {
        return {
          adapterName: this.adapterName,
          detected: false,
          confidence: 'NONE',
          workspaceKind: 'yarn-pnp',
          packageManager: 'yarn-pnp',
          reasons: [
            '.pnp.cjs/.pnp.loader.mjs present; declining in favour of @arch-engine/adapter-yarn-pnp',
          ],
          warnings: [],
          diagnostics: [],
        };
      }
      detected = true;
      confidence = 'HIGH';
      workspaceKind = 'package-json-workspaces';
      packageManager = 'npm';
      reasons.push('package.json#workspaces is an array');
    } else {
      // single-package fallback: detected, but LOW confidence.
      detected = true;
      confidence = 'LOW';
      workspaceKind = 'single-package';
      packageManager = 'unknown';
      reasons.push('no pnpm-workspace.yaml or package.json#workspaces found');
      reasons.push('fallback: single-package directory scan');
    }

    return {
      adapterName: this.adapterName,
      detected,
      confidence,
      workspaceKind,
      packageManager,
      reasons,
      warnings,
      diagnostics: [],
    };
  }

  extractTopology(context: MonorepoAdapterContext): MonorepoAdapterTopologyResult {
    const state = runInternalExtraction(context.cwd);
    const detection = this.detect(context);

    // Build canonical (sorted) nodes from the internal node set.
    const nodes: MonorepoAdapterCanonicalNode[] = state.internalNodeIds.map((id) => ({
      id,
      type: 'package' as const,
    }));

    // Build canonical (sorted) edges from the adjacency map.
    const edges: MonorepoAdapterCanonicalEdge[] = [];
    const seenEdgeIds = new Set<string>();
    for (const source of state.internalNodeIds) {
      for (const target of state.adjacencyMap[source] ?? []) {
        const type = 'workspace_dependency';
        const id = edgeId(source, target, type);
        if (seenEdgeIds.has(id)) continue;
        seenEdgeIds.add(id);
        edges.push({ id, from: source, to: target, type });
      }
    }
    edges.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const graphSurfaceHash = computeGraphSurfaceHash(nodes, edges);

    return {
      graphSurfaceVersion: '1.0.0',
      graphSurfaceHash,
      nodes,
      edges,
      signals: {
        workspaceType: state.workspaceType,
        // Mirror runMonorepoExtraction's byte-identical
        // `extractionMode: 'structured'` value to keep
        // downstream signal consumers consistent.
        extractionMode: 'structured',
      },
      coverage: state.internalNodeIds.length > 0 ? 1.0 : 0,
      confidence: detection.confidence,
      sourceFiles: state.sourceFiles,
      adapterMetadata: {},
      diagnostics: [],
    };
  }

  explain(): MonorepoAdapterCapabilitySummary {
    return {
      adapterName: this.adapterName,
      supportsPackageJsonWorkspaces: true,
      supportsPnpmWorkspaces: true,
      supportsYarnPnp: false,
      executesRepositoryCode: false,
      readsLockfile: false,
      notes: [
        'Pass 1 transitional adapter. Until @arch-engine/adapter-pnpm ships, this adapter handles pnpm-workspace.yaml with the same limited parser used in v1.2.0.',
      ],
    };
  }
}

/**
 * Pass 1 factory. NOT part of the v1.x stability contract.
 */
export function createMonorepoArchitectureAdapter(): MonorepoArchitectureAdapter {
  return new MonorepoArchitectureAdapter();
}

/**
 * Pre-built singleton. Consumers (the CLI's internal registry) read
 * this directly. NOT part of the v1.x stability contract.
 */
export const monorepoArchitectureAdapter = createMonorepoArchitectureAdapter();
