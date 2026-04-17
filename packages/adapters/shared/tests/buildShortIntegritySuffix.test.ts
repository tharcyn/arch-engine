import { describe, expect, test } from 'vitest';
import { buildShortIntegritySuffix } from '../src/utils/buildShortIntegritySuffix.js';

describe('Phase 16Z buildShortIntegritySuffix', () => {
    test('slices first 7 characters', () => {
        expect(buildShortIntegritySuffix('a13f2c8e91f44b3a')).toBe('a13f2c8');
    });

    test('preserves lowercase', () => {
        expect(buildShortIntegritySuffix('A13F2C8E91F44B3A')).toBe('a13f2c8');
    });

    test('is deterministic', () => {
        expect(buildShortIntegritySuffix('1234567890')).toBe('1234567');
        expect(buildShortIntegritySuffix('1234567890')).toBe('1234567');
    });

    test('handles shorter strings gracefully', () => {
        expect(buildShortIntegritySuffix('abc')).toBe('abc');
    });
});
