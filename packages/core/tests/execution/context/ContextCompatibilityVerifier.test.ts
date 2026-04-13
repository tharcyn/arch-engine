import { describe, it, expect } from 'vitest';
import { ContextCompatibilityVerifier } from '../../../src/execution/context/ContextCompatibilityVerifier.js';

describe('Phase 8: Context Compatibility Verifier', () => {

  it('Test 1: Verifies engine alignment properties natively rejecting incompatible combinations securely', () => {
    const execCap = { replayStableEvaluation: true } as any;
    const contextCap = { deterministicSerialization: false } as any;

    const verifier = new ContextCompatibilityVerifier(execCap, contextCap);
    
    expect(() => verifier.verify()).toThrow('Context compatibility mismatch detected: [Replay stability requires deterministic context serialization.].');
  });

  it('Test 2: Passes strict exact parity bindings silently securely', () => {
    const execCap = { replayStableEvaluation: true } as any;
    const contextCap = { deterministicSerialization: true, featureFlagsSupported: true } as any;

    const verifier = new ContextCompatibilityVerifier(execCap, contextCap);
    expect(() => verifier.verify()).not.toThrow();
  });

});
