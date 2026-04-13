import { describe, it, expect } from 'vitest';
import { PipelineStageTracker } from '../../src/transport/pipelineStageContract.js';

describe('Phase 4.9: Pipeline Stage Ordering Contract', () => {

  it('Test 1: Correct stage order accepted', () => {
    const tracker = new PipelineStageTracker();
    expect(() => {
      tracker.assertStage('uriResolution');
      tracker.assertStage('trustPolicyResolution');
      tracker.assertStage('registryLookup');
      tracker.assertStage('semverSelection');
    }).not.toThrow();
  });

  it('Test 2: Out-of-order stage rejected', () => {
    const tracker = new PipelineStageTracker();
    tracker.assertStage('uriResolution');
    tracker.assertStage('registryLookup');
    expect(() => tracker.assertStage('trustPolicyResolution')).toThrow('Pipeline stage ordering violation');
  });

  it('Test 3: Duplicate stage rejected', () => {
    const tracker = new PipelineStageTracker();
    tracker.assertStage('uriResolution');
    expect(() => tracker.assertStage('uriResolution')).toThrow('Pipeline stage ordering violation');
  });

  it('Test 4: Completed stages tracked', () => {
    const tracker = new PipelineStageTracker();
    tracker.assertStage('uriResolution');
    tracker.assertStage('trustPolicyResolution');
    expect(tracker.getCompletedStages()).toEqual(['uriResolution', 'trustPolicyResolution']);
  });

});
