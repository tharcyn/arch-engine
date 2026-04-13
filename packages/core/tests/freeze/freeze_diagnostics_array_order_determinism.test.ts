import { describe, test, expect } from 'vitest';
import { inspectOverlayResolutionDecision } from '../../src/transport/federationDiagnostics.js';
import { resolveOverlaySelection, ResolutionStrategy } from '../../src/topology/overlayResolutionPolicy.js';

describe('Freeze Evidence: Diagnostics Array Order Determinism', () => {
    test('same logical inputs with reordered transport/discovery paths yield identically ordered diagnostic arrays', () => {
        const createCandidates = () => [
            { overlaySourceId: 'overlayA',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'official', authorityTier: 1, registryTrustDomain: 3, namespace: 'core' },
            { overlaySourceId: 'overlayB',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'partner', authorityTier: 1, registryTrustDomain: 2, namespace: 'core' },
            { overlaySourceId: 'overlayC',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'external', authorityTier: 1, registryTrustDomain: 1, namespace: 'core' }
        ];

        let resultA: any, resultB: any;
        const elimA: any[] = [];
        const elimB: any[] = [];

        try {
            resolveOverlaySelection({ seamId: 'seam', candidateOverlays: createCandidates() }, ResolutionStrategy.AUTHORITY_FIRST, elimA);
        } catch(e) {}

        try {
            resolveOverlaySelection({ seamId: 'seam', candidateOverlays: createCandidates().reverse() }, ResolutionStrategy.AUTHORITY_FIRST, elimB);
        } catch(e) {}

        const diagnosticsA = inspectOverlayResolutionDecision(
            'seam', createCandidates(), 'AUTHORITY_FIRST', [], [], false, true, false, false, null, {}, elimA
        );

        const diagnosticsB = inspectOverlayResolutionDecision(
            'seam', createCandidates().reverse(), 'AUTHORITY_FIRST', [], [], false, true, false, false, null, {}, elimB
        );

        // Expect exactly matching output explicitly mapped through natively identically decoupled determinism constraints.
        expect(diagnosticsA.strategyEliminationReasons).toEqual(diagnosticsB.strategyEliminationReasons);
    });
});
