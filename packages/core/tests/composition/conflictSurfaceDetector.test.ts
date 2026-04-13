import { describe, it, expect } from 'vitest';
import { ConflictSurfaceDetector } from '../../src/composition/ConflictSurfaceDetector.js';

describe('Phase 5: Conflict Surface Detector', () => {

  it('Test 1: Identifies no conflicts in clean entry set', () => {
    const entries = [
        { policyNamespace: 'ns1', policyId: 'id1' },
        { policyNamespace: 'ns2', policyId: 'id2' }
    ] as any;
    
    // Empty tier map is enough for deterministic collision checks 
    const detector = new ConflictSurfaceDetector(entries, {});
    const report = detector.detect();

    expect(report.hasConflicts).toBe(false);
    expect(report.policyIdCollisions.length).toBe(0);
  });

  it('Test 2: Identifies cross-namespace ID collisions', () => {
    const entries = [
        { policyNamespace: 'ns1', policyId: 'id1' },
        { policyNamespace: 'ns2', policyId: 'id1' }
    ] as any;
    
    const detector = new ConflictSurfaceDetector(entries, {});
    const report = detector.detect();

    expect(report.hasConflicts).toBe(true);
    expect(report.policyIdCollisions[0]).toContain('id1');
    expect(report.policyIdCollisions[0]).toContain('ns1');
    expect(report.policyIdCollisions[0]).toContain('ns2');
  });

});
