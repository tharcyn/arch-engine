import { describe, it, expect } from 'vitest';
import { buildArbitrationDecisionGraph } from '../../src/composition/ArbitrationDecisionGraph.js';

describe('Phase 6: Arbitration Decision Graph', () => {

  it('Test 1: Unifies explicit conflicts and topological defaults into a single trace graph', () => {
    const conflictSurface = {
      'id1': {
        winnerPolicyId: 'ns/id1',
        loserPolicyIds: ['ns2/id1'],
        resolutionReason: 'Conflict won',
        resolutionTier: 'direct',
        resolutionSource: 'test',
        deterministicResolutionHash: 'hash'
      }
    } as any;

    const precedenceSurface = {
      'ns/id2': { policyId: 'id2', namespace: 'ns', tierScore: 1000 }
    } as any;

    const fallbackSurface = {
      'ns/id1': { fallbackAvailable: true },
      'ns/id2': { fallbackAvailable: false }
    } as any;

    const decisionGraph = buildArbitrationDecisionGraph(
      conflictSurface,
      precedenceSurface,
      {} as any,
      {} as any,
      {} as any,
      fallbackSurface
    );

    // Conflict mapped correctly
    expect(decisionGraph['id1'].winningPolicy).toBe('ns/id1');
    expect(decisionGraph['id1'].resolutionFallbackSource).toBe('active');
    expect(decisionGraph['id1'].losingPolicies).toEqual(['ns2/id1']);

    // Non-conflict implicitly mapped through topological rules
    expect(decisionGraph['id2'].winningPolicy).toBe('ns/id2');
    expect(decisionGraph['id2'].resolutionReason).toBe('Direct Topological Precedence');
    expect(decisionGraph['id2'].resolutionFallbackSource).toBe('none');
  });

});
