import { describe, it, expect } from 'vitest';
import { ConflictResolver } from '../../src/composition/ConflictResolver.js';

describe('Phase 6: Conflict Resolver', () => {

  it('Test 1: Resolves empty conflict surfaces silently', () => {
    const resolver = new ConflictResolver({ hasConflicts: false } as any, {}, {}, {});
    const map = resolver.resolve();
    expect(Object.keys(map).length).toBe(0);
  });

  it('Test 2: Deterministically resolves policy ID collisions enforcing losing subset suppression', () => {
    const conflictReport = {
      hasConflicts: true,
      policyIdCollisions: ['id1 [ns1, ns2]']
    } as any;

    const namespaceSurface = {
      shadowingResolutionMap: { 'id1': 'ns2' } // ns2 randomly won during prioritization
    } as any;

    const tierMap = {
      'ns2/id1': { tier: 'direct' }
    } as any;

    const resolver = new ConflictResolver(conflictReport, tierMap, {} as any, namespaceSurface);
    const map = resolver.resolve();

    expect(map['id1'].winnerPolicyId).toBe('ns2/id1');
    expect(map['id1'].loserPolicyIds).toEqual(['ns1/id1']);
    expect(map['id1'].resolutionReason).toBe('Namespace Precedence Override');
    expect(map['id1'].resolutionTier).toBe('direct');
  });

  it('Test 3: Throws unresolvable conflict if priority map is broken', () => {
    const conflictReport = {
      hasConflicts: true,
      policyIdCollisions: ['id1 [ns1, ns2]']
    } as any;

    const namespaceSurface = {
      shadowingResolutionMap: { 'id2': 'ns2' } // Map missing id1
    } as any;

    const resolver = new ConflictResolver(conflictReport, {}, {} as any, namespaceSurface);
    
    expect(() => resolver.resolve()).toThrow('Unresolvable conflict: No clear winner for policy ID "id1"');
  });

});
