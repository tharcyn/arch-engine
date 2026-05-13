/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/adapter-pnpm — Adapter-package tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Subprocess-free unit tests for the pnpm adapter. They exercise
 *  the public class and the legacy-shape helper against the
 *  fixtures under `packages/cli/tests/fixtures/adapters/`.
 *
 *  These tests live in the pnpm-adapter package itself so the
 *  adapter is consumable on its own; they do NOT depend on the CLI.
 */

import { describe, expect, test } from 'vitest';
import * as path from 'node:path';
import {
  PnpmArchitectureAdapter,
  pnpmArchitectureAdapter,
  createPnpmArchitectureAdapter,
  runPnpmExtraction,
  parsePnpmWorkspaceYaml,
  expandWorkspaceGlobs,
  buildPnpmPackageGraph,
} from '../src/index.js';

const FIX_DIR = path.resolve(__dirname, '..', '..', 'cli', 'tests', 'fixtures', 'adapters');
const F = {
  basic: path.join(FIX_DIR, 'pnpm-basic'),
  protocol: path.join(FIX_DIR, 'pnpm-workspace-protocol'),
  nested: path.join(FIX_DIR, 'pnpm-nested'),
  excluded: path.join(FIX_DIR, 'pnpm-excluded-glob'),
  empty: path.join(FIX_DIR, 'pnpm-empty-globs'),
  unnamed: path.join(FIX_DIR, 'pnpm-unnamed-package'),
};

function ctx(cwd: string) {
  return { cwd, cache: new Map<string, unknown>() };
}

describe('PnpmArchitectureAdapter — identity', () => {
  test('exposes stable adapterName / adapterVersion', () => {
    expect(pnpmArchitectureAdapter.adapterName).toBe('pnpm');
    expect(pnpmArchitectureAdapter.adapterVersion).toBe('0.1.0');
  });

  test('factory and singleton both produce class instances', () => {
    expect(createPnpmArchitectureAdapter()).toBeInstanceOf(PnpmArchitectureAdapter);
    expect(pnpmArchitectureAdapter).toBeInstanceOf(PnpmArchitectureAdapter);
  });
});

describe('PnpmArchitectureAdapter.detect()', () => {
  test('returns NONE without pnpm-workspace.yaml', () => {
    // Use the empty-globs fixture's parent (no workspace file at /tmp).
    const det = pnpmArchitectureAdapter.detect(ctx('/tmp/no-such-dir-arch-engine'));
    expect(det.detected).toBe(false);
    expect(det.confidence).toBe('NONE');
  });

  test('returns HIGH on a valid pnpm fixture with matching packages', () => {
    const det = pnpmArchitectureAdapter.detect(ctx(F.basic));
    expect(det.detected).toBe(true);
    expect(det.confidence).toBe('HIGH');
    expect(det.workspaceKind).toBe('pnpm-workspace');
    expect(det.packageManager).toBe('pnpm');
  });

  test('strengthens to HIGH when pnpm-lock.yaml and packageManager hint are present', () => {
    const det = pnpmArchitectureAdapter.detect(ctx(F.protocol));
    expect(det.confidence).toBe('HIGH');
    expect(det.reasons.some((r) => r.includes('pnpm-lock.yaml present'))).toBe(true);
    expect(det.reasons.some((r) => r.includes('packageManager starts with pnpm@'))).toBe(true);
  });

  test('returns MEDIUM when globs match zero packages', () => {
    const det = pnpmArchitectureAdapter.detect(ctx(F.empty));
    expect(det.detected).toBe(true);
    expect(det.confidence).toBe('MEDIUM');
    expect(det.diagnostics[0]?.code).toBe('ARCH_ENGINE_WORKSPACE_GLOBS_INVALID');
  });
});

