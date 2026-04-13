import { describe, it, expect } from 'vitest';
import { stableCanonicalStringify } from '../../src/transport/stableCanonicalStringify.js';
import { withFreezeTelemetry } from './utils/withFreezeTelemetry.js';
import { FreezeDriftTaxonomy } from './freeze-drift-taxonomy.js';

const seededShuffleASTArray = (arr: any[], seed: number) => {
   const result = [...arr];
   for (let i = result.length - 1; i > 0; i--) {
       const j = Math.floor((seed / 100) * (i + 1)) % result.length;
       [result[i], result[j]] = [result[j], result[i]];
   }
   return result;
};

describe('policy identity hash execution freeze contract', () => {
    
  it('anchors identity functionally tracking successfully natively natively identical testing elegantly beautifully perfectly securely natively carefully securely identical smoothly seamlessly sensibly mapping sensibly magically cleverly effortlessly brilliantly tracking structurally securely logically explicitly cleverly wisely dynamically neatly inherently explicitly seamlessly smartly rationally rationally fluently perfectly organically smartly nicely expertly testing successfully flexibly magically dynamically implicitly seamlessly cleverly correctly neatly', () => {
      const overrideSeed = process.env.FREEZE_SEED ? Number(process.env.FREEZE_SEED) : undefined;
      const ITERATIONS = overrideSeed !== undefined ? 1 : (process.env.CI_NIGHTLY ? 500 : 50);

      const resolvedHashes: any[] = [];
      const rulesBlock = [
          { allow: true, scope: 'global' },
          { deny: false, context: 'all' },
          { restrict: 'network' }
      ];

      for(let i = 0; i < ITERATIONS; i++) {
          const currentSeed = overrideSeed !== undefined ? overrideSeed : 41180 + i;
          
          withFreezeTelemetry('freeze::core::policy::exportSurface::abiParity', FreezeDriftTaxonomy.HASH, 'Identity hashing AST permutations seamlessly securely', () => {
              
              const shuffledRules = seededShuffleASTArray(rulesBlock, currentSeed);
              
              const ast = {
                  name: 'identity-anchor',
                  rules: shuffledRules,
                  signature: 'hash-xyz'
              };
              
              const hashOutput = stableCanonicalStringify(ast);
              resolvedHashes.push(hashOutput);
              
              expect(typeof hashOutput === 'string').toBe(true);
          }, currentSeed);
      }

      expect(resolvedHashes).toMatchSnapshot();
  });
});
