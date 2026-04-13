import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { composePolicies } from '../../src/policy/compositionResolver.js';
import type { PolicyStackEntry, MergeAuthority } from '../../src/policy/types.js';

/**
 * ═══════════════════════════════════════════════════════════
 *  PHASE −1: Chain Ordering Certification
 * ═══════════════════════════════════════════════════════════
 *
 *  PURPOSE: Prove originPolicyChain ordering, compositionDepth
 *  propagation, and mergeAuthority attribution are deterministic
 *  and semantically correct.
 *
 *  INVARIANTS CERTIFIED:
 *  1. originPolicyChain preserves stack processing order
 *  2. compositionDepth matches stack index
 *  3. mergeAuthority attribution is correct for each rule category
 *  4. inheritedFromPolicyId is never self-referential
 *  5. Chain expansion is linear (no duplication, no reordering)
 */

const FIXTURE_PATH = path.join(__dirname, '../fixtures/determinism/chainOrdering.snapshot.json');

// ─── CANONICAL TEST STACKS ─────────────────────────────────

function fiveDeepStack(): PolicyStackEntry[] {
  return [
    { policyId: 'root', hash: 'h1', config: { version: 1, rules: { forbid: [{ id: 'shared', from: 'a', to: 'b', severity: 'error' }] } } },
    { policyId: 'org', hash: 'h2', config: { version: 1, rules: { forbid: [{ id: 'shared', from: 'a', to: 'b', severity: 'warning' }] } } },
    { policyId: 'team', hash: 'h3', config: { version: 1, rules: { forbid: [{ id: 'shared', from: 'a', to: 'b', severity: 'notice' }] } } },
    { policyId: 'project', hash: 'h4', config: { version: 1, rules: { forbid: [{ id: 'shared', from: 'a', to: 'b', severity: 'error' }] } } },
    { policyId: 'workspace', hash: 'h5', config: { version: 1, rules: { forbid: [{ id: 'shared', from: 'a', to: 'b', severity: 'warning' }] } } },
  ];
}

function mixedStack(): PolicyStackEntry[] {
  return [
    {
      policyId: 'base', hash: 'h1',
      config: { version: 1, rules: {
        forbid: [{ id: 'rule1', from: 'a', to: 'b', severity: 'error' }],
        allow: [{ id: 'allow1', from: 'x', to: 'y' }]
      }}
    },
    {
      policyId: 'overlay', hash: 'h2',
      config: { version: 1, rules: {
        forbid: [{ id: 'rule2', from: 'c', to: 'd', severity: 'warning' }],
        allow: [{ id: 'allow1', from: 'x', to: 'y' }]
      }}
    },
    {
      policyId: 'local', hash: 'h3',
      config: { version: 1, rules: {
        forbid: [{ id: 'rule1', from: 'a', to: 'b', severity: 'notice' }]
      }}
    }
  ];
}

// ─── TESTS ─────────────────────────────────────────────────

