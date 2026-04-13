import { describe, it, expect } from 'vitest';
import { assertAuthoritativeTopologySurface } from '../../src/transport/assertAuthoritativeTopologySurface.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.12: Authoritative Topology Surface', () => {

  it('Test 1: Pipeline output passes topology certification', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(() =>
      assertAuthoritativeTopologySurface([entry], entry.executionMetadata.snapshotEnvelope)
    ).not.toThrow();
  });

  it('Test 2: Missing stackIndex throws AUTHORITATIVE_TOPOLOGY_SURFACE_MISSING', () => {
    const entry = {
      policyId: 'x', policyNamespace: 'ns', hash: 'h', config: { version: 1 },
      executionMetadata: { dependencyDepth: 0 }
    };
    const env = { dependencyGraphShapeHash: 'hash' } as any;
    expect(() => assertAuthoritativeTopologySurface([entry as any], env)).toThrow('stackIndex');
  });

  it('Test 3: Missing dependencyDepth throws', () => {
    const entry = {
      policyId: 'x', policyNamespace: 'ns', hash: 'h', config: { version: 1 },
      executionMetadata: { stackIndex: 0 }
    };
    const env = { dependencyGraphShapeHash: 'hash' } as any;
    expect(() => assertAuthoritativeTopologySurface([entry as any], env)).toThrow('dependencyDepth');
  });

  it('Test 4: Missing dependencyGraphShapeHash on envelope throws', () => {
    const entry = {
      policyId: 'x', policyNamespace: 'ns', hash: 'h', config: { version: 1 },
      executionMetadata: { stackIndex: 0, dependencyDepth: 0 }
    };
    const env = {} as any;
    expect(() => assertAuthoritativeTopologySurface([entry as any], env))
      .toThrow('dependencyGraphShapeHash');
  });

  it('Test 5: Root depth 0 exists in pipeline output', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(entry.executionMetadata.dependencyDepth).toBe(0);
  });

});
