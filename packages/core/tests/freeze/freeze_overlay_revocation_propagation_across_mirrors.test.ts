import { describe, test, expect } from 'vitest';
import { propagateOverlayRevocation, isOverlayRevoked } from '../../src/topology/overlayRevocationList.js';

describe('Freeze Evidence: F-10 Revocation Propagation Across Mirrors', () => {
    test('Revocations apply robustly without relying on specific registry sources in basic checks', () => {
        propagateOverlayRevocation('core', {
            overlaySourceId: 'test-revoke-propagation',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            revocationScope: 'overlay',
            timestamp: new Date().toISOString()
        }, ['mirror1', 'mirror2']);

        // Test explicit globally visible revocation effect
        const check = isOverlayRevoked('test-revoke-propagation', '1.0.0');
        expect(check.revoked).toBe(true);
    });
});
