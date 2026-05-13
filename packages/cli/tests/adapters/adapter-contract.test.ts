/**
 * ═══════════════════════════════════════════════════════════
 *  Adapter Contract — Pass 1 structural tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Pins the structural shape of the internal ArchitectureAdapter
 *  contract introduced in adapter Pass 1. No CLI subprocess; we
 *  exercise the contract module directly.
 *
 *  Scope:
 *    - Verify exported type shapes via runtime assertions on a
 *      minimal hand-built adapter.
 *    - Verify createAdapterContext() returns a fresh, isolated
 *      context per call.
 *    - Verify isArchitectureAdapter() correctly accepts conforming
 *      objects and rejects malformed ones.
 *
 *  These tests do NOT exercise any real adapter — they only pin
 *  the contract surface. Real-adapter behaviour lives in
 *  adapter-monorepo-compat.test.ts.
 */

import { describe, expect, test } from 'vitest';
import {
  createAdapterContext,
  isArchitectureAdapter,
  type ArchitectureAdapter,
  type AdapterContext,
  type AdapterDetectionResult,
  type AdapterTopologyResult,
} from '../../src/adapters/adapter-contract.js';

/**
 * Minimal conforming adapter used to exercise the contract surface
 * without depending on any real implementation.
 */
function buildStubAdapter(overrides: Partial<ArchitectureAdapter> = {}): ArchitectureAdapter {
  return {
    adapterName: 'test-adapter',
    adapterVersion: '0.0.0',
    detect(_ctx: AdapterContext): AdapterDetectionResult {
      return {
        adapterName: 'test-adapter',
        detected: false,
        confidence: 'NONE',
        workspaceKind: 'unknown',
        packageManager: 'unknown',
        reasons: [],
        warnings: [],
        diagnostics: [],
      };
    },
    extractTopology(_ctx: AdapterContext): AdapterTopologyResult {
      return {
        graphSurfaceVersion: '1.0.0',
        graphSurfaceHash: '0'.repeat(64),
        nodes: [],
        edges: [],
        signals: { workspaceType: 'single', extractionMode: 'fallback_directory_scan' },
        coverage: 0,
        confidence: 'NONE',
        sourceFiles: [],
        adapterMetadata: {},
        diagnostics: [],
      };
    },
    ...overrides,
  };
}

describe('createAdapterContext', () => {
  test('returns a context with cwd and a fresh cache map', () => {
    const ctx = createAdapterContext('/tmp/example');
    expect(ctx.cwd).toBe('/tmp/example');
    expect(ctx.cache).toBeInstanceOf(Map);
    expect(ctx.cache.size).toBe(0);
  });

  test('different calls return independent cache maps', () => {
    const a = createAdapterContext('/tmp/a');
    const b = createAdapterContext('/tmp/b');
    a.cache.set('x', 1);
    expect(a.cache.get('x')).toBe(1);
    expect(b.cache.has('x')).toBe(false);
  });
});

describe('isArchitectureAdapter', () => {
  test('accepts a structurally conforming adapter', () => {
    const adapter = buildStubAdapter();
    expect(isArchitectureAdapter(adapter)).toBe(true);
  });

  test('rejects null and non-objects', () => {
    expect(isArchitectureAdapter(null)).toBe(false);
    expect(isArchitectureAdapter(undefined)).toBe(false);
    expect(isArchitectureAdapter(42)).toBe(false);
    expect(isArchitectureAdapter('adapter')).toBe(false);
  });

  test('rejects objects missing required fields', () => {
    expect(isArchitectureAdapter({})).toBe(false);
    expect(isArchitectureAdapter({ adapterName: 'x' })).toBe(false);
    expect(
      isArchitectureAdapter({ adapterName: 'x', adapterVersion: '0' }),
    ).toBe(false);
    expect(
      isArchitectureAdapter({
        adapterName: 'x',
        adapterVersion: '0',
        detect: () => null,
      }),
    ).toBe(false);
  });

  test('accepts adapters without the optional explain() method', () => {
    const adapter = buildStubAdapter({ explain: undefined });
    expect(isArchitectureAdapter(adapter)).toBe(true);
  });
});

describe('AdapterDetectionResult shape', () => {
  test('detect() returns a result with required fields populated', () => {
    const adapter = buildStubAdapter({
      detect: () => ({
        adapterName: 'test-adapter',
        detected: true,
        confidence: 'HIGH',
        workspaceKind: 'fixture',
        packageManager: 'npm',
        reasons: ['signal A', 'signal B'],
        warnings: ['warn 1'],
        diagnostics: [
          {
            code: 'TEST_DIAG',
            severity: 'INFO',
            message: 'informational',
          },
        ],
      }),
    });
    const ctx = createAdapterContext('/tmp/example');
    const result = adapter.detect(ctx);
    expect(result.adapterName).toBe('test-adapter');
    expect(result.detected).toBe(true);
    expect(result.confidence).toBe('HIGH');
    expect(result.workspaceKind).toBe('fixture');
    expect(result.packageManager).toBe('npm');
    expect(result.reasons).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe('TEST_DIAG');
  });
});

describe('AdapterTopologyResult shape', () => {
  test('extractTopology() returns a canonical-topology-shaped object', () => {
    const adapter = buildStubAdapter({
      extractTopology: () => ({
        graphSurfaceVersion: '1.0.0',
        graphSurfaceHash: 'a'.repeat(64),
        nodes: [{ id: 'pkg-a', type: 'package' }],
        edges: [
          {
            id: 'e_12345678',
            from: 'pkg-a',
            to: 'pkg-b',
            type: 'workspace_dependency',
          },
        ],
        signals: { workspaceType: 'test', extractionMode: 'test' },
        coverage: 1,
        confidence: 'HIGH',
        sourceFiles: ['package.json'],
        adapterMetadata: { hint: 'value' },
        diagnostics: [],
      }),
    });

    const result = adapter.extractTopology(createAdapterContext('/tmp/example'));
    expect(result.graphSurfaceVersion).toBe('1.0.0');
    expect(result.graphSurfaceHash).toHaveLength(64);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.type).toBe('workspace_dependency');
    expect(result.signals.workspaceType).toBe('test');
    expect(result.coverage).toBe(1);
    expect(result.confidence).toBe('HIGH');
    expect(result.adapterMetadata).toEqual({ hint: 'value' });
  });
});

describe('AdapterCapabilitySummary shape', () => {
  test('explain() returns a capability summary with executesRepositoryCode: false', () => {
    const adapter = buildStubAdapter({
      explain: () => ({
        adapterName: 'test-adapter',
        supportsPackageJsonWorkspaces: true,
        supportsPnpmWorkspaces: false,
        supportsYarnPnp: false,
        executesRepositoryCode: false,
        readsLockfile: false,
        notes: ['test note'],
      }),
    });

    const summary = adapter.explain?.();
    expect(summary).toBeDefined();
    expect(summary?.executesRepositoryCode).toBe(false);
    expect(summary?.notes).toContain('test note');
  });
});
