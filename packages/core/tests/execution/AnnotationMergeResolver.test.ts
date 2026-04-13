import { describe, it, expect } from 'vitest';
import { AnnotationMergeResolver } from '../../src/execution/AnnotationMergeResolver.js';

describe('Phase 7: Annotation Merge Resolver', () => {

  it('Test 1: Recursively merges layer maps executing higher bounds accurately', () => {
    const entries = [
      { policyId: 'id1', config: { annotations: { x: 1 } }, executionMetadata: {} },
      { policyId: 'id2', config: { annotations: { y: 2, x: 2 } }, executionMetadata: { arbitraryAnnotations: { z: 3 } } }
    ] as any;

    const resolver = new AnnotationMergeResolver(entries, ['/id1', '/id2']);
    const output = resolver.resolve();

    expect(output.z).toBe(3);  // Mapped cleanly out of arbitrary definitions
    expect(output.y).toBe(2);  // Mapped natively
    expect(output.x).toBe(2);  // id2 runs downstream sequentially overriding id1
  });

});
