/**
 * ═══════════════════════════════════════════════════════════
 *  Adapter Pass 1 — @arch-engine/adapter-monorepo compatibility
 * ═══════════════════════════════════════════════════════════
 *
 *  Asserts that the Pass 1 refactor of @arch-engine/adapter-monorepo
 *  preserves the existing public API verbatim AND additionally
 *  exposes a class conforming structurally to the internal
 *  ArchitectureAdapter contract.
 *
 *  These tests are subprocess-free. They import the real adapter
 *  module from the workspace and exercise it against the
 *  repository's own root cwd (which is itself a yarn-npm workspace).
 *
 *  Pass 1 invariants verified here:
 *    1. runMonorepoExtraction(cwd) returns the same legacy shape as
 *       v1.2.0 (metadata + adjacencyMap + routeServiceMap +
 *       authorityCrossings + edgesByAdapter).
 *    2. classifyAuthorityDomain still returns the documented
 *       AuthorityDomain values.
 *    3. createMonorepoAdapter() and monorepoAdapter singleton both
 *       expose `runMonorepoExtraction`.
 *    4. The new MonorepoArchitectureAdapter class:
 *         - exposes adapterName / adapterVersion / detect /
 *           extractTopology / explain
 *         - structurally satisfies isArchitectureAdapter()
 *         - detect() returns confidence === 'HIGH' on this repo
 *         - extractTopology() returns a canonical-topology-shaped
 *           result with sorted nodes/edges and a deterministic
 *           graphSurfaceHash
 *    5. Two invocations of extractTopology() on the same cwd
 *       produce byte-identical output (deterministic replay).
 *    6. The adapter does not surface any new ARCH_ENGINE_* code in
 *       its diagnostics array.
 */

import { describe, expect, test } from 'vitest';
import * as path from 'node:path';
import {
  runMonorepoExtraction,
  classifyAuthorityDomain,
  createMonorepoAdapter,
  monorepoAdapter,
  MonorepoArchitectureAdapter,
  createMonorepoArchitectureAdapter,
  monorepoArchitectureAdapter,
} from '@arch-engine/adapter-monorepo';
import {
  createAdapterContext,
  isArchitectureAdapter,
} from '../../src/adapters/adapter-contract.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

describe('Legacy public surface preservation', () => {
  test('runMonorepoExtraction returns the v1.2.0 legacy shape', () => {
    const result = runMonorepoExtraction(REPO_ROOT);
    // Top-level keys (locked).
    expect(Object.keys(result).sort()).toEqual(
      ['adjacencyMap', 'authorityCrossings', 'edgesByAdapter', 'metadata', 'routeServiceMap'].sort(),
    );
    // metadata sub-shape.
    expect(typeof result.metadata.coverage).toBe('number');
    expect(typeof result.metadata.connectivity).toBe('number');
    expect(typeof result.metadata.topologyConfidence).toBe('number');
    expect(typeof result.metadata.detectedNodes).toBe('number');
    expect(typeof result.metadata.connectedNodes).toBe('number');
    expect(typeof result.metadata.expectedNodes).toBe('number');
    expect(Array.isArray(result.metadata.warnings)).toBe(true);
    expect(typeof result.metadata.workspaceType).toBe('string');
    expect(typeof result.metadata.extractionMode).toBe('string');
    // Repo root is a yarn-npm workspace; extraction must succeed.
    expect(result.metadata.workspaceType).toBe('yarn-npm');
    expect(result.metadata.extractionMode).toBe('structured');
    expect(result.metadata.detectedNodes).toBeGreaterThan(0);
    // adjacency + edges.
    expect(typeof result.adjacencyMap).toBe('object');
    expect(typeof result.routeServiceMap.forward).toBe('object');
    expect(Array.isArray(result.authorityCrossings)).toBe(true);
    expect(typeof result.edgesByAdapter).toBe('object');
    expect(Array.isArray((result.edgesByAdapter as any).local_fs)).toBe(true);
  });

  test('classifyAuthorityDomain returns documented domain values', () => {
    expect(classifyAuthorityDomain('apps/web')).toBe('APPLICATION');
    expect(classifyAuthorityDomain('services/api')).toBe('SERVICE');
    expect(classifyAuthorityDomain('packages/lib')).toBe('LIBRARY');
    expect(classifyAuthorityDomain('lib/foundation')).toBe('FOUNDATION');
    expect(classifyAuthorityDomain('infra/terraform')).toBe('INFRASTRUCTURE');
    expect(classifyAuthorityDomain('unknown-segment/foo')).toBe('UNCLASSIFIED');
  });

  test('createMonorepoAdapter exposes runMonorepoExtraction', () => {
    const adapter = createMonorepoAdapter();
    expect(typeof adapter.runMonorepoExtraction).toBe('function');
  });

  test('monorepoAdapter singleton exposes runMonorepoExtraction', () => {
    expect(typeof monorepoAdapter.runMonorepoExtraction).toBe('function');
  });
});