describe('PnpmArchitectureAdapter.extractTopology()', () => {
  test('builds canonical nodes for a basic pnpm workspace', () => {
    const t = pnpmArchitectureAdapter.extractTopology(ctx(F.basic));
    expect(t.graphSurfaceVersion).toBe('1.0.0');
    expect(t.graphSurfaceHash).toMatch(/^[0-9a-f]{64}$/);
    const ids = t.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['@pnpm-basic/api', '@pnpm-basic/shared', '@pnpm-basic/web']);
  });

  test('extracts dependency / devDependency edges sorted by id', () => {
    const t = pnpmArchitectureAdapter.extractTopology(ctx(F.basic));
    expect(t.edges.length).toBeGreaterThan(0);
    for (let i = 1; i < t.edges.length; i++) {
      expect(t.edges[i - 1]!.id < t.edges[i]!.id).toBe(true);
    }
    // web → api (dev) and web → shared (dep).
    const webEdges = t.edges.filter((e) => e.from === '@pnpm-basic/web');
    const targets = webEdges.map((e) => e.to).sort();
    expect(targets).toEqual(['@pnpm-basic/api', '@pnpm-basic/shared']);
  });

  test('resolves workspace:* protocol to internal edges', () => {
    const t = pnpmArchitectureAdapter.extractTopology(ctx(F.protocol));
    const fromApi = t.edges.filter((e) => e.from === '@proto/api');
    expect(fromApi.find((e) => e.to === '@proto/lib')).toBeTruthy();
    // edgeMetadata should record protocol === 'workspace' for this edge.
    const meta = (t.adapterMetadata as any).edges as Record<string, { protocol: string }>;
    const id = fromApi.find((e) => e.to === '@proto/lib')!.id;
    expect(meta[id].protocol).toBe('workspace');
  });

  test('surfaces catalog protocol as LOCKFILE_UNSUPPORTED diagnostic', () => {
    const t = pnpmArchitectureAdapter.extractTopology(ctx(F.protocol));
    const catalog = t.diagnostics.find((d) => d.code === 'ARCH_ENGINE_LOCKFILE_UNSUPPORTED');
    expect(catalog).toBeDefined();
    expect(catalog!.severity).toBe('INFO');
  });

  test('handles two-segment nested globs (`packages/*/*`)', () => {
    const t = pnpmArchitectureAdapter.extractTopology(ctx(F.nested));
    const ids = t.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['@nested/pkg1', '@nested/pkg2']);
  });

  test('honours exclusion globs (`!packages/private-*`)', () => {
    const t = pnpmArchitectureAdapter.extractTopology(ctx(F.excluded));
    const ids = t.nodes.map((n) => n.id).sort();
    expect(ids).toContain('@excluded/public-pkg');
    expect(ids).not.toContain('@excluded/private-internal');
    const excluded = (t.adapterMetadata as any).pnpm.excludedGlobs as string[];
    expect(excluded).toContain('packages/private-internal');
  });

  test('emits WORKSPACE_PACKAGE_UNNAMED for an unnamed package', () => {
    const t = pnpmArchitectureAdapter.extractTopology(ctx(F.unnamed));
    const ids = t.nodes.map((n) => n.id);
    expect(ids).toContain('@unnamed-fixture/named');
    expect(ids).not.toContain(undefined as unknown as string);
    const diag = t.diagnostics.find((d) => d.code === 'ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED');
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('ERROR');
  });

  test('produces a deterministic graphSurfaceHash on repeated runs', () => {
    const a = pnpmArchitectureAdapter.extractTopology(ctx(F.basic));
    const b = pnpmArchitectureAdapter.extractTopology(ctx(F.basic));
    expect(a.graphSurfaceHash).toBe(b.graphSurfaceHash);
    expect(JSON.stringify(a.nodes)).toBe(JSON.stringify(b.nodes));
    expect(JSON.stringify(a.edges)).toBe(JSON.stringify(b.edges));
  });

  test('all source-file paths are repo-relative POSIX', () => {
    const t = pnpmArchitectureAdapter.extractTopology(ctx(F.basic));
    for (const f of t.sourceFiles) {
      expect(path.isAbsolute(f)).toBe(false);
      expect(f.includes('\\')).toBe(false);
    }
  });
});

