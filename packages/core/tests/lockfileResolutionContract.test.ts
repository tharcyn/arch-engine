import { describe, it, expect } from 'vitest';
import { resolveWithLockfile, LockfileEntry, LOCKFILE_RESOLUTION_CONTRACT_VERSION } from '../src/policy/contracts/lockfileResolutionContract.js';

describe('Phase 3D: Lockfile Precedence Contract Freeze', () => {

  const lockfile: LockfileEntry[] = [
    { namespace: 'acme', id: 'auth', lockedVersion: '2.1.0' }
  ];

  it('Test 1: lockfile overrides registry version', () => {
    // Manifest requested 2.0.0
    const res = resolveWithLockfile('acme', 'auth', '2.0.0', lockfile);
    expect(res).toBe('2.1.0');
  });

  it('Test 2: lockfile overrides SemVer candidate', () => {
    // Manifest requested a range ^2.0.0, but lockfile is absolute
    const res = resolveWithLockfile('acme', 'auth', '^2.0.0', lockfile);
    expect(res).toBe('2.1.0');
  });

  it('Test 3: lockfile preserves ordering deterministically', () => {
    // The exact object found acts as the definitive source block.
    const res = resolveWithLockfile('acme', 'auth', undefined, lockfile);
    expect(res).toBe('2.1.0');
  });

  it('Test 4: lockfile replay stable across machines', () => {
    // No path or machine-specific data should influence this resolution
    const res1 = resolveWithLockfile('acme', 'auth', '^2.0.0', lockfile);
    const res2 = resolveWithLockfile('acme', 'auth', '^2.0.0', lockfile);
    expect(res1).toBe(res2);
  });

  it('Test 5: Contract version matches exported constant', () => {
    expect(LOCKFILE_RESOLUTION_CONTRACT_VERSION).toBe('v1');
  });

});
