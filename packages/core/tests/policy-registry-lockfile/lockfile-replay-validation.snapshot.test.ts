import { describe, test, expect } from 'vitest';
import type { RegistryPolicyPackManifest } from '../../src/policy-registry/PolicyPackManifest.js';
import { resolvePolicyPackDependencyGraph } from '../../src/policy-registry/resolvePolicyPackDependencyGraph.js';
import { generatePolicyPackLockfile } from '../../src/policy-registry/generatePolicyPackLockfile.js';
import { verifyPolicyPackLockfileReplay } from '../../src/policy-registry/verifyPolicyPackLockfileReplay.js';

describe('Lockfile Replay Validation Contract', () => {
    test('detects drift in context or graph', () => {
        const packA: RegistryPolicyPackManifest = {
            policyPackId: 'alpha-pack',
            policyPackVersion: '2.0.0',
            supportedCapabilities: ['A'],
            requiredCapabilities: ['A'],
            supportedDatasetSchemas: ['schema-alpha'],
            supportedExecutionModes: ['single-provider']
        };

        const graphResult = resolvePolicyPackDependencyGraph([packA], [packA]);

        const lockfile = generatePolicyPackLockfile(
            graphResult,
            ['A'], 
            ['schema-alpha'], 
            'single-provider', 
            'hash-1'
        );

        // Drift graph (version bump)
        const packADrift: RegistryPolicyPackManifest = { ...packA, policyPackVersion: '2.0.1' };
        const driftGraphResult = resolvePolicyPackDependencyGraph([packADrift], [packADrift]);

        const validation = verifyPolicyPackLockfileReplay(
            lockfile,
            driftGraphResult,
            ['A', 'B'], // Drifted capability intersection
            ['schema-alpha'],
            'single-provider',
            'hash-2' // Drifted execution hash
        );

        expect(validation).toMatchInlineSnapshot(`
          {
            "capabilityDriftDetected": [
              "Capability intersection hash mismatch. Expected: d2a4b37cac0a57e42b1fe002a68c2449a7e41646eec1a92a0f0acd39fae589ce, Found: b64e3448a83a5b86466465080361c1a7e1157a27ddccd4b68069cb18caffb74a",
            ],
            "datasetDriftDetected": [],
            "dependencyDriftDetected": [
              "Version drift for alpha-pack: Locked 2.0.0, Resolved 2.0.1",
            ],
            "executionModeDriftDetected": [],
            "registryDriftDetected": [
              "Federation execution hash mismatch.",
              "Manifest hash drift for alpha-pack",
            ],
            "replayCompatible": false,
          }
        `);
    });
});