describe('PnpmArchitectureAdapter.explain()', () => {
  test('reports executesRepositoryCode === false', () => {
    const summary = pnpmArchitectureAdapter.explain();
    expect(summary.executesRepositoryCode).toBe(false);
    expect(summary.supportsPnpmWorkspaces).toBe(true);
    expect(summary.supportsYarnPnp).toBe(false);
  });
});

describe('runPnpmExtraction()', () => {
  test('returns null when there is no pnpm-workspace.yaml', () => {
    expect(runPnpmExtraction('/tmp/no-such-dir-pnpm')).toBeNull();
  });

  test('returns legacy-shape MonorepoExtractionResult-compatible output for basic fixture', () => {
    const r = runPnpmExtraction(F.basic)!;
    expect(r).toBeTruthy();
    expect(r.metadata.workspaceType).toBe('pnpm');
    expect(r.metadata.extractionMode).toBe('structured');
    expect(Object.keys(r.adjacencyMap).sort()).toEqual([
      '@pnpm-basic/api',
      '@pnpm-basic/shared',
      '@pnpm-basic/web',
    ]);
    expect(r.routeServiceMap.forward['@pnpm-basic/api']?.backend_route).toBe('apps/api');
    expect(Array.isArray((r.edgesByAdapter as { local_fs: unknown[] }).local_fs)).toBe(true);
  });

  test('legacy adapterInfo metadata carries pnpm-specific block', () => {
    const r = runPnpmExtraction(F.protocol)!;
    expect(r.adapterInfo.metadata.pnpm.workspaceFile).toBe('pnpm-workspace.yaml');
    expect(r.adapterInfo.metadata.pnpm.lockfilePresent).toBe(true);
    expect(r.adapterInfo.metadata.pnpm.catalogsDetected).toBe(false);
  });
});

describe('parsePnpmWorkspaceYaml() — unit tests', () => {
  test('parses a simple packages list', () => {
    const out = parsePnpmWorkspaceYaml('packages:\n  - "apps/*"\n  - packages/*\n');
    expect(out.packages).toEqual(['apps/*', 'packages/*']);
    expect(out.catalogsDetected).toBe(false);
  });

  test('detects catalogs key', () => {
    const out = parsePnpmWorkspaceYaml('packages:\n  - "apps/*"\ncatalog:\n  react: ^18\n');
    expect(out.catalogsDetected).toBe(true);
  });

  test('returns packages: null when no `packages:` key exists', () => {
    const out = parsePnpmWorkspaceYaml('catalog:\n  react: ^18\n');
    expect(out.packages).toBeNull();
  });

  test('ignores comments', () => {
    const out = parsePnpmWorkspaceYaml(`# comment\npackages:\n  - "apps/*"  # inline\n`);
    expect(out.packages).toEqual(['apps/*']);
  });
});

describe('expandWorkspaceGlobs() — unit tests', () => {
  test('exclusion globs are honoured', () => {
    const e = expandWorkspaceGlobs(F.excluded, ['packages/*', '!packages/private-*']);
    expect(e.matchedDirs).toContain('packages/public-pkg');
    expect(e.matchedDirs).not.toContain('packages/private-internal');
    expect(e.excludedDirs).toContain('packages/private-internal');
  });

  test('two-segment wildcards walk recursively one level', () => {
    const e = expandWorkspaceGlobs(F.nested, ['packages/*/*']);
    expect(e.matchedDirs.sort()).toEqual([
      'packages/group-a/pkg1',
      'packages/group-a/pkg2',
    ]);
  });
});

describe('buildPnpmPackageGraph() — unit tests', () => {
  test('produces a stable graphSurfaceHash on the basic fixture', () => {
    const a = buildPnpmPackageGraph(F.basic, ['apps/api', 'apps/web', 'packages/shared']);
    const b = buildPnpmPackageGraph(F.basic, ['packages/shared', 'apps/web', 'apps/api']);
    expect(a.graphSurfaceHash).toBe(b.graphSurfaceHash);
  });
});
