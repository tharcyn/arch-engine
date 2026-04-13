import { describe, it, expect } from 'vitest';
import { assertContextFederationCompatibility } from '../../../src/execution/context/assertContextFederationCompatibility.js';

describe('Phase 8: Assert Context Federation Compatibility', () => {

  const fullCaps = {
      version: "8.0-alpha",
      principalSignalsSupported: true,
      resourceSignalsSupported: true,
      tenantScopeSupported: true,
      environmentSignalsSupported: true,
      temporalSignalsSupported: true,
      trustAnchorSignalsSupported: true,
      featureFlagsSupported: true,
      customSignalsSupported: true,
      deterministicSerialization: true
  };

  it('Test 1: Correctly validates mapped capabilities across disparate version layers', () => {
    expect(() => assertContextFederationCompatibility('8.0-alpha', fullCaps)).not.toThrow();

    expect(() => assertContextFederationCompatibility('8.0-alpha', { 
      ...fullCaps,
      deterministicSerialization: false
    })).toThrow('Serialization stability mapping parity broken');
  });

});
