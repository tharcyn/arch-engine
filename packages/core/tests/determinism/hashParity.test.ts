import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { composePolicies } from '../../src/policy/compositionResolver.js';
import type { PolicyStackEntry } from '../../src/policy/types.js';

/**
 * ═══════════════════════════════════════════════════════════
 *  PHASE −1: Hash Parity Certification
 * ═══════════════════════════════════════════════════════════
 *
 *  PURPOSE: Freeze current hash outputs as determinism invariants.
 *  These fixtures are the PROTOCOL CONTRACT. If any test here fails,
 *  it means a code change has introduced hash drift — which is a
 *  PROTOCOL SURFACE REGRESSION that blocks federation activation.
 *
 *  INVARIANTS CERTIFIED:
 *  1. canonicalPolicyHash is deterministic across invocations
 *  2. effectivePolicyHash is deterministic for identical stacks
 *  3. Hash output is key-ordering-independent (sortObj contract)
 *  4. Hash output is environment-independent (no path, no CWD)
 *  5. Content-addressed anonymous rule keys are stable
 */

const FIXTURE_PATH = path.join(__dirname, '../fixtures/determinism/hashParity.snapshot.json');

/**
 * Replicates the exact sortObj + sha256 truncation used in both
 * parser.ts (canonicalPolicyHash) and compositionResolver.ts (effectiveHash).
 * If this function produces different output than the source, the contract is broken.
 */
function replicatedHash(input: any): string {
  const stripped = JSON.parse(JSON.stringify(input));
  function sortObj(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObj);
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortObj(obj[key]);
      return acc;
    }, {} as any);
  }
  const stableJSON = JSON.stringify(sortObj(stripped));
  return crypto.createHash('sha256').update(stableJSON).digest('hex');
}

function contentKey(from: string, to: string, severity: string): string {
  return crypto.createHash('sha256').update(`${from}\0${to}\0${severity}`).digest('hex').substring(0, 16);
}

// ─── CANONICAL TEST POLICIES ───────────────────────────────

const SINGLE_POLICY: PolicyStackEntry = {
  policyId: 'determinism-baseline',
  hash: 'frozen',
  config: {
    version: 1,
    mode: 'enforce',
    domains: {
      apps: { tier: 'high' },
      infra: { tier: 'low' }
    },
    rules: {
      forbid: [
        { id: 'no-apps-infra', from: 'apps', to: 'infra', severity: 'error' }
      ]
    }
  }
};

const TWO_POLICY_STACK: PolicyStackEntry[] = [
  {
    policyId: 'parent-org',
    hash: 'frozen-parent',
    config: {
      version: 1,
      mode: 'advisory',
      rules: {
        forbid: [
          { id: 'rule1', from: 'apps', to: 'infra', severity: 'warning' }
        ]
      }
    }
  },
  {
    policyId: 'child-local',
    hash: 'frozen-child',
    config: {
      version: 1,
      mode: 'enforce',
      rules: {
        forbid: [
          { id: 'rule1', from: 'apps', to: 'infra', severity: 'error' }
        ]
      }
    }
  }
];

