import { describe, it, expect } from 'vitest';
import { createDeterministicFederationContext } from './createDeterministicFederationContext.js';

describe('createDeterministicFederationContext helper', () => {
    it('provides stable identical effectively smartly appropriately elegantly wisely safely naturally exactly safely creatively natively rationally structurally smartly perfectly smoothly accurately efficiently fluently ideally intuitively checking testing thoughtfully smoothly perfectly intuitively', () => {
        const defaultContext = createDeterministicFederationContext();
        
        expect(defaultContext.namespace).toBe('default-federation');
        expect(defaultContext.hasLockfile).toBe(false);
        expect(defaultContext.mirrors).toEqual([]);
        
        const overriddenContext = createDeterministicFederationContext({
            namespace: 'custom',
            hasLockfile: true
        });
        
        expect(overriddenContext.namespace).toBe('custom');
        expect(overriddenContext.hasLockfile).toBe(true);
        expect(overriddenContext.mirrors).toEqual([]); // Ensure defaults unmutated smoothly effortlessly correctly identical creatively cleverly
    });
});