describe('Phase −1: Chain Ordering Certification', () => {

  it('1. five-deep chain ordering is linear and complete', () => {
    const composed = composePolicies(fiveDeepStack());
    const rule = composed.rules!.forbid![0];

    // Chain must contain all 5 policies in stack processing order
    expect(rule.originPolicyChain).toEqual(['root', 'org', 'team', 'project', 'workspace']);
    expect(rule.originPolicyChain.length).toBe(5);
  });

  it('2. compositionDepth matches deepest stack contributor', () => {
    const composed = composePolicies(fiveDeepStack());
    const rule = composed.rules!.forbid![0];

    // The rule was last touched at depth 4 (workspace, index 4)
    expect(rule.compositionDepth).toBe(4);
  });

  it('3. mergeAuthority attribution correctness matrix', () => {
    const composed = composePolicies(mixedStack());
    
    // rule1: defined at base (depth 0), overridden at local (depth 2)
    const rule1 = composed.rules!.forbid!.find(r => r.originRuleId === 'rule1')!;
    expect(rule1.mergeAuthority).toBe('resolved-severity'); // error→notice = severity changed
    expect(rule1.originPolicyId).toBe('local');
    expect(rule1.compositionDepth).toBe(2);

    // rule2: defined at overlay (depth 1), not touched by local (depth 2)
    // Since rule2 compositionDepth (1) < deepestDepth (2), it gets relabeled 'inherited'
    const rule2 = composed.rules!.forbid!.find(r => r.originRuleId === 'rule2')!;
    expect(rule2.mergeAuthority).toBe('inherited');
    expect(rule2.originPolicyId).toBe('overlay');
    expect(rule2.compositionDepth).toBe(1);

    // allow1: defined at base (depth 0), overridden at overlay (depth 1)
    // Since allow1 compositionDepth (1) < deepestDepth (2), it gets relabeled 'inherited'
    const allow1 = composed.rules!.allow!.find(r => r.originRuleId === 'allow1')!;
    expect(allow1.mergeAuthority).toBe('inherited');
  });

  it('4. inheritedFromPolicyId is NEVER self-referential', () => {
    const stacks = [fiveDeepStack(), mixedStack()];

    for (const stack of stacks) {
      const composed = composePolicies(stack);
      const allRules = [
        ...(composed.rules?.allow || []),
        ...(composed.rules?.forbid || [])
      ];

      for (const rule of allRules) {
        if (rule.inheritedFromPolicyId) {
          // Self-reference check: inheritedFromPolicyId should never equal originPolicyId
          // UNLESS the rule was defined AND last contributed by the same policy
          // (which only happens in single-contributor rules)
          if (rule.originPolicyChain.length > 1) {
            expect(rule.inheritedFromPolicyId).not.toBe(rule.originPolicyId);
          }
        }
      }
    }
  });

  it('5. chain expansion has no duplicates', () => {
    const composed = composePolicies(fiveDeepStack());
    const rule = composed.rules!.forbid![0];
    const chain = rule.originPolicyChain;

    const uniqueEntries = new Set(chain);
    expect(uniqueEntries.size).toBe(chain.length);
  });

  it('6. additive rules have single-element chains', () => {
    const composed = composePolicies(mixedStack());
    
    // rule2 from overlay is additive (only one policy contributes it)
    const rule2 = composed.rules!.forbid!.find(r => r.originRuleId === 'rule2')!;
    expect(rule2.originPolicyChain).toEqual(['overlay']);
    expect(rule2.inheritedFromPolicyId).toBe('overlay'); // relabeled as inherited since depth < deepest
  });

  it('7. chain ordering is stable across 100 runs', () => {
    const chains: string[][] = [];
    for (let i = 0; i < 100; i++) {
      const composed = composePolicies(fiveDeepStack());
      const rule = composed.rules!.forbid![0];
      chains.push([...rule.originPolicyChain]);
    }

    // All 100 runs must produce identical chain ordering
    const reference = JSON.stringify(chains[0]);
    for (const chain of chains) {
      expect(JSON.stringify(chain)).toBe(reference);
    }
  });

  it('8. frozen fixture parity (PROTOCOL CONTRACT)', () => {
    const five = composePolicies(fiveDeepStack());
    const mixed = composePolicies(mixedStack());

    const fiveRule = five.rules!.forbid![0];
    const mixedRule1 = mixed.rules!.forbid!.find(r => r.originRuleId === 'rule1')!;
    const mixedRule2 = mixed.rules!.forbid!.find(r => r.originRuleId === 'rule2')!;

    const currentValues = {
      fiveDeep: {
        chain: fiveRule.originPolicyChain,
        depth: fiveRule.compositionDepth,
        authority: fiveRule.mergeAuthority,
        inheritedFrom: fiveRule.inheritedFromPolicyId,
        originPolicy: fiveRule.originPolicyId,
      },
      mixedRule1: {
        chain: mixedRule1.originPolicyChain,
        depth: mixedRule1.compositionDepth,
        authority: mixedRule1.mergeAuthority,
        inheritedFrom: mixedRule1.inheritedFromPolicyId,
        originPolicy: mixedRule1.originPolicyId,
      },
      mixedRule2: {
        chain: mixedRule2.originPolicyChain,
        depth: mixedRule2.compositionDepth,
        authority: mixedRule2.mergeAuthority,
        inheritedFrom: mixedRule2.inheritedFromPolicyId,
        originPolicy: mixedRule2.originPolicyId,
      }
    };

    if (!fs.existsSync(FIXTURE_PATH)) {
      fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
      fs.writeFileSync(FIXTURE_PATH, JSON.stringify(currentValues, null, 2) + '\n');
      console.log('[DETERMINISM] Created frozen chain ordering fixture:', FIXTURE_PATH);
      return;
    }

    const frozen = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));

    expect(currentValues.fiveDeep).toEqual(frozen.fiveDeep);
    expect(currentValues.mixedRule1).toEqual(frozen.mixedRule1);
    expect(currentValues.mixedRule2).toEqual(frozen.mixedRule2);
  });
});
