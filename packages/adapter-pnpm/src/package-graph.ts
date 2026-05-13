/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-pnpm — Package graph builder
 * ═══════════════════════════════════════════════════════════
 *
 *  Reads each matched workspace package's `package.json` and produces
 *  the canonical (nodes, edges, signals, sourceFiles, adapterMetadata,
 *  diagnostics) tuple consumed by `PnpmArchitectureAdapter.extractTopology`.
 *
 *  Determinism:
 *    - Package paths sorted lexicographically before scan.
 *    - Edges sorted by canonical id (`e_<8hex>` from sha256).
 *    - graphSurfaceHash matches the algorithm in
 *      `packages/cli/src/canonical-topology.ts`.
 *    - All paths returned are repo-relative POSIX.
 *
 *  Edge kinds emitted in `adapterMetadata.edges.<id>.kind`:
 *    dependency | devDependency | peerDependency | optionalDependency
 *
 *  Edge protocols emitted in `adapterMetadata.edges.<id>.protocol`:
 *    workspace | catalog | semver
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export type PnpmDependencyKind =
  | 'dependency'
  | 'devDependency'
  | 'peerDependency'
  | 'optionalDependency';

export type PnpmEdgeProtocol = 'workspace' | 'catalog' | 'semver';

export interface PnpmDiagnostic {
  readonly code: string;
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
  readonly message: string;
  readonly path?: string;
  readonly details?: Record<string, unknown>;
}

export interface PnpmCanonicalNode {
  readonly id: string;
  readonly type: 'package';
}

export interface PnpmCanonicalEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
}

export interface PnpmEdgeMetadata {
  readonly kind: PnpmDependencyKind;
  readonly protocol: PnpmEdgeProtocol;
}

export interface PnpmPackageGraph {
  readonly nodes: ReadonlyArray<PnpmCanonicalNode>;
  readonly edges: ReadonlyArray<PnpmCanonicalEdge>;
  readonly graphSurfaceHash: string;
  /** pkgName → relative POSIX path under cwd (used for routeServiceMap.forward). */
  readonly packagePaths: Readonly<Record<string, string>>;
  /** Edge metadata keyed by canonical edge id; consumed by JSON v2 data.adapter.metadata.edges. */
  readonly edgeMetadata: Readonly<Record<string, PnpmEdgeMetadata>>;
  /** Relative POSIX paths of every file the builder read. */
  readonly sourceFiles: ReadonlyArray<string>;
  /** Catalog protocol references encountered during edge extraction. */
  readonly catalogReferences: ReadonlyArray<{
    readonly from: string;
    readonly dependency: string;
    readonly specifier: string;
  }>;
  /** Structured diagnostics surfaced during graph construction. */
  readonly diagnostics: ReadonlyArray<PnpmDiagnostic>;
  /** Number of matched workspace packages (including ones missing a name). */
  readonly matchedPackageCount: number;
  /** Number of packages with a `name` field. */
  readonly namedPackageCount: number;
}

/**
 * Build a deterministic package graph from a set of matched
 * workspace package directories (relative POSIX).
 *
 * @param cwd          Absolute repository root.
 * @param matchedDirs  Relative POSIX directories yielded by glob expansion.
 *                     Caller may include the repo root by using `'.'`.
 */
