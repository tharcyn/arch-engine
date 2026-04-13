import { describe, test, expect } from 'vitest';
import { sortOverlayHandlerStackByPrecedence, computeHandlerSortKey } from '../../src/topology/overlayHandlerSorter.js';
import { OverlayAuthorityTier, OverlayHandlerMetadata } from '../../src/topology/seamContracts.js';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { wrapHandler, createTestSignatureEnvelope } from './utils/wrapHandler.js';

class MockRegistryAdapter extends RegistryAdapter {
    lookup(namespace: string, policyId: string) {
        if (namespace === 'core' && policyId === 'test-policy') {
            return {
                namespace, policyId,
                availableVersions: ['1.0.0'],
                registrySource: 'compat-test-source',
                manifests: { '1.0.0': {
                    dependencies: [], extends: [],
                    namespaces: { core: '1.0.0' },
                    issuerData: [], manifestMetadata: {},
                    capabilities: { required: [], provided: [] }
                }}
            };
        }
        throw new Error(`Unknown policy: ${namespace}://${policyId}`);
    }
}

describe('Freeze Evidence: Stack Sort Missing Metadata Fallback (F-4)', () => {

    test('sort key exists without any optional metadata', () => {
        const handler: OverlayHandlerMetadata = {
            overlaySourceId: 'bare-handler',
                overlayRegistrySource: 'unknown',
            overlayVersion: '1.0.0',
            handler: (x: any) => x
        };

        const key = computeHandlerSortKey(handler);
        // All defaults applied:
        expect(key[0]).toBe(100);  // UNTRUSTED default authority weight
        expect(key[1]).toBe(50);   // unknown registry
        expect(key[2]).toBe('');   // empty namespace
        expect(key[3]).toBe(0);    // default priority
        expect(key[4]).toBe(0);    // default declared order
        expect(key[5]).toBe('bare-handler');
        expect(key[6]).toBe('1.0.0');
    });

    test('sorting works with completely bare handler metadata', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'zeta',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x },
            { overlaySourceId: 'alpha',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted[0].overlaySourceId).toBe('alpha');
        expect(sorted[1].overlaySourceId).toBe('zeta');
    });

    test('single-handler stack returns identity (no sort needed)', () => {
        const handlers: OverlayHandlerMetadata[] = [
            { overlaySourceId: 'only',
                overlayRegistrySource: 'core', overlayVersion: '1.0.0', handler: (x: any) => x }
        ];

        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted).toBe(handlers); // Reference identity
    });

    test('empty handler stack returns identity', () => {
        const handlers: OverlayHandlerMetadata[] = [];
        const sorted = sortOverlayHandlerStackByPrecedence(handlers);
        expect(sorted).toBe(handlers);
    });

    test('zero-overlay parity remains intact after F-4', () => {
        const adapter = new MockRegistryAdapter();
        const options = {
            runtimeCapabilities: {
                engineVersion: '9.9.9',
                supportedLayers: ['governance', 'routing', 'security'],
                supportedDomains: ['identity', 'network', 'inventory'],
                providedCapabilities: ['auth-v1', 'metrics-v1']
            }
        };

        const pure = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, options);
        const withOverlays = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, {
            ...options,
            overlayExecutionContext: {
                activation: {
                    activeOverlays: [],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',allowPrecedenceOverrides: true,
                    seamOverrides: {}
                }
            }
        });

        expect(pure.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash)
            .toBe(withOverlays.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash);
    });

    test('fingerprint structure unchanged by F-4 sort', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'v1' }))
                        ]
                    }
                },
                runState
            }
        );

        expect(runState.seamHashFingerprints.length).toBe(1);
        // Fingerprint is a valid SHA-256 hex digest
        expect(runState.seamHashFingerprints[0]).toMatch(/^[a-f0-9]{64}$/);
    });
});
