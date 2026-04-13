import { describe, it, expect } from 'vitest';
import { validateEvaluationContextModel } from '../../../src/execution/context/EvaluationContextModel.js';

describe('Phase 8: Evaluation Context Model Validation', () => {

  const validContext = () => ({
    principal: {},
    resource: {},
    tenant: 'tenant1',
    environment: {},
    request: {},
    temporal: {},
    trustAnchors: {},
    featureFlags: {},
    customSignals: {}
  });

  it('Test 1: Approves correctly structured plain-object context matrices natively', () => {
    expect(() => validateEvaluationContextModel(validContext())).not.toThrow();
  });

  it('Test 2: Rejects immediately on missing keys preserving schema structural invariants', () => {
    const invalid = validContext();
    delete (invalid as any).featureFlags;
    
    expect(() => validateEvaluationContextModel(invalid)).toThrow('missing required key: featureFlags');
  });

  it('Test 3: Parses out and rejects dynamic prototype models natively isolating state definitions securely', () => {
    const invalid = validContext();
    (invalid as any).customSignals = new Map();
    
    expect(() => validateEvaluationContextModel(invalid)).toThrow('contains non-plain-object types');
  });

});
