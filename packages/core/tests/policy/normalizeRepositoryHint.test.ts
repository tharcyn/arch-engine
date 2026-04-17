import { describe, expect, test } from 'vitest';
import { normalizeRepositoryHint } from '../../src/policy/normalizeRepositoryHint.js';

describe('Phase 16Y normalizeRepositoryHint', () => {

    test('org/repo -> unchanged', () => {
        expect(normalizeRepositoryHint('org/repo')).toBe('org/repo');
    });

    test('github.com/org/repo -> org/repo', () => {
        expect(normalizeRepositoryHint('github.com/org/repo')).toBe('org/repo');
    });

    test('https://github.com/org/repo -> org/repo', () => {
        expect(normalizeRepositoryHint('https://github.com/org/repo')).toBe('org/repo');
    });

    test('http://gitlab.com/org/repo -> org/repo', () => {
        expect(normalizeRepositoryHint('http://gitlab.com/org/repo')).toBe('org/repo');
    });

    test('whitespace trimming correctness', () => {
        expect(normalizeRepositoryHint('  https://github.com/org/repo  ')).toBe('org/repo');
    });

    test('preserving deeper path structures: github.com/org/repo/sub/path -> org/repo/sub/path', () => {
        expect(normalizeRepositoryHint('github.com/org/repo/sub/path')).toBe('org/repo/sub/path');
    });

});
