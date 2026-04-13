import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  registerTrustRoot,
  resolveRegistryTrustRoot,
  clearTrustRoots,
  isTrustTierSufficient
} from '../../src/topology/registryTrustStore.js';

describe('Freeze Evidence: Registry Trust Root Resolution (F-6)', () => {

    beforeEach(() => {
        clearTrustRoots();
    });

    afterEach(() => {
        clearTrustRoots();
    });

    test('resolvers correctly retrieves registered trust root', () => {
        registerTrustRoot({
            registryId: 'my-registry',
            publicKeys: ['key-a', 'key-b'],
            trustTier: 'PARTNER_REGISTRY'
        });

        const root = resolveRegistryTrustRoot('my-registry');
        expect(root).toBeDefined();
        expect(root?.registryId).toBe('my-registry');
        expect(root?.publicKeys).toEqual(['key-a', 'key-b']);
        expect(root?.trustTier).toBe('PARTNER_REGISTRY');
    });

    test('unregistered registry returns undefined', () => {
        expect(resolveRegistryTrustRoot('unknown')).toBeUndefined();
    });

    test('trust roots are immutable when registered', () => {
        const initial = {
            registryId: 'my-registry',
            publicKeys: ['key-a'],
            trustTier: 'EXTERNAL_REGISTRY' as const
        };

        registerTrustRoot(initial);

        // Mutating the original input should not affect the stored struct
        initial.publicKeys.push('key-c');

        const resolved = resolveRegistryTrustRoot('my-registry');
        expect(resolved?.publicKeys).toEqual(['key-a']);

        // Mutating the returned struct should throw (Object.freeze)
        expect(() => {
            (resolved as any).trustTier = 'CORE_INTERNAL';
        }).toThrow();
    });

    test('isTrustTierSufficient enforces hierarchy properly', () => {
        // CORE_INTERNAL
        expect(isTrustTierSufficient('CORE_INTERNAL', 'CORE_INTERNAL')).toBe(true);
        expect(isTrustTierSufficient('CORE_INTERNAL', 'EXTERNAL_REGISTRY')).toBe(true);

        // PARTNER_REGISTRY
        expect(isTrustTierSufficient('PARTNER_REGISTRY', 'EXTERNAL_REGISTRY')).toBe(true);
        expect(isTrustTierSufficient('PARTNER_REGISTRY', 'PARTNER_REGISTRY')).toBe(true);
        expect(isTrustTierSufficient('PARTNER_REGISTRY', 'OFFICIAL_REGISTRY')).toBe(false);

        // EXTERNAL_REGISTRY
        expect(isTrustTierSufficient('EXTERNAL_REGISTRY', 'EXTERNAL_REGISTRY')).toBe(true);
        expect(isTrustTierSufficient('EXTERNAL_REGISTRY', 'PARTNER_REGISTRY')).toBe(false);
        expect(isTrustTierSufficient('EXTERNAL_REGISTRY', 'CORE_INTERNAL')).toBe(false);
    });
});
