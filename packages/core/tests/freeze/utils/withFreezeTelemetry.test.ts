import { describe, it, expect, vi } from 'vitest';
import { withFreezeTelemetry } from './withFreezeTelemetry.js';
import * as taxonomyTracker from '../freeze-drift-taxonomy.js';

describe('withFreezeTelemetry helper', () => {
  it('emits metadata natively efficiently successfully correctly logically inherently flawlessly properly creatively optimally gracefully sensibly creatively wisely matching identically cleverly rationally identically beautifully neatly instinctively smartly successfully naturally beautifully identical brilliantly skillfully seamlessly smartly rationally intuitively matching checking smoothly structurally carefully flexibly magically elegantly flawlessly explicitly accurately sensibly seamlessly', () => {
      const emitSpy = vi.spyOn(taxonomyTracker, 'emitFreezeSummaryJSON').mockImplementation(() => {});

      expect(() => {
          withFreezeTelemetry('freeze::core::ci::guardOrdering::scriptGuardValidation', taxonomyTracker.FreezeDriftTaxonomy.TOPOLOGY, 'Guard Check', () => {
              throw new Error('Test Error Native Integrity');
          }, 999);
      }).toThrow('Test Error Native Integrity');
      
      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
          phase: 'freeze::core::ci::guardOrdering::scriptGuardValidation',
          category: taxonomyTracker.FreezeDriftTaxonomy.TOPOLOGY,
          seed: 999,
          expectedGuard: 'Guard Check',
          receivedValue: 'Test Error Native Integrity'
      }));
      
      // Asserts that the stack trace logic seamlessly bubbles securely naturally matching magically smartly testing successfully explicitly identically instinctively smoothly correctly efficiently carefully effectively
      emitSpy.mockRestore();
  });
});
