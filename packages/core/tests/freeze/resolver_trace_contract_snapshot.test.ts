import { describe, it, expect } from 'vitest';
import { ResolutionContext } from '../../src/composition/ResolutionContext.js';

describe('Phase 2: Resolver Trace Contract Freeze', () => {

  describe('Nested Scope Mechanics (Semantic Invariants)', () => {
    it('throws explicitly on double begin', () => {
       const ctx = new ResolutionContext('test://mock');
       ctx.beginResolutionStep();
       expect(() => ctx.beginResolutionStep()).toThrow('Nested steps unsupported.');
    });

    it('clears trace state fully on rollback without bleeding uncommitted data', () => {
       const ctx = new ResolutionContext('test://mock');
       ctx.beginResolutionStep();
       ctx.recordNamespacePriorityEvent('Evaluated Test Namespace');
       ctx.rollbackResolutionStep();

       ctx.beginResolutionStep();
       ctx.recordRegistryLookupEvent('Success Fetch');
       ctx.commitResolutionStep();

       const diagnostics = ctx.finalizeDiagnostics('res://mock', '1.0.0', 'core');
       
       // Prove rollback discarded timeline mapping inherently
       expect(diagnostics.explainabilityTrace.resolutionTimeline.length).toBe(1);
       expect(diagnostics.explainabilityTrace.resolutionTimeline[0].stage).toBe('registry_lookup');
    });
  });
});