export function buildPnpmPackageGraph(
  cwd: string,
  matchedDirs: ReadonlyArray<string>,
): PnpmPackageGraph {
  const diagnostics: PnpmDiagnostic[] = [];
  const sourceFiles = new Set<string>();
  const packagePaths: Record<string, string> = {};
  const adjacency: Record<string, Array<{
    target: string;
    kind: PnpmDependencyKind;
    protocol: PnpmEdgeProtocol;
  }>> = {};
  const catalogReferences: Array<{
    from: string;
    dependency: string;
    specifier: string;
  }> = [];

  let matchedPackageCount = 0;
  let namedPackageCount = 0;

  // Stable scan order: lexicographic.
  const scanList = [...matchedDirs].sort();

  for (const rel of scanList) {
    const dir = rel === '.' || rel === '' ? cwd : path.join(cwd, rel);
    const manifestAbs = path.join(dir, 'package.json');
    if (!fs.existsSync(manifestAbs)) continue;

    matchedPackageCount++;
    const relManifest = rel === '.' || rel === '' ? 'package.json' : `${rel}/package.json`;
    sourceFiles.add(relManifest);

    let pkg: any;
    try {
      pkg = JSON.parse(fs.readFileSync(manifestAbs, 'utf-8'));
    } catch (err) {
      diagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED',
        severity: 'WARNING',
        message: `Could not parse ${relManifest}: ${(err as Error).message}`,
        path: relManifest,
      });
      continue;
    }

    if (typeof pkg.name !== 'string' || pkg.name.length === 0) {
      diagnostics.push({
        code: 'ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED',
        severity: 'ERROR',
        message: `Workspace package at ${rel || '.'} is missing a "name" field.`,
        path: relManifest,
      });
      continue;
    }

    namedPackageCount++;
    const name = pkg.name as string;
    packagePaths[name] = rel === '' ? '.' : rel;

    // Collect dependency edges across all four kinds. Order is
    // (dependencies, devDependencies, peerDependencies, optionalDependencies);
    // when the same target appears in multiple kinds, the first wins
    // for edge metadata — but the canonical edge id only encodes
    // (from, to, type) so dedup is on (from, to, type, kind).
    const declared: Array<[Record<string, unknown> | undefined, PnpmDependencyKind]> = [
      [pkg.dependencies as Record<string, unknown> | undefined, 'dependency'],
      [pkg.devDependencies as Record<string, unknown> | undefined, 'devDependency'],
      [pkg.peerDependencies as Record<string, unknown> | undefined, 'peerDependency'],
      [pkg.optionalDependencies as Record<string, unknown> | undefined, 'optionalDependency'],
    ];

    const edgeSet = adjacency[name] ?? [];
    const seenForKind = new Set<string>(); // `kind|target`
    for (const [block, kind] of declared) {
      if (!block || typeof block !== 'object') continue;
      const sortedDepNames = Object.keys(block).sort();
      for (const dep of sortedDepNames) {
        const specifier = block[dep];
        const protocol = classifyProtocol(specifier);
        if (protocol === 'catalog') {
          catalogReferences.push({
            from: name,
            dependency: dep,
            specifier: typeof specifier === 'string' ? specifier : '',
          });
        }
        const key = `${kind}|${dep}`;
        if (seenForKind.has(key)) continue;
        seenForKind.add(key);
        edgeSet.push({ target: dep, kind, protocol });
      }
    }
    adjacency[name] = edgeSet;
  }

  // Filter edges to internal nodes only (mirrors monorepo adapter
  // semantics: only workspace-internal edges become canonical
  // edges; external deps are not nodes in v1.x).
  const internalNodeIds = new Set(Object.keys(packagePaths));
  const filteredAdjacency: Record<string, typeof adjacency[string]> = {};
  for (const [from, edges] of Object.entries(adjacency)) {
    if (!internalNodeIds.has(from)) continue;
    const kept = edges
      .filter((e) => internalNodeIds.has(e.target))
      .sort((a, b) => {
        if (a.target !== b.target) return a.target < b.target ? -1 : 1;
        if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
        return 0;
      });
    filteredAdjacency[from] = kept;
  }

  // Build canonical nodes (sorted by id).
  const nodes: PnpmCanonicalNode[] = [...internalNodeIds]
    .sort()
    .map((id) => ({ id, type: 'package' as const }));

  // Build canonical edges with stable ids.
  const edges: PnpmCanonicalEdge[] = [];
  const edgeMetadata: Record<string, PnpmEdgeMetadata> = {};
  const seenEdgeIds = new Set<string>();

  for (const from of [...internalNodeIds].sort()) {
    const list = filteredAdjacency[from] ?? [];
    for (const e of list) {
      const type = 'workspace_dependency';
      const id = edgeIdFor(from, e.target, type);
      if (seenEdgeIds.has(id)) continue;
      seenEdgeIds.add(id);
      edges.push({ id, from, to: e.target, type });
      // First-seen edge metadata wins (kinds are visited in spec order).
      edgeMetadata[id] = { kind: e.kind, protocol: e.protocol };
    }
  }
  edges.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // graphSurfaceHash — algorithm shared with packages/cli/src/canonical-topology.ts.
  const graphSurfaceHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(nodes))
    .update('\n')
    .update(JSON.stringify(edges))
    .digest('hex');

  return {
    nodes,
    edges,
    graphSurfaceHash,
    packagePaths,
    edgeMetadata,
    sourceFiles: [...sourceFiles].sort(),
    catalogReferences,
    diagnostics,
    matchedPackageCount,
    namedPackageCount,
  };
}

/**
 * Stable edge id: `e_<sha256(from|to|type)[0..8]>`.
 * Locked to match `packages/cli/src/canonical-topology.ts` so baselines
 * compare cleanly across adapters.
 */
export function edgeIdFor(from: string, to: string, type: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${from}|${to}|${type}`)
    .digest('hex')
    .slice(0, 8);
  return `e_${hash}`;
}

// ─── Protocol classifier ──────────────────────────────

function classifyProtocol(specifier: unknown): PnpmEdgeProtocol {
  if (typeof specifier !== 'string') return 'semver';
  if (specifier.startsWith('workspace:')) return 'workspace';
  if (specifier.startsWith('catalog:') || specifier === 'catalog:') return 'catalog';
  return 'semver';
}
