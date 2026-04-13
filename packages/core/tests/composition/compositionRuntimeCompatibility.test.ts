import { describe, it, expect } from 'vitest';
import { assertCompositionRuntimeCompatibility } from '../../src/composition/assertCompositionRuntimeCompatibility.js';

describe('Phase 5: Composition Runtime Capability Negotiation', () => {

  it('Test 1: Passes when capabilities match exact expected structure', () => {
    const loaderCaps = {
      deterministicTopology: true,
      manifestEntropyAwareIdentity: true,
      registryProvenanceTracing: true,
      deepMetadataImmutability: true,
      plannerBoundaryEnforced: true
    } as any;

    const runtimeCaps = {
      deterministicTierResolution: true,
      conflictSurfaceDetection: true,
      precedenceGraphPlanning: true,
      plannerBoundaryCompliance: true
    } as any;

    expect(() => assertCompositionRuntimeCompatibility(loaderCaps, runtimeCaps)).not.toThrow();
  });

  it('Test 2: Fails when loader requires deterministic topology but runtime lacks support', () => {
    const loaderCaps = { deterministicTopology: true } as any;
    const runtimeCaps = { deterministicTierResolution: false } as any;

    expect(() => assertCompositionRuntimeCompatibility(loaderCaps, runtimeCaps)).toThrow('deterministic tier resolution is not supported');
  });

  it('Test 3: Fails when loader enforces planner boundaries but runtime does not comply', () => {
    const loaderCaps = { plannerBoundaryEnforced: true } as any;
    const runtimeCaps = { plannerBoundaryCompliance: false } as any;

    expect(() => assertCompositionRuntimeCompatibility(loaderCaps, runtimeCaps)).toThrow('runtime lacks planner boundary compliance');
  });

  it('Test 4: Aggregates multiple mismatches in one error', () => {
    const loaderCaps = { deepMetadataImmutability: true, manifestEntropyAwareIdentity: true } as any;
    const runtimeCaps = { precedenceGraphPlanning: false, conflictSurfaceDetection: false } as any;

    let caught: any;
    try {
      assertCompositionRuntimeCompatibility(loaderCaps, runtimeCaps);
    } catch (e) {
      caught = e;
    }

    expect(caught.message).toContain('immutability requires runtime precedence graph');
    expect(caught.message).toContain('entropy identity requires runtime conflict');
  });

});