describe('Pass 1 structural conformance', () => {
  test('MonorepoArchitectureAdapter class exposes adapterName/adapterVersion', () => {
    const adapter = new MonorepoArchitectureAdapter();
    expect(adapter.adapterName).toBe('@arch-engine/adapter-monorepo');
    // Bumped from 1.2.0 → 1.3.1 in Adapter Pass 3 (yarn-pnp cache-hint
    // protocol). The version constant tracks the package.json version.
    expect(adapter.adapterVersion).toBe('1.3.1');
  });

  test('createMonorepoArchitectureAdapter returns an instance of the class', () => {
    const adapter = createMonorepoArchitectureAdapter();
    expect(adapter).toBeInstanceOf(MonorepoArchitectureAdapter);
  });

  test('monorepoArchitectureAdapter singleton matches the class shape', () => {
    expect(monorepoArchitectureAdapter).toBeInstanceOf(MonorepoArchitectureAdapter);
  });

  test('singleton structurally satisfies isArchitectureAdapter', () => {
    expect(isArchitectureAdapter(monorepoArchitectureAdapter)).toBe(true);
  });

  test('detect() returns HIGH confidence on this repo (yarn-npm workspace)', () => {
    const ctx = createAdapterContext(REPO_ROOT);
    const detection = monorepoArchitectureAdapter.detect(ctx);
    expect(detection.detected).toBe(true);
    expect(detection.confidence).toBe('HIGH');
    expect(detection.workspaceKind).toBe('package-json-workspaces');
    expect(detection.packageManager).toBe('npm');
    expect(detection.adapterName).toBe('@arch-engine/adapter-monorepo');
    expect(detection.reasons.length).toBeGreaterThan(0);
  });

  test('extractTopology() returns canonical-topology-shaped output', () => {
    const ctx = createAdapterContext(REPO_ROOT);
    const topology = monorepoArchitectureAdapter.extractTopology(ctx);
    expect(topology.graphSurfaceVersion).toBe('1.0.0');
    expect(topology.graphSurfaceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Array.isArray(topology.nodes)).toBe(true);
    expect(Array.isArray(topology.edges)).toBe(true);
    expect(topology.nodes.length).toBeGreaterThan(0);
    // Nodes sorted by id ascending.
    for (let i = 1; i < topology.nodes.length; i++) {
      expect(topology.nodes[i - 1]!.id < topology.nodes[i]!.id).toBe(true);
    }
    // Edges sorted by id ascending.
    for (let i = 1; i < topology.edges.length; i++) {
      expect(topology.edges[i - 1]!.id < topology.edges[i]!.id).toBe(true);
    }
    // Edge ids match the e_<8hex> pattern.
    for (const edge of topology.edges) {
      expect(edge.id).toMatch(/^e_[0-9a-f]{8}$/);
    }
    // Signals carry workspace metadata.
    expect(topology.signals.workspaceType).toBe('yarn-npm');
    expect(topology.signals.extractionMode).toBe('structured');
    // Source files all relative POSIX paths.
    for (const f of topology.sourceFiles) {
      expect(path.isAbsolute(f)).toBe(false);
      expect(f.includes('\\')).toBe(false);
    }
  });

  test('extractTopology() produces deterministic graphSurfaceHash on repeat invocation', () => {
    const ctx1 = createAdapterContext(REPO_ROOT);
    const ctx2 = createAdapterContext(REPO_ROOT);
    const a = monorepoArchitectureAdapter.extractTopology(ctx1);
    const b = monorepoArchitectureAdapter.extractTopology(ctx2);
    expect(a.graphSurfaceHash).toBe(b.graphSurfaceHash);
    expect(JSON.stringify(a.nodes)).toBe(JSON.stringify(b.nodes));
    expect(JSON.stringify(a.edges)).toBe(JSON.stringify(b.edges));
    expect(JSON.stringify(a.signals)).toBe(JSON.stringify(b.signals));
    expect(JSON.stringify(a.sourceFiles)).toBe(JSON.stringify(b.sourceFiles));
  });

  test('explain() returns capability summary with executesRepositoryCode === false', () => {
    const summary = monorepoArchitectureAdapter.explain?.();
    expect(summary).toBeDefined();
    expect(summary?.executesRepositoryCode).toBe(false);
    expect(summary?.adapterName).toBe('@arch-engine/adapter-monorepo');
    expect(summary?.supportsPackageJsonWorkspaces).toBe(true);
  });

  test('extractTopology() emits no ARCH_ENGINE_* diagnostics in Pass 1', () => {
    const ctx = createAdapterContext(REPO_ROOT);
    const topology = monorepoArchitectureAdapter.extractTopology(ctx);
    // Pass 1 does not wire new diagnostic codes; the array must be empty.
    expect(topology.diagnostics).toEqual([]);
    // adapterMetadata likewise stays empty so JSON v2 has no surface
    // change in Pass 1.
    expect(topology.adapterMetadata).toEqual({});
  });
});

describe('Legacy ↔ structural cross-check', () => {
  test('runMonorepoExtraction node names appear in extractTopology node list', () => {
    const legacy = runMonorepoExtraction(REPO_ROOT);
    const topology = monorepoArchitectureAdapter.extractTopology(
      createAdapterContext(REPO_ROOT),
    );

    const legacyNames = Object.keys(legacy.adjacencyMap).sort();
    const canonicalIds = topology.nodes.map((n) => n.id).sort();

    // Every legacy adjacency-map key is a canonical node, and vice versa.
    expect(canonicalIds).toEqual(legacyNames);
  });

  test('legacy edge count matches canonical edge count', () => {
    const legacy = runMonorepoExtraction(REPO_ROOT);
    const topology = monorepoArchitectureAdapter.extractTopology(
      createAdapterContext(REPO_ROOT),
    );
    const legacyEdgeCount = (legacy.edgesByAdapter as { local_fs: unknown[] }).local_fs.length;
    expect(topology.edges.length).toBe(legacyEdgeCount);
  });
});
