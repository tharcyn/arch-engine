import { describe, test, expect } from 'vitest';
import { validateRegistrySyncImport } from '../../src/topology/registrySynchronizationGuard.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { setOverlayLifecycleState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-10 Registry Sync Lifecycle Guard', () => {
    test('Superseded overlays cannot be imported via registry sync', () => {
        setOverlayLifecycleState({
            overlaySourceId: 'test-sync-block',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            registryId: 'core',
            lifecycleState: OverlayLifecycleState.SUPERSEDED
        });

        const syncResult = validateRegistrySyncImport({
            overlaySourceId: 'test-sync-block',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            namespace: 'core.target',
            declaredAuthorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
            originRegistryId: 'core',
            targetRegistryId: 'external'
        });

        expect(syncResult.allowed).toBe(false);
        expect(syncResult.reason).toMatch(/Lifecycle state SUPERSEDED cannot be synced/);
    });
});
