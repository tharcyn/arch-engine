import { describe, it, expect } from 'vitest';
import { buildArbitrationExplainabilitySurface } from '../../src/composition/arbitrationExplainabilitySurface.js';

describe('Phase 6: Arbitration Explainability Surface', () => {

  it('Test 1: Transforms graph traces into linear log lines mapped for Federation streaming', () => {
    const graph = {
      'id1': {
        winningPolicy: 'ns/id1',
        losingPolicies: ['ns2/id1'],
        resolutionReason: 'Conflict resolution override',
        resolutionTier: 'direct',
        resolutionNamespace: 'ns',
        resolutionTrustSource: 'accepted',
        resolutionRegistrySource: 'hash1',
        resolutionFallbackSource: 'active'
      }
    } as any;

    const surface = buildArbitrationExplainabilitySurface(graph);

    expect(surface.decisionTrace[0]).toContain('WON');
    expect(surface.loserSuppressionChain[0]).toContain('SUPPRESSED');
    expect(surface.resolutionSequence[0]).toBe('ns/id1');
    expect(surface.fallbackActivationChain[0]).toContain('FALLBACK_ACTIVATED');
  });

});
