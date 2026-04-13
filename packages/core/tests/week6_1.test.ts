import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../src/policy/evaluator.js';
import type { PolicyConfig, EvaluatorEdge } from '../src/policy/types.js';

describe('Week 6.1 Policy Telemetry — Telemetry Exhaustiveness & Consistency', () => {

  const edges: EvaluatorEdge[] = [
    { source: 'apps/web', target: 'infra/db' },
    { source: 'apps/mobile', target: 'infra/db' },
    { source: 'domainB/module', target: 'domainB/module' }
  ];

  it('calculates tierDelta correctly and explicitly populates tier origins on violation', () => {
    const config: PolicyConfig = {
      version: 1,
      mode: 'enforce',
      domains: {
        'apps': { tier: 'high' },
        'infra': { tier: 'low' }
      }
    };

    const res = evaluatePolicy(edges, config, 'HIGH', 'hash123');

    const v1 = res.violations.find((v: any) => v.from === 'apps/web');
    expect(v1).toBeDefined();
    expect(v1?.matchedDomainSource).toBe('apps');
    expect(v1?.matchedDomainTarget).toBe('infra');
    expect(v1?.tierSource).toBe('high');
    expect(v1?.tierTarget).toBe('low');
    
    // apps (3) - infra (1) = 2
    expect(v1?.tierDelta).toBe(2);
    
    // Explicit suppression eligibility defaults
    expect(v1?.suppressionEligible).toBe(true);
  });

  it('tracks distinct rule hits consistently on violation candidates', () => {
    const config: PolicyConfig = {
      version: 1,
      mode: 'advisory',
      rules: {
        forbid: [
          { id: 'no-apps-infra', from: 'apps', to: 'infra', severity: 'error' }
        ]
      }
    };
    const res = evaluatePolicy(edges, config, 'HIGH', 'hash123');

    expect(res.policyRuleHits['no-apps-infra']).toBe(2); // Two paths from 'apps' to 'infra'
  });

  it('mirrors core policy version and strategy version accurately to JSON outputs', () => {
    const config: PolicyConfig = {
      version: 7, 
      mode: 'advisory'
    };
    const res = evaluatePolicy([], config, 'HIGH', 'hash123');
    expect(res.policyVersion).toBe(7);
    expect(res.evaluationStrategyVersion).toBe(1);
    expect(res.policyDetected).toBe(true);
  });

});