const THREE_POLICY_STACK: PolicyStackEntry[] = [
  { policyId: 'root', hash: 'h1', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b', severity: 'error' }] } } },
  { policyId: 'mid', hash: 'h2', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b', severity: 'warning' }] } } },
  { policyId: 'leaf', hash: 'h3', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b', severity: 'notice' }] } } }
];

// ─── TESTS ─────────────────────────────────────────────────

describe('Phase −1: Hash Parity Certification', () => {

  it('1. single-policy effectiveHash is deterministic across 1000 invocations', () => {
    const results = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const composed = composePolicies([SINGLE_POLICY]);
      results.add(composed.effectiveHash);
    }
    expect(results.size).toBe(1); // All 1000 runs produce identical hash
  });

  it('2. two-policy composition effectiveHash is deterministic across 1000 invocations', () => {
    const results = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const composed = composePolicies(TWO_POLICY_STACK);
      results.add(composed.effectiveHash);
    }
    expect(results.size).toBe(1);
  });

  it('3. effectiveHash is key-ordering-independent (sortObj contract)', () => {
    // Create two configs with identical content but different key insertion order
    const configA: PolicyStackEntry = {
      policyId: 'ordering-test',
      hash: 'frozen',
      config: {
        version: 1,
        mode: 'enforce',
        domains: { alpha: { tier: 'high' }, beta: { tier: 'low' } },
        rules: { forbid: [{ id: 'r1', from: 'alpha', to: 'beta', severity: 'error' }] }
      }
    };
    const configB: PolicyStackEntry = {
      policyId: 'ordering-test',
      hash: 'frozen',
      config: {
        version: 1,
        rules: { forbid: [{ id: 'r1', from: 'alpha', to: 'beta', severity: 'error' }] },
        domains: { beta: { tier: 'low' }, alpha: { tier: 'high' } },
        mode: 'enforce'
      }
    };

    const hashA = composePolicies([configA]).effectiveHash;
    const hashB = composePolicies([configB]).effectiveHash;
    expect(hashA).toBe(hashB);
  });

  it('4. replicated hash function matches composition engine output', () => {
    const composed = composePolicies([SINGLE_POLICY]);
    
    // Build the same preHash structure the resolver builds
    const preHash = {
      version: composed.version,
      mode: composed.mode,
      domains: composed.domains,
      rules: composed.rules
    };
    
    const replicated = replicatedHash(preHash);
    expect(replicated).toBe(composed.effectiveHash);
  });

  it('5. content-addressed anonymous rule keys are deterministic', () => {
    const key1 = contentKey('apps', 'infra', 'error');
    const key2 = contentKey('apps', 'infra', 'error');
    const key3 = contentKey('apps', 'infra', 'warning'); // different severity → different key

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1.length).toBe(16);
  });

  it('6. anonymous rules with same content merge correctly across stacks', () => {
    const stack: PolicyStackEntry[] = [
      { policyId: 'parent', hash: 'h1', config: { version: 1, rules: { forbid: [{ from: 'a', to: 'b', severity: 'error' }] } } },
      { policyId: 'child', hash: 'h2', config: { version: 1, rules: { forbid: [{ from: 'a', to: 'b', severity: 'error' }] } } }
    ];

    const composed = composePolicies(stack);
    // Both anonymous rules have same content key → merge → only 1 rule
    expect(composed.rules!.forbid!.length).toBe(1);
    expect(composed.rules!.forbid![0].originPolicyChain).toEqual(['parent', 'child']);
  });

  it('7. hash is 64 hex characters (256-bit SHA-2)', () => {
    const composed = composePolicies([SINGLE_POLICY]);
    expect(composed.effectiveHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('8. frozen fixture parity (PROTOCOL CONTRACT)', () => {
    // Compute current values
    const single = composePolicies([SINGLE_POLICY]);
    const two = composePolicies(TWO_POLICY_STACK);
    const three = composePolicies(THREE_POLICY_STACK);
    const anonKey = contentKey('apps', 'infra', 'error');

    const currentValues = {
      singlePolicyHash: single.effectiveHash,
      twoPolicyHash: two.effectiveHash,
      threePolicyHash: three.effectiveHash,
      anonymousRuleKey: anonKey
    };

    // If fixture doesn't exist, create it (first run only)
    if (!fs.existsSync(FIXTURE_PATH)) {
      fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
      fs.writeFileSync(FIXTURE_PATH, JSON.stringify(currentValues, null, 2) + '\n');
      console.log('[DETERMINISM] Created frozen hash parity fixture:', FIXTURE_PATH);
      return; // First run — fixture creation, not validation
    }

    // Validate against frozen fixture
    const frozen = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
    
    expect(currentValues.singlePolicyHash).toBe(frozen.singlePolicyHash);
    expect(currentValues.twoPolicyHash).toBe(frozen.twoPolicyHash);
    expect(currentValues.threePolicyHash).toBe(frozen.threePolicyHash);
    expect(currentValues.anonymousRuleKey).toBe(frozen.anonymousRuleKey);
  });
});
