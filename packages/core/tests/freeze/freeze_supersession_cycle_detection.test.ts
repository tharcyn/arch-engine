import { describe, test, expect } from 'vitest';
import { registerOverlaySupersession } from '../../src/topology/overlaySupersessionGraph.js';

describe('Freeze Evidence: F-10 Supersession Cycle Detection', () => {
    test('Acyclic sequences are enforced cleanly during supersessions', () => {
        registerOverlaySupersession({ currentOverlaySourceId: 'test-A', currentOverlayVersion: '1', registryId: 'core', supersededBySourceId: 'test-B', supersededByVersion: '1' });
        registerOverlaySupersession({ currentOverlaySourceId: 'test-B', currentOverlayVersion: '1', registryId: 'core', supersededBySourceId: 'test-C', supersededByVersion: '1' });
        
        expect(() => {
            registerOverlaySupersession({ currentOverlaySourceId: 'test-C', currentOverlayVersion: '1', registryId: 'core', supersededBySourceId: 'test-A', supersededByVersion: '1' });
        }).toThrow(/Acyclic supersession sequence violated/);
    });
});
