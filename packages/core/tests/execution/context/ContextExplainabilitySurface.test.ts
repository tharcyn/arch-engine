import { describe, it, expect } from 'vitest';
import { ContextExplainabilityEmitter } from '../../../src/execution/context/ContextExplainabilitySurface.js';

describe('Phase 8: Context Explainability Surface', () => {

  it('Test 1: Generates boolean diagnostic presence map natively tracing integration scopes exactly', () => {
    const context = {
      tenant: 'demo', principal: { id: 'x' }, resource: {}, environment: {}, request: {}, temporal: {}, trustAnchors: {}, featureFlags: {}, customSignals: {}
    } as any;

    const emitter = new ContextExplainabilityEmitter(context);
    const trace = emitter.emit();

    expect(trace.contextSignalPresenceMap.tenant).toBe(true);
    expect(trace.contextSignalPresenceMap.principal).toBe(true);
    expect(trace.contextSignalPresenceMap.resource).toBe(false);
    expect(trace.contextCompatibilityDecisions).toContain('EXECUTION_RUNTIME aligned explicitly via v8.0-alpha protocol mappings');
  });

});
