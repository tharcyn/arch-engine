/**
 * ═══════════════════════════════════════════════════════════
 *  Adapter Registry — Pass 1 selection algorithm tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Exercises every selection branch documented in
 *  docs/adapters/multi-adapter-surface-spec.md §7.1 against the
 *  internal registry, with synthetic stub adapters.
 *
 *  Pass 1 deliberately does NOT wire selection into the CLI
 *  runtime; these tests pin the algorithm in isolation so it is
 *  ready for Pass 2 wiring.
 */

import { describe, expect, test } from 'vitest';
import {
  selectArchitectureAdapter,
  registerArchitectureAdapter,
  type RegisteredArchitectureAdapter,
} from '../../src/adapters/adapter-registry.js';
import {
  createAdapterContext,
  type ArchitectureAdapter,
  type AdapterConfidence,
  type AdapterContext,
  type AdapterDetectionResult,
  type AdapterTopologyResult,
} from '../../src/adapters/adapter-contract.js';

/**
 * Helper that builds a stub adapter producing a fixed detection
 * result. Lets each test focus on the selection logic rather than
 * detection mechanics.
 */
function stubAdapter(
  name: string,
  detected: boolean,
  confidence: AdapterConfidence,
): ArchitectureAdapter {
  return {
    adapterName: name,
    adapterVersion: '0.0.0',
    detect(_ctx: AdapterContext): AdapterDetectionResult {
      return {
        adapterName: name,
        detected,
        confidence,
        workspaceKind: name,
        packageManager: 'unknown',
        reasons: [`stub:${name}`],
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
        signals: { workspaceType: 'stub', extractionMode: 'stub' },
        coverage: 0,
        confidence,
        sourceFiles: [],
        adapterMetadata: {},
        diagnostics: [],
      };
    },
  };
}

function register(
  adapter: ArchitectureAdapter,
  precedence: number,
): RegisteredArchitectureAdapter {
  return registerArchitectureAdapter(adapter, precedence);
}

describe('selectArchitectureAdapter — single adapter', () => {
  test('returns RESOLVED when the only registered adapter detects HIGH', () => {
    const adapter = stubAdapter('only', true, 'HIGH');
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter([register(adapter, 4)], ctx);
    expect(result.status).toBe('RESOLVED');
    expect(result.selected?.adapter.adapterName).toBe('only');
    expect(result.detection?.confidence).toBe('HIGH');
    expect(result.runnersUp).toHaveLength(0);
    expect(result.allDetections).toHaveLength(1);
  });

  test('returns LOW_CONFIDENCE when the only adapter detects LOW', () => {
    const adapter = stubAdapter('weak', true, 'LOW');
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter([register(adapter, 4)], ctx);
    expect(result.status).toBe('LOW_CONFIDENCE');
    expect(result.selected?.adapter.adapterName).toBe('weak');
  });

  test('returns NONE when the only adapter does not detect', () => {
    const adapter = stubAdapter('absent', false, 'NONE');
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter([register(adapter, 4)], ctx);
    expect(result.status).toBe('NONE');
    expect(result.selected).toBeNull();
    expect(result.detection).toBeNull();
    expect(result.allDetections).toHaveLength(1);
  });
});

describe('selectArchitectureAdapter — confidence ordering', () => {
  test('HIGH beats MEDIUM beats LOW', () => {
    const high = stubAdapter('high', true, 'HIGH');
    const medium = stubAdapter('medium', true, 'MEDIUM');
    const low = stubAdapter('low', true, 'LOW');
    const ctx = createAdapterContext('/tmp/x');
    // Register in deliberately wrong order to prove sort beats registration order.
    const result = selectArchitectureAdapter(
      [register(low, 4), register(medium, 4), register(high, 4)],
      ctx,
    );
    expect(result.status).toBe('RESOLVED');
    expect(result.selected?.adapter.adapterName).toBe('high');
    expect(result.runnersUp.map((r) => r.adapter.adapter.adapterName)).toEqual(['medium', 'low']);
  });

  test('MEDIUM wins when no HIGH detection exists', () => {
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter(
      [
        register(stubAdapter('medium', true, 'MEDIUM'), 4),
        register(stubAdapter('low', true, 'LOW'), 4),
      ],
      ctx,
    );
    expect(result.status).toBe('RESOLVED');
    expect(result.selected?.adapter.adapterName).toBe('medium');
  });
});

