import { describe, it, expect } from 'vitest';
import { enforcePlannerBoundary } from '../../src/transport/enforcePlannerBoundary.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.13: Planner Entry Boundary Enforcement Hook', () => {

  it('Test 1: Valid pipeline output passes enforcement hook', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(() => enforcePlannerBoundary([entry], entry)).not.toThrow();
  });

  it('Test 2: Root entry without executionMetadata fails', () => {
    const entry = { policyId: 'id' } as any;
    expect(() => enforcePlannerBoundary([entry], entry)).toThrow('no executionMetadata');
  });

  it('Test 3: Missing authoritative surface on root fails', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // Forcefully remove an authoritative surface after the freeze
    // This is impossible in TS natively, so we create a mock that looks right but is missing a surface.
    const mockMeta = { ...entry.executionMetadata };
    delete (mockMeta as any).stackIndex;
    Object.freeze(mockMeta);

    const mockRoot = { ...entry, executionMetadata: mockMeta } as any;
    expect(() => enforcePlannerBoundary([mockRoot], mockRoot)).toThrow('missing authoritative surfaces [stackIndex]');
  });

  it('Test 4: Non-frozen executionMetadata fails', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // Reconstruct with unfrozen metadata
    const mockRoot = {
        ...entry,
        executionMetadata: { ...entry.executionMetadata }
    } as any;

    expect(() => enforcePlannerBoundary([mockRoot], mockRoot)).toThrow('not deeply frozen');
  });

});
