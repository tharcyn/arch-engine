import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

describe('Freeze Evidence: Overlay Stack Replace Priority', () => {
    test('replace-if-authorized handlers chain sequentially', () => {
        const result = executeOverlaySeam(
            'overlay::registry::precedenceBoundary',
            () => ({ result: 'core' }),
            {
                activation: {
                    activeOverlays: ['pack1', 'pack2'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                    seamOverrides: {
                        'overlay::registry::precedenceBoundary': [
                            wrapHandler(() => ({ result: 'handler1' }), { overlaySignature: 'sig:context-default' }),
                            wrapHandler((prev: any) => ({ result: prev.result + '+handler2' }), { overlaySignature: 'sig:context-default' })
                        ]
                    }
                }
            }
        );

        // Second handler receives first handler's output
        expect(result.result).toBe('handler1+handler2');
    });
});
