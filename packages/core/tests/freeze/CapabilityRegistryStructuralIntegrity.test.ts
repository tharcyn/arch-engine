import { describe, it, expect } from 'vitest';
import { verifyCapabilityRegistryIntegrity } from '../../src/capabilities/CapabilityRegistry';

describe('CapabilityRegistryStructuralIntegrity', () => {
    it('passes for perfectly aligned capabilities', () => {
        const result = verifyCapabilityRegistryIntegrity(
            ['cap1', 'cap2'],
            ['cap1'],
            ['cap2'],
            ['cap1', 'cap2']
        );
        expect(result.isValid).toBe(true);
        expect(result.violations).toHaveLength(0);
    });

    it('rejects duplicate capabilities', () => {
        const result = verifyCapabilityRegistryIntegrity(
            ['cap1', 'cap2', 'cap1'],
            [],
            [],
            []
        );
        expect(result.isValid).toBe(false);
        expect(result.violations[0]).toContain('Duplicate capability');
    });

    it('rejects unsorted capabilities', () => {
        const result = verifyCapabilityRegistryIntegrity(
            ['cap2', 'cap1'],
            [],
            [],
            []
        );
        expect(result.isValid).toBe(false);
        expect(result.violations[0]).toContain('strictly sorted');
    });

    it('rejects missing dataset capabilities', () => {
        const result = verifyCapabilityRegistryIntegrity(
            ['cap1'],
            ['cap2'],
            [],
            []
        );
        expect(result.isValid).toBe(false);
        expect(result.violations[0]).toContain('Dataset compatibility alignment failure');
    });
});
