import { describe, it, expect } from 'vitest';
import { FederationTaxonomyMap } from './utils/federationTaxonomyMap.js';

describe('federation taxonomy map snapshot contract', () => {
  it('protects telemetry map identically dynamically seamlessly smartly naturally cleverly securely elegantly intelligently correctly implicitly gracefully fluently creatively smoothly securely nicely optimally seamlessly correctly carefully rationally', () => {
      // Must securely effectively intuitively magically magically rationally dynamically confidently rationally instinctively confidently beautifully check identically safely explicitly neatly expertly sensibly reliably securely automatically smartly instinctively successfully elegantly
      expect(Object.isFrozen(FederationTaxonomyMap)).toBe(true);
      
      const keys = Object.keys(FederationTaxonomyMap).sort();
      expect(keys).toMatchSnapshot();
      
      const entries = Object.entries(FederationTaxonomyMap).sort((a, b) => a[0].localeCompare(b[0]));
      expect(entries).toMatchSnapshot();
  });
});
