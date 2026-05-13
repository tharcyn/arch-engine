/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-yarn-pnp — Package graph builder
 * ═══════════════════════════════════════════════════════════
 *
 *  Reads each matched workspace package's `package.json` and produces
 *  the canonical (nodes, edges, signals, sourceFiles, adapterMetadata,
 *  diagnostics) tuple consumed by `YarnPnpArchitectureAdapter.extractTopology`.
 *
 *  Determinism:
 *    - Package paths sorted lexicographically before scan.
 *    - Edges sorted by canonical id (`e_<8hex>` from sha256).
 *    - graphSurfaceHash matches the algorithm in
 *      `packages/cli/src/canonical-topology.ts` so baselines compare
 *      cleanly across adapters.
 *    - All paths returned are repo-relative POSIX.
 *
 *  Edge protocols emitted in `adapterMetadata.edges.<id>.protocol`:
 *    workspace | portal | link | semver
 *
 *  Edge kinds emitted in `adapterMetadata.edges.<id>.kind`:
 *    dependency | devDependency | peerDependency | optionalDependency
 *
 *  Edge identity is the same as adapter-pnpm and adapter-monorepo:
 *    `e_<sha256(from|to|workspace_dependency)[0..8]>`.
 *  Cross-adapter baselines therefore line up modulo the documented
 *  root-inclusion asymmetry.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export type YarnPnpDependencyKind =
  | 'dependency'
  | 'devDependency'
  | 'peerDependency'
  | 'optionalDependency';

/**
 * Edge protocol classification:
 *   - `workspace`  → `workspace:*`, `workspace:^`, `workspace:~`,
 *                    `workspace:<semver>`, `workspace:<relative-path>`.
 *   - `portal`     → `portal:<path>` — local-only, resolves to a
 *                    package directory the consumer treats as a
 *                    workspace dep.
 *   - `link`       → `link:<path>` — also local; resolves only when
 *                    the target is a workspace package.
 *   - `semver`     → anything else (treated as opaque; never
 *                    materialises into an internal edge).
 */
export type YarnPnpEdgeProtocol = 'workspace' | 'portal' | 'link' | 'semver';

export interface YarnPnpDiagnostic {
  readonly code: string;
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
  readonly message: string;
  readonly path?: string;
  readonly details?: Record<string, unknown>;
}

export interface YarnPnpCanonicalNode {
  readonly id: string;
  readonly type: 'package';
}

export interface YarnPnpCanonicalEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;
}

export interface YarnPnpEdgeMetadata {
  readonly kind: YarnPnpDependencyKind;
  readonly protocol: YarnPnpEdgeProtocol;
}

export interface YarnPnpPackageGraph {
  readonly nodes: ReadonlyArray<YarnPnpCanonicalNode>;
  readonly edges: ReadonlyArray<YarnPnpCanonicalEdge>;
  readonly graphSurfaceHash: string;
  readonly packagePaths: Readonly<Record<string, string>>;
  readonly edgeMetadata: Readonly<Record<string, YarnPnpEdgeMetadata>>;
  readonly sourceFiles: ReadonlyArray<string>;
  /** Non-workspace, non-semver references (portal: / link:) that resolved to non-workspace paths. */
  readonly unresolvedLocalReferences: ReadonlyArray<{
    readonly from: string;
    readonly dependency: string;
    readonly specifier: string;
    readonly protocol: 'portal' | 'link';
  }>;
  readonly diagnostics: ReadonlyArray<YarnPnpDiagnostic>;
  readonly matchedPackageCount: number;
  readonly namedPackageCount: number;
}

