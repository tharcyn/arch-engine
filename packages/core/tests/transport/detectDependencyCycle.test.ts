import { describe, it, expect } from 'vitest';
import { detectDependencyCycle } from '../../src/transport/detectDependencyCycle.js';
import { PolicyStackEntry } from '../../src/policy/types.js';
import { PolicyRuntimeErrorCode } from '../../src/errors/policyErrors.js';

describe('Phase 4: detectDependencyCycle', () => {

  const createEntry = (id: string, ext?: string[]): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: 'ns',
    hash: 'h',
    config: {
      version: 1,
      extends: ext
    }
  });

  it('Test 1: Normal graph passes', () => {
    const a = createEntry('a', ['b']);
    const b = createEntry('b', []);
    
    expect(() => detectDependencyCycle([a, b], a)).not.toThrow();
  });

  it('Test 2: Simple cycle throws deterministic error', () => {
    const a = createEntry('a', ['b']);
    const b = createEntry('b', ['a']);
    
    try {
      detectDependencyCycle([a, b], a);
      expect.fail('Should have thrown cycle error');
    } catch (e: any) {
      expect(e.code).toBe(PolicyRuntimeErrorCode.POLICY_DEPENDENCY_CYCLE_DETECTED);
      expect(e.loaderStageMetadata.validationStage).toBe('detectDependencyCycle');
      expect(e.cyclePath).toEqual([
        'policy://ns/a@1',
        'policy://ns/b@1',
        'policy://ns/a@1'
      ]);
    }
  });

});
