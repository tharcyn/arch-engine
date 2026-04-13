import { describe, it, expect } from 'vitest';
import { composePolicies } from '../src/policy/compositionResolver.js';
import type { PolicyStackEntry } from '../src/policy/types.js';

describe('Week 7 Composition Resolver Tests', () => {

  it('1. single-policy evaluation unchanged', () => {
    const stack: PolicyStackEntry[] = [
      {
        policyId: 'local',
        hash: 'hash1',
        config: {
          version: 1, mode: 'enforce',
          rules: { forbid: [{ id: 'rule1', from: 'apps', to: 'infra', severity: 'error' }] }
        }
      }
    ];

    const composed = composePolicies(stack);
    expect(composed.rules?.forbid?.length).toBe(1);
    
    const r1 = composed.rules!.forbid![0];
    expect(r1.originRuleId).toBe('rule1');
    expect(r1.originPolicyId).toBe('local');
    expect(r1.compositionDepth).toBe(0);
    expect(r1.mergeAuthority).toBe('local');
  });

  it('2. two-policy override conflict resolves correctly (child overrides parent)', () => {
    const stack: PolicyStackEntry[] = [
      {
        policyId: 'org', hash: 'hashOrg',
        config: {
          version: 1, mode: 'advisory',
          rules: { forbid: [{ id: 'rule1', from: 'apps', to: 'infra', severity: 'warning' }] }
        }
      },
      {
        policyId: 'local', hash: 'hashLoc',
        config: {
          version: 1, mode: 'enforce',
          rules: { forbid: [{ id: 'rule1', from: 'apps', to: 'infra', severity: 'error' }] }
        }
      }
    ];

    const composed = composePolicies(stack);
    expect(composed.mode).toBe('enforce');
    expect(composed.rules?.forbid?.length).toBe(1);
    
    const r1 = composed.rules!.forbid![0];
    expect(r1.severity).toBe('error');
    expect(r1.originPolicyId).toBe('local');
    expect(r1.compositionDepth).toBe(1); // deepest depth
    expect(r1.inheritedFromPolicyId).toBe('org');
    expect(r1.mergeAuthority).toBe('resolved-severity'); // severities differ: parent='warning', child='error'
  });

  it('3. three-policy inheritance chain expands linearly without conflicts', () => {
    const stack: PolicyStackEntry[] = [
      { policyId: 'global', hash: 'h1', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b' }] } } },
      { policyId: 'org', hash: 'h2', config: { version: 1, rules: { forbid: [{ id: 'r2', from: 'b', to: 'c' }] } } },
      { policyId: 'local', hash: 'h3', config: { version: 1, rules: { forbid: [{ id: 'r3', from: 'c', to: 'd' }] } } }
    ];

    const composed = composePolicies(stack);
    expect(composed.rules?.forbid?.length).toBe(3);
    
    const origins = composed.rules!.forbid!.map(r => r.originPolicyId);
    expect(origins).toContain('global');
    expect(origins).toContain('org');
    expect(origins).toContain('local');

    // global rule gets authority='inherited' because it was untouched by deeper scopes
    const r1 = composed.rules!.forbid!.find(r => r.originRuleId === 'r1')!;
    expect(r1.compositionDepth).toBe(0);
    expect(r1.mergeAuthority).toBe('inherited');
    expect(r1.inheritedFromPolicyId).toBe('global');
  });

  it('4. effectivePolicyHash determinism holds irrespective of reference swaps', () => {
    const stackA: PolicyStackEntry[] = [
      { policyId: 'p1', hash: 'h1', config: { version: 1, rules: { allow: [{ from: 'a', to: 'b' }] } } },
      { policyId: 'p2', hash: 'h2', config: { version: 1, rules: { allow: [{ from: 'c', to: 'd' }] } } }
    ];
    const hashA = composePolicies(stackA).effectiveHash;
    
    const stackB: PolicyStackEntry[] = [
      { policyId: 'p1', hash: 'h1', config: { version: 1, rules: { allow: [{ from: 'a', to: 'b' }] } } },
      { policyId: 'p2', hash: 'h2', config: { version: 1, rules: { allow: [{ from: 'c', to: 'd' }] } } }
    ];
    const hashB = composePolicies(stackB).effectiveHash;
    
    expect(hashA).toBe(hashB);
    
    // Reverse order gives different hash because it defines override precedence
    const stackC: PolicyStackEntry[] = [ stackA[1], stackA[0] ];
    const hashC = composePolicies(stackC).effectiveHash;
    expect(hashA).not.toBe(hashC);
  });

  it('5. provenance chain continuity expands linearly retaining full ancestry', () => {
    const stack: PolicyStackEntry[] = [
      { policyId: 'root.yml', hash: 'h1', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b' }] } } },
      { policyId: 'org.yml', hash: 'h2', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b', severity: 'warning' }] } } },
      { policyId: 'platform.yml', hash: 'h3', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b', severity: 'notice' }] } } },
      { policyId: 'workspace.yml', hash: 'h4', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b', severity: 'error' }] } } },
      { policyId: 'project.yml', hash: 'h5', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b' }] } } },
      { policyId: 'local.yml', hash: 'h6', config: { version: 1, rules: { forbid: [{ id: 'r2', from: 'x', to: 'y' }] } } }
    ];

    const composed = composePolicies(stack);
    const r1 = composed.rules!.forbid!.find(r => r.originRuleId === 'r1')!;
    
    expect(r1.originPolicyChain).toEqual([
      'root.yml',
      'org.yml',
      'platform.yml',
      'workspace.yml',
      'project.yml' // the local.yml did not touch r1
    ]);
    
    // Corrected lineage: points to the chain root (defining policy), not penultimate entry
    expect(r1.inheritedFromPolicyId).toBe('root.yml');
    expect(r1.originPolicyId).toBe('project.yml');
    
    // Additive local rule
    const r2 = composed.rules!.forbid!.find(r => r.originRuleId === 'r2')!;
    expect(r2.originPolicyChain).toEqual(['local.yml']);
  });
});