export function buildYarnPnpPackageGraph(
  cwd: string,
  matchedDirs: ReadonlyArray<string>,
): YarnPnpPackageGraph {
  const diagnostics: YarnPnpDiagnostic[] = [];
  const sourceFiles = new Set<string>();
  const packagePaths: Record<string, string> = {};
  const adjacency: Record<
    string,
    Array<{
      target: string;
      kind: YarnPnpDependencyKind;
      protocol: YarnPnpEdgeProtocol;
    }>
  > = {};
  const unresolvedLocalReferences: Array<{
    from: string;
    dependency: string;
    specifier: string;
    protocol: 'portal' | 'link';
  }> = [];

  let matchedPackageCount = 0;
  let namedPackageCount = 0;

  const scanList = [...matchedDirs].sort();

  // First pass: load every package.json to learn the workspace
  // membership set (`internalNodeIds`). Required so portal:/link:
  // specifiers can be classified as "resolves to workspace" without
  // a second filesystem traversal during edge building.
  const pkgRecords: Array<{
    rel: string;
    relManifest: string;
    name: string;
    raw: any;
  }> = [];

  for (const rel of scanList) {
    const dir = rel === '.' || rel === '' ? cwd : path.join(cwd, rel);
    const manifestAbs = path.join(dir, 'package.json');
    if (!fs.existsSync(manifestAbs)) continue;

    matchedPackageCount++;
    const relManifest =
      rel === '.' || rel === '' ? 'package.json' : `${rel}/package.json`;
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
    pkgRecords.push({ rel, relManifest, name, raw: pkg });
  }

  // Build a path → name index for portal:/link: resolution.
  const internalNodeIds = new Set(Object.keys(packagePaths));
  const pathToName: Record<string, string> = {};
  for (const [name, rel] of Object.entries(packagePaths)) {
    pathToName[normaliseRel(rel)] = name;
  }

  // Second pass: extract dependency edges.
  for (const record of pkgRecords) {
    const { rel, name, raw: pkg } = record;
    const declared: Array<
      [Record<string, unknown> | undefined, YarnPnpDependencyKind]
    > = [
      [pkg.dependencies as Record<string, unknown> | undefined, 'dependency'],
      [
        pkg.devDependencies as Record<string, unknown> | undefined,
        'devDependency',
      ],
      [
        pkg.peerDependencies as Record<string, unknown> | undefined,
        'peerDependency',
      ],
      [
        pkg.optionalDependencies as Record<string, unknown> | undefined,
        'optionalDependency',
      ],
    ];

    const edgeSet = adjacency[name] ?? [];
    const seenForKind = new Set<string>();

    for (const [block, kind] of declared) {
      if (!block || typeof block !== 'object') continue;
      const sortedDepNames = Object.keys(block).sort();
      for (const dep of sortedDepNames) {
        const specifier = block[dep];
        const classification = classifySpecifier(specifier);

        // Resolve portal:/link: to a workspace name if the target
        // path is a known workspace package.
        let resolvedTarget: string | null = null;
        if (
          (classification.protocol === 'portal' ||
            classification.protocol === 'link') &&
          classification.localPath !== null
        ) {
          const target = resolveLocalPath(rel, classification.localPath);
          const normalised = normaliseRel(target);
          if (pathToName[normalised]) {
            resolvedTarget = pathToName[normalised]!;
          } else {
            unresolvedLocalReferences.push({
              from: name,
              dependency: dep,
              specifier:
                typeof specifier === 'string' ? specifier : '',
              protocol: classification.protocol,
            });
          }
        }

        // For workspace: / portal: / link: specifiers, the edge
        // target is the dependency *name* (the workspace name), not
        // the resolved path — Yarn workspaces always use the package
        // name as the bare identifier.
        const target =
          classification.protocol === 'portal' ||
          classification.protocol === 'link'
            ? resolvedTarget ?? dep
            : dep;

        const key = `${kind}|${target}|${classification.protocol}`;
        if (seenForKind.has(key)) continue;
        seenForKind.add(key);
        edgeSet.push({
          target,
          kind,
          protocol: classification.protocol,
        });
      }
    }
    adjacency[name] = edgeSet;
  }

  // Filter to internal-only edges.
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

  const nodes: YarnPnpCanonicalNode[] = [...internalNodeIds]
    .sort()
    .map((id) => ({ id, type: 'package' as const }));

  const edges: YarnPnpCanonicalEdge[] = [];
  const edgeMetadata: Record<string, YarnPnpEdgeMetadata> = {};
  const seenEdgeIds = new Set<string>();

  for (const from of [...internalNodeIds].sort()) {
    const list = filteredAdjacency[from] ?? [];
    for (const e of list) {
      const type = 'workspace_dependency';
      const id = edgeIdFor(from, e.target, type);
      if (seenEdgeIds.has(id)) continue;
      seenEdgeIds.add(id);
      edges.push({ id, from, to: e.target, type });
      edgeMetadata[id] = { kind: e.kind, protocol: e.protocol };
    }
  }
  edges.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

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
    unresolvedLocalReferences,
    diagnostics,
    matchedPackageCount,
    namedPackageCount,
  };
}

/**
 * Stable edge id matching the canonical-topology contract used by
 * adapter-pnpm and adapter-monorepo.
 */
export function edgeIdFor(from: string, to: string, type: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${from}|${to}|${type}`)
    .digest('hex')
    .slice(0, 8);
  return `e_${hash}`;
}

// ─── Specifier classification ────────────────────────────

function classifySpecifier(specifier: unknown): {
  protocol: YarnPnpEdgeProtocol;
  localPath: string | null;
} {
  if (typeof specifier !== 'string') {
    return { protocol: 'semver', localPath: null };
  }
  if (specifier.startsWith('workspace:')) {
    return { protocol: 'workspace', localPath: null };
  }
  if (specifier.startsWith('portal:')) {
    return { protocol: 'portal', localPath: specifier.slice('portal:'.length) };
  }
  if (specifier.startsWith('link:')) {
    return { protocol: 'link', localPath: specifier.slice('link:'.length) };
  }
  return { protocol: 'semver', localPath: null };
}

/**
 * Resolve a relative `portal:`/`link:` target path against the
 * consuming workspace package's directory. Returns a relative POSIX
 * path under the repository root.
 */
function resolveLocalPath(fromRel: string, target: string): string {
  // Trim simple leading `./`.
  let t = target.trim();
  if (t.startsWith('./')) t = t.slice(2);
  // path.posix.join handles ../ traversal cleanly.
  const fromDir = fromRel === '' || fromRel === '.' ? '.' : fromRel;
  const joined = path.posix.normalize(path.posix.join(fromDir, t));
  // Strip leading "./" emitted by normalise.
  if (joined.startsWith('./')) return joined.slice(2);
  return joined;
}

function normaliseRel(rel: string): string {
  if (rel === '' || rel === '.') return '.';
  // Collapse trailing slash. Keep relative POSIX form.
  return rel.replace(/\/+$/, '');
}
