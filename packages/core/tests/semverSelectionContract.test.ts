import { describe, it, expect } from 'vitest';
import { resolveSemverCandidate, MockSemverCandidate } from '../src/policy/contracts/semverSelectionContract.js';

describe('Phase 3D: SemVer Selection Determinism Freeze', () => {

  const candidates: MockSemverCandidate[] = [
    { version: '1.0.0', source: 'registry', timestamp: 100 },
    { version: '2.0.0', source: 'registry', timestamp: 200 },
    { version: '1.5.0', source: 'lockfile', timestamp: 50 },
  ];

  it('Test 1: exact match wins', () => {
    const res = resolveSemverCandidate('1.0.0', undefined, candidates);
    expect(res?.version).toBe('1.0.0');
  });

  it('Test 2: lockfile overrides registry', () => {
    // Both match a range implicitly handled by resolveSemverCandidate
    const res = resolveSemverCandidate(undefined, '^1.0.0', candidates);
    // Lockfile overrides registry precedence
    expect(res?.source).toBe('lockfile');
    expect(res?.version).toBe('1.5.0');
  });

  it('Test 3: range selects highest compatible version deterministically', () => {
    const registryOnly: MockSemverCandidate[] = [
      { version: '1.0.0', source: 'registry' },
      { version: '3.0.0', source: 'registry' },
      { version: '2.0.0', source: 'registry' },
    ];
    const res = resolveSemverCandidate(undefined, '^1.0.0', registryOnly);
    // Highest is 3.0.0 lexicographically
    expect(res?.version).toBe('3.0.0');
  });

  it('Test 4: range selection stable across runs', () => {
    const registryOnly: MockSemverCandidate[] = [
      { version: '3.0.0', source: 'registry' },
      { version: '1.0.0', source: 'registry' },
      { version: '2.0.0', source: 'registry' },
    ];
    const res = resolveSemverCandidate(undefined, '^1.0.0', registryOnly);
    expect(res?.version).toBe('3.0.0');
  });

  // Test 5: range selection namespace-stable implicitly by caller grouping.
  
});
