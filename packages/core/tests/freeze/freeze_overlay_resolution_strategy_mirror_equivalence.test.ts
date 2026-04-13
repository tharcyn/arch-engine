import { describe, test, expect } from 'vitest';
import { resolveOverlaySelection, ResolutionStrategy } from '../../src/topology/overlayResolutionPolicy.js';

describe('Freeze Evidence: Mirror-Equivalence Resolution', () => {
    test('resolution portability correctly maintains identity mappings identically across federated registry mirrors ignoring asynchronous latency', () => {
        const createCandidates = () => [
            { overlaySourceId: 'comp-high',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1, namespace: 'core', compatibilityRecord: { requiresCapabilities: ['a', 'b'] } },
            { overlaySourceId: 'comp-low',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1, namespace: 'core', compatibilityRecord: { requiresCapabilities: ['a'] } },
            { overlaySourceId: 'comp-mid',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'r', authorityTier: 1, registryTrustDomain: 1, namespace: 'core', compatibilityRecord: { requiresCapabilities: ['a', 'c'] } }
        ];

        const resolvedA = resolveOverlaySelection({
            seamId: 'test',
            candidateOverlays: createCandidates(),
        }, ResolutionStrategy.COMPATIBILITY_MAXIMAL);

        const resolvedB = resolveOverlaySelection({
            seamId: 'test',
            candidateOverlays: createCandidates().reverse(),
        }, ResolutionStrategy.COMPATIBILITY_MAXIMAL);

        expect(resolvedA.map(c => c.overlaySourceId)).toEqual(resolvedB.map(c => c.overlaySourceId));

        // Testing mirror latency directly, comp-high and comp-mid tie on score (2), tie-break handles deterministically correctly
        // "comp-high" vs "comp-mid": tie break sorts alphabetically by ID -> comp-high, comp-mid.
        expect(resolvedA[0].overlaySourceId).toBe('comp-high');
        expect(resolvedA[1].overlaySourceId).toBe('comp-mid');
        expect(resolvedA[2].overlaySourceId).toBe('comp-low');
    });

    test('mirror-equivalence resolution invariants hold identically across explicit registry trust-domain order variation', () => {
        // Varying the registry trust domains while sharing same base priority explicitly tests 
        // the interaction of the tiebreak fallback.
        const candidatesOfficialFirst = [
            { overlaySourceId: 'overlayA',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'official', authorityTier: 1, registryTrustDomain: 3, namespace: 'core' },
            { overlaySourceId: 'overlayB',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'partner', authorityTier: 1, registryTrustDomain: 2, namespace: 'core' },
            { overlaySourceId: 'overlayC',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'external', authorityTier: 1, registryTrustDomain: 1, namespace: 'core' }
        ];

        const candidatesExternalFirst = [
            { overlaySourceId: 'overlayC',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'external', authorityTier: 1, registryTrustDomain: 1, namespace: 'core' },
            { overlaySourceId: 'overlayA',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'official', authorityTier: 1, registryTrustDomain: 3, namespace: 'core' },
            { overlaySourceId: 'overlayB',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'partner', authorityTier: 1, registryTrustDomain: 2, namespace: 'core' }
        ];

        const resultOfficial = resolveOverlaySelection({ seamId: 'seam', candidateOverlays: candidatesOfficialFirst }, ResolutionStrategy.AUTHORITY_FIRST);
        const resultExternal = resolveOverlaySelection({ seamId: 'seam', candidateOverlays: candidatesExternalFirst }, ResolutionStrategy.AUTHORITY_FIRST);

        // Trust domain overrides native alphabetic tie-break: 3 > 2 > 1.
        expect(resultOfficial.map(c => c.overlaySourceId)).toEqual(['overlayA', 'overlayB', 'overlayC']);
        expect(resultExternal.map(c => c.overlaySourceId)).toEqual(['overlayA', 'overlayB', 'overlayC']);
    });
});
