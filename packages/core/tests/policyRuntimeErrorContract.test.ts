import { describe, it, expect } from 'vitest';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../src/errors/policyErrors.js';

describe('Phase 3B: Error Surface Standardization Contract', () => {

  it('Test 1: Error serialization stable', () => {
    const error = new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.PATH_CYCLE_DETECTED,
      message: 'Cycle detected',
      policyId: 'policy-a',
      policyNamespace: 'local-test',
      contractVersion: 'v1',
      originLayer: 'CompositionResolver',
      stackDepth: 3
    });

    // Test runtime struct properties
    expect(error.code).toBe('PATH_CYCLE_DETECTED');
    expect(error.message).toBe('Cycle detected');
    expect(error.policyId).toBe('policy-a');
    expect(error.policyNamespace).toBe('local-test');
    expect(error.contractVersion).toBe('v1');
    expect(error.originLayer).toBe('CompositionResolver');
    expect(error.stackDepth).toBe(3);
    expect(error.name).toBe('PolicyRuntimeError');
    expect(error instanceof Error).toBe(true);
  });
});
