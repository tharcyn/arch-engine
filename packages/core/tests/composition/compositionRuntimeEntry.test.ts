import { describe, it, expect } from 'vitest';
import { compositionRuntimeEntry } from '../../src/composition/compositionRuntimeEntry.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';
import { deepFreezeDeterministic } from '../../src/transport/deepFreezeDeterministic.js';

describe('Phase 5: Composition Runtime Entry', () => {

  it('Test 1: Valid pipeline output passes composition boundaries', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    expect(() => compositionRuntimeEntry([entry], entry)).not.toThrow();
  });

  it('Test 2: Missing envelope fails runtime entry', () => {
    const mockRoot = { policyId: 'test' } as any;
    expect(() => compositionRuntimeEntry([mockRoot], mockRoot)).toThrow('missing SnapshotEnvelope');
  });

  it('Test 3: Incorrect envelope version fails', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // Mute strictly to mimic a malicious payload (ignore freeze context by making simple copy for testing version read string layer)
    const mockMeta = { ...entry.executionMetadata };
    const mockEnvelope = { ...mockMeta.snapshotEnvelope, snapshotEnvelopeVersion: 'v0-legacy' };
    mockMeta.snapshotEnvelope = mockEnvelope as any;
    deepFreezeDeterministic(mockMeta, 'mock'); // required for boundary checks
    
    const mockRoot = { ...entry, executionMetadata: mockMeta } as any;

    expect(() => compositionRuntimeEntry([mockRoot], mockRoot)).toThrow('SnapshotEnvelope version');
  });

});
