import { describe, it, expect } from 'vitest';
import { ContextNormalizationPipeline } from '../../../src/execution/context/ContextNormalizationPipeline.js';

describe('Phase 8: Context Normalization Pipeline', () => {

  it('Test 1: Recursively clears undefined arrays, forces NFC unicode, strictly stable sorting array output types', () => {
    const model = {
      principal: { name: 'ma\u00F1ana' }, // NFC pre-composed 'ñ'
      resource: [{z:1}, undefined, {a:1}],
      tenant: 'demo',
      environment: {}, request: {}, temporal: {}, trustAnchors: {}, featureFlags: {}, customSignals: {}
    };

    const isolatedModel = {
      principal: { name: 'man\u0303ana' }, // NFD separated 'n' and '~'
      resource: [{z:1}, {a:1}],
      tenant: 'demo',
      environment: {}, request: {}, temporal: {}, trustAnchors: {}, featureFlags: {}, customSignals: {}
    };

    const pipelineA = new ContextNormalizationPipeline(model as any);
    const pipelineB = new ContextNormalizationPipeline(isolatedModel as any);

    const outA = pipelineA.normalize();
    const outB = pipelineB.normalize();

    // Check NFC logic resolves equivalence deterministic maps natively 
    expect(outA.principal.name).toBe(outB.principal.name);
    expect(outA.principal.name).toBe('ma\u00F1ana');

    // Array sorting explicitly enforces object key equivalence
    expect(JSON.stringify(outA.resource)).toBe(JSON.stringify([{"a":1},{"z":1}]));

    // Structural parity 
    expect(JSON.stringify(outA)).toEqual(JSON.stringify(outB));
  });

});
