import { describe, it, expect } from 'vitest';
import { extractCompositionHints, applyCompositionHints, validateCompositionHints } from '../../src/transport/extractCompositionHints.js';
import { HydratedPolicyManifest } from '../../src/transport/types.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 4.7+4.9: extractCompositionHints', () => {

  const createManifest = (hints: any): HydratedPolicyManifest => ({
    extends: [],
    dependencies: [],
    namespaces: {},
    issuerData: [],
    manifestMetadata: { compositionHints: hints }
  });

  it('Test 1: Missing hints safe', () => {
    const manifest = createManifest(undefined);
    expect(extractCompositionHints(manifest)).toBeNull();
  });

  it('Test 2: Partial hints safe — rejects unknown keys, allows valid known', () => {
    const manifest = createManifest({ preferredTier: 'governance', unexpected: 'drop_me' });
    const hints = extractCompositionHints(manifest);
    expect(hints).toBeDefined();
    expect(hints?.preferredTier).toBe('governance');
    expect((hints as any).unexpected).toBeUndefined();
  });

  it('Test 3: Full hints attached correctly', () => {
    const manifest = createManifest({ 
      preferredTier: 'governance', 
      conflictPolicy: 'force',
      mergeStrategy: 'additive'
    });
    
    const entry: PolicyStackEntry = {
      policyId: 'id',
      policyNamespace: 'ns',
      hash: 'h',
      config: { version: 1 }
    };

    applyCompositionHints(entry, manifest);

    expect(entry.executionMetadata?.compositionHints).toBeDefined();
    expect(entry.executionMetadata?.compositionHints.preferredTier).toBe('governance');
    expect(entry.executionMetadata?.compositionHints.conflictPolicy).toBe('force');
  });

  it('Test 4: Only valid enums pass schema guard', () => {
    const manifest = createManifest({ 
      priorityWeight: 10,
      mergeStrategy: 'additive',
      conflictPolicy: 'force'
    });
    
    const hints = extractCompositionHints(manifest);
    expect(hints).toBeDefined();
    expect(hints?.mergeStrategy).toBe('additive');
    expect(hints?.conflictPolicy).toBe('force');
    expect(hints?.priorityWeight).toBe(10);
  });

  it('Test 5: Phase 4.9 schema guard rejects invalid enum values', () => {
    const hints = validateCompositionHints({
      preferredTier: 'MALICIOUS_TIER',
      mergeStrategy: 'DROP_ALL',
      priorityWeight: Infinity
    });
    // All values rejected — none match valid enumerations
    expect(hints).toBeNull();
  });

  it('Test 6: Phase 4.9 schema guard clamps priorityWeight', () => {
    const hints = validateCompositionHints({
      priorityWeight: 99999
    });
    expect(hints).toBeDefined();
    expect(hints?.priorityWeight).toBe(100); // clamped to max
  });

  it('Test 7: Phase 4.9 schema guard rejects non-finite priorityWeight', () => {
    const hints = validateCompositionHints({
      priorityWeight: NaN
    });
    expect(hints).toBeNull();
  });

});
