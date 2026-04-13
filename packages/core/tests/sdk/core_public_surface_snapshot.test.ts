import { describe, it, expect } from 'vitest';
import * as CoreIndex from '../../src/index.js';

describe('Phase 10 Hard Invariant: SDK Public Surface Freeze Verification Layer 1', () => {

  it('enforces exact SDK export map preventing internal module leakage natively', () => {
    const exportedKeys = Object.keys(CoreIndex).sort();
    
    expect(exportedKeys).toMatchInlineSnapshot(`
      [
        "EngineRunner",
        "GOVERNANCE_TELEMETRY_SCHEMA_VERSION",
        "computeGraphStabilityIndex",
        "computeWeightedBlastRadii",
        "evaluatePolicy",
        "loadEngineManifest",
        "loadPolicyConfig",
        "parseEngineManifest",
        "rankAuthorityCrossings",
        "resolveSeverity",
        "validateAdapterCompatibility",
      ]
    `);
  });

});
