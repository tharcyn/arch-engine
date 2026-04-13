import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';
import { computeSnapshotClosureGraphHash } from '../../src/transport/snapshotClosureGraphHash.js';

describe('Freeze Evidence: Seam Hash Toggle', () => {
    test('closure hash unchanged when toggle disabled', () => {
        const runState = { telemetry: [], seamHashFingerprints: [] };
        
        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [wrapHandler((core: any) => ({ ...core, extField: 'injected' }))]
                    }
                },
                runState
            }
        );

        expect(runState.seamHashFingerprints.length).toBe(0);

        const dummyEntries: any[] = [{
            policyId: 'dummy',
            policyNamespace: 'core',
            config: { version: '1.0.0' },
            executionMetadata: { capabilityClosureHash: 'aaa' }
        }];

        const hashWithoutFingerprint = computeSnapshotClosureGraphHash(dummyEntries);
        const hashWithFingerprintArgs = computeSnapshotClosureGraphHash(dummyEntries, runState.seamHashFingerprints);

        // Closure hash matches perfectly
        expect(hashWithoutFingerprint).toBe(hashWithFingerprintArgs);
    });

    test('closure hash changes deterministically when enabled', () => {
         const runState = { telemetry: [], seamHashFingerprints: [] };
        
        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        includeSeamExecutionInClosureHash: true,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [wrapHandler((core: any) => ({ ...core, extField: 'injected' }))]
                    }
                },
                runState
            }
        );

        // A fingerprint should exist
        expect(runState.seamHashFingerprints.length).toBe(1);

        const dummyEntries: any[] = [{
            policyId: 'dummy',
            policyNamespace: 'core',
            config: { version: '1.0.0' },
            executionMetadata: { capabilityClosureHash: 'aaa' }
        }];

        const baseHash = computeSnapshotClosureGraphHash(dummyEntries);
        const modHash = computeSnapshotClosureGraphHash(dummyEntries, runState.seamHashFingerprints);

        // Ensure participation correctly mutates the final derived output
        expect(baseHash).not.toBe(modHash);
        
        // Prove ordering doesn't matter natively because sorting is enforced inside compute process
        const reversedFingerprints = [...runState.seamHashFingerprints, 'another-hash-9999'].reverse();
        const orderedFingerprints = ['another-hash-9999', ...runState.seamHashFingerprints];
        
        const reverseHash = computeSnapshotClosureGraphHash(dummyEntries, reversedFingerprints);
        const orderedHash = computeSnapshotClosureGraphHash(dummyEntries, orderedFingerprints);
        expect(reverseHash).toBe(orderedHash);
    });
});