describe('selectArchitectureAdapter — precedence tie-break', () => {
  test('lower declared precedence wins when confidences match', () => {
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter(
      [
        register(stubAdapter('lower-prec', true, 'MEDIUM'), 5),
        register(stubAdapter('higher-prec', true, 'MEDIUM'), 2),
      ],
      ctx,
    );
    expect(result.selected?.adapter.adapterName).toBe('higher-prec');
    expect(result.selected?.declaredPrecedence).toBe(2);
  });
});

describe('selectArchitectureAdapter — name tie-break', () => {
  test('alphabetical adapter name breaks ties when confidence and precedence match', () => {
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter(
      [
        register(stubAdapter('zebra', true, 'HIGH'), 3),
        register(stubAdapter('alpha', true, 'HIGH'), 3),
      ],
      ctx,
    );
    // Both HIGH → CONFLICT, but alpha wins precedence due to name sort.
    expect(result.status).toBe('CONFLICT');
    expect(result.selected?.adapter.adapterName).toBe('alpha');
    expect(result.runnersUp[0]?.adapter.adapter.adapterName).toBe('zebra');
  });
});

describe('selectArchitectureAdapter — multiple HIGH conflict', () => {
  test('returns CONFLICT and selects the highest-precedence HIGH adapter', () => {
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter(
      [
        register(stubAdapter('pnpm', true, 'HIGH'), 2),
        register(stubAdapter('monorepo', true, 'HIGH'), 4),
      ],
      ctx,
    );
    expect(result.status).toBe('CONFLICT');
    expect(result.selected?.adapter.adapterName).toBe('pnpm');
    expect(result.runnersUp).toHaveLength(1);
    expect(result.runnersUp[0]?.adapter.adapter.adapterName).toBe('monorepo');
  });

  test('non-detected adapters do not trigger CONFLICT', () => {
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter(
      [
        register(stubAdapter('pnpm', false, 'NONE'), 2),
        register(stubAdapter('monorepo', true, 'HIGH'), 4),
      ],
      ctx,
    );
    expect(result.status).toBe('RESOLVED');
    expect(result.selected?.adapter.adapterName).toBe('monorepo');
  });
});

describe('selectArchitectureAdapter — empty + no-detection cases', () => {
  test('empty registry returns NONE', () => {
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter([], ctx);
    expect(result.status).toBe('NONE');
    expect(result.selected).toBeNull();
    expect(result.allDetections).toHaveLength(0);
  });

  test('all adapters report detected:false returns NONE', () => {
    const ctx = createAdapterContext('/tmp/x');
    const result = selectArchitectureAdapter(
      [
        register(stubAdapter('a', false, 'NONE'), 2),
        register(stubAdapter('b', false, 'NONE'), 3),
      ],
      ctx,
    );
    expect(result.status).toBe('NONE');
    expect(result.selected).toBeNull();
    expect(result.allDetections).toHaveLength(2);
  });
});

describe('selectArchitectureAdapter — deterministic replay', () => {
  test('two invocations against the same registry produce identical results', () => {
    const ctx1 = createAdapterContext('/tmp/x');
    const ctx2 = createAdapterContext('/tmp/x');
    const registry = [
      register(stubAdapter('alpha', true, 'MEDIUM'), 3),
      register(stubAdapter('beta', true, 'HIGH'), 2),
      register(stubAdapter('gamma', false, 'NONE'), 4),
    ];
    const a = selectArchitectureAdapter(registry, ctx1);
    const b = selectArchitectureAdapter(registry, ctx2);
    expect(a.status).toBe(b.status);
    expect(a.selected?.adapter.adapterName).toBe(b.selected?.adapter.adapterName);
    expect(a.runnersUp.length).toBe(b.runnersUp.length);
    expect(a.runnersUp.map((r) => r.adapter.adapter.adapterName)).toEqual(
      b.runnersUp.map((r) => r.adapter.adapter.adapterName),
    );
  });
});

describe('registerArchitectureAdapter — factory shape', () => {
  test('wraps an adapter with declared precedence', () => {
    const adapter = stubAdapter('test', true, 'HIGH');
    const reg = registerArchitectureAdapter(adapter, 7);
    expect(reg.adapter).toBe(adapter);
    expect(reg.declaredPrecedence).toBe(7);
  });
});
