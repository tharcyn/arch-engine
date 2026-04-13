import { describe, it, expect } from 'vitest';
import { MergePlanner } from '../../src/composition/MergePlanner.js';

describe('Phase 5: Merge Planner', () => {

  it('Test 1: Constructs deterministic reverse-ordered precedence map from tier map', () => {
    const tierMap = {
      'ns/transit': { policyId: 'transit', namespace: 'ns', originalDepth: 2, stackIndex: 2, tier: 'transitive' },
      'ns/root': { policyId: 'root', namespace: 'ns', originalDepth: 0, stackIndex: 0, tier: 'root' },
      'ns/direct': { policyId: 'direct', namespace: 'ns', originalDepth: 1, stackIndex: 1, tier: 'direct' }
    } as any;
    
    // Empty conflict surface report mock
    const planner = new MergePlanner(tierMap, {} as any);
    const plan = planner.plan();

    expect(plan.deterministic).toBe(true);
    // Keys sorted logically by stackIndex in class: root=0, direct=1, transit=2
    expect(plan.mergePlanGraph).toEqual(['ns/root', 'ns/direct', 'ns/transit']);
    // Reverse resolution order ensures transitive runs first
    expect(plan.resolutionOrdering).toEqual(['ns/transit', 'ns/direct', 'ns/root']);
    
    expect(plan.policyPrecedenceLayering['transitive']).toContain('ns/transit');
    expect(plan.policyPrecedenceLayering['root']).toContain('ns/root');
  });

});
