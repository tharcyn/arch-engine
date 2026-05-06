import * as fs from 'node:fs';
import * as path from 'node:path';

// Core Contract Typings
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

export type AuthorityDomain = 'APPLICATION' | 'SERVICE' | 'LIBRARY' | 'FOUNDATION' | 'INFRASTRUCTURE' | 'UNCLASSIFIED';

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

export function classifyAuthorityDomain(route: string): AuthorityDomain {
  const segment = route.split(/[\/\\]/)[0]?.toLowerCase() || '';
  if (['app', 'apps'].includes(segment)) return 'APPLICATION';
  if (['service', 'services'].includes(segment)) return 'SERVICE';
  if (['package', 'packages', 'pkg'].includes(segment)) return 'LIBRARY';
  if (['lib', 'libs'].includes(segment)) return 'FOUNDATION';
  if (['infra', 'scripts', 'config', 'action'].includes(segment)) return 'INFRASTRUCTURE';
  return 'UNCLASSIFIED';
}

function detectWorkspace(cwd: string): { type: string, mode: string } {
  if (fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) {
    return { type: 'pnpm', mode: 'structured' };
  }
  if (fs.existsSync(path.join(cwd, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
    if (pkg.workspaces) {
      return { type: 'npm-yarn', mode: 'structured' };
    }
  }
  return { type: 'single', mode: 'fallback_directory_scan' };
}

export function createMonorepoAdapter() {
  return {
    runMonorepoExtraction
  };
}

export const monorepoAdapter = createMonorepoAdapter();

export function runMonorepoExtraction(cwd: string): MonorepoExtractionResult {
  const adjacencyMap: Record<string, string[]> = {};
  const routeServiceMap: { forward: Record<string, RouteServiceMapping> } = { forward: {} };
  let detectedNodes = 0;
  
  let packages: string[] = [];
  let workspaceType = 'single';
  
  if (fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) {
    workspaceType = 'pnpm';
    const content = fs.readFileSync(path.join(cwd, 'pnpm-workspace.yaml'), 'utf-8');
    const lines = content.split('\n');
    let inPackages = false;
    for (const line of lines) {
      if (line.trim().startsWith('packages:')) inPackages = true;
      else if (inPackages && line.trim().startsWith('-')) packages.push(line.replace('-', '').trim().replace(/['"]/g, ''));
      else if (inPackages && line.trim() && !line.startsWith(' ')) inPackages = false;
    }
  } else if (fs.existsSync(path.join(cwd, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
    if (pkg.workspaces && Array.isArray(pkg.workspaces)) {
      workspaceType = 'yarn-npm';
      packages = pkg.workspaces;
    }
  }
  
  const resolvedPaths = new Set<string>();
  resolvedPaths.add(cwd); // Root

  for (const glob of packages.sort()) {
    if (glob.endsWith('/*')) {
      const baseDir = path.join(cwd, glob.slice(0, -2));
      if (fs.existsSync(baseDir)) {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name)
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
      // POSIX conversion for path.relative determinism
      const relative = path.relative(cwd, projPath).split(path.sep).join('/');
      routeServiceMap.forward[pkg.name] = { backend_route: relative || '.' };
      
      const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      adjacencyMap[pkg.name] = Object.keys(deps).sort();
    } catch { }
  }

  const internalNodes = new Set(Object.keys(adjacencyMap));
  for (const [node, edges] of Object.entries(adjacencyMap)) {
    adjacencyMap[node] = edges.filter(e => internalNodes.has(e)).sort();
  }

  // Project the adjacency map into a flat array of reconcilable edges.
  // The reconciliation runner iterates each adapter's edge list, so this
  // value must be an array — historically a count was emitted here, which
  // tripped TypeError: edges is not iterable downstream.
  const edges: Array<{
    source: string;
    target: string;
    type: string;
    confidence: 'namespace_inferred';
    adapter_id: 'local_fs';
  }> = [];
  for (const source of Object.keys(adjacencyMap).sort()) {
    for (const target of adjacencyMap[source]) {
      edges.push({
        source,
        target,
        type: 'workspace_dependency',
        confidence: 'namespace_inferred',
        adapter_id: 'local_fs',
      });
    }
  }

  return {
    metadata: {
      coverage: internalNodes.size > 0 ? 1.0 : 0,
      connectivity: 1.0,
      topologyConfidence: 1.0,
      detectedNodes,
      connectedNodes: detectedNodes,
      expectedNodes: detectedNodes,
      warnings: [],
      workspaceType,
      extractionMode: 'structured'
    },
    adjacencyMap,
    routeServiceMap,
    authorityCrossings: [],
    edgesByAdapter: { local_fs: edges }
  };
}
