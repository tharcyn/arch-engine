import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../src/policy/evaluator.js';
import type { PolicyConfig, EvaluatorEdge } from '../src/policy/types.js';
import { mapAnnotations } from '../../../action/src/annotationMapper.js';

describe('Week 6 Policy Evaluator — Domain Matching & Logic', () => {

  const edges: EvaluatorEdge[] = [
    { source: 'apps/web', target: 'infra/db' },
    { source: 'apps/mobile', target: 'infra/db' },
    { source: 'apps2/web', target: 'packages/core' },
    { source: 'packages/core', target: 'infra/db' }
  ];

  it('detects tier violation with normalized prefix matching', () => {
    const config: PolicyConfig = {
      version: 1,
      mode: 'enforce',
      domains: {
        'apps': { tier: 'high' },
        'infra': { tier: 'low' }
      }
    };

    const res = evaluatePolicy(edges, config, 'HIGH', 'hash123');

    // apps/web matches apps. apps/mobile matches apps. 
    // apps2/web does NOT match apps (path segment safe).
    // so apps/web -> infra/db and apps/mobile -> infra/db should fail.
    expect(res.violations).toHaveLength(2);
    expect(res.violations[0].violationCategory).toBe('tier_violation');
    expect(res.violations[0].from).toBe('apps/web');
    expect(res.violations[1].from).toBe('apps/mobile');
  });

  it('bypasses tier enforcement if enforceTier is false', () => {
    const config: PolicyConfig = {
      version: 1,
      mode: 'enforce',
      domains: {
        'apps': { tier: 'high' },
        'infra': { tier: 'low', enforceTier: false }
      }
    };
    const res = evaluatePolicy(edges, config, 'HIGH', 'hash123');
    // Tier rule is suppressed
    expect(res.violations).toHaveLength(0);
  });

  it('matches explicit forbid rules with ruleId', () => {
    const config: PolicyConfig = {
      version: 1,
      mode: 'enforce',
      rules: {
        forbid: [
          { id: 'no-apps-infra', from: 'apps', to: 'infra', severity: 'error' }
        ]
      }
    };
    const res = evaluatePolicy(edges, config, 'HIGH', 'hash123');
    expect(res.violations).toHaveLength(2);
    expect(res.violations[0].ruleId).toBe('no-apps-infra');
    expect(res.violations[0].violationCategory).toBe('explicit_forbid');
  });

  it('allows explicit overrides over implicitly bad tiers', () => {
    const config: PolicyConfig = {
      version: 1,
      mode: 'enforce',
      domains: {
        'apps': { tier: 'high' },
        'infra': { tier: 'low' }
      },
      rules: {
        allow: [
          { from: 'apps/web', to: 'infra/db' } // specific entity override over domain
        ]
      }
    };
    const res = evaluatePolicy(edges, config, 'HIGH', 'hash123');
    // apps/mobile still fails, apps/web is allowed
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0].from).toBe('apps/mobile');
  });

});

describe('Annotation Integration & Output', () => {

  it('generates error annotations for enforce mode', () => {
    const policyEval = {
      violations: [
        { violationCategory: 'tier_violation', from: 'apps', to: 'infra', severity: 'error', ruleSource: 'tier_rule', confidenceContext: 'HIGH' }
      ],
      policyMode: 'enforce',
      policyVersion: 1,
      policyHash: 'abc',
      matchedEdges: 1
    } as any;

    const annotations = mapAnnotations({
      meta: { warnings: [], coverage: 0.9, connectivity: 0.9, extractionMode: 'structured', topologyConfidence: 0.9, workspaceType: 'monorepo', connectedNodes: 10, detectedNodes: 10, expectedNodes: 10 },
      stabilityScore: 0.9,
      stabilityTier: 'STABLE',
      crossings: [],
      crossingCount: 0,
      blockerCount: 0,
      domainDistribution: {},
      regression: null,
      config: { failOnFallback: false, failOnRegression: false, failOnWarnings: false, minCoverage: 0 },
      policyEval,
      executionMetrics: { extractionMs: 0, pipelineMs: 0, totalMs: 0 }
    });

    const policyAnnotations = annotations.filter(a => a.message.includes('Policy violation'));
    expect(policyAnnotations).toHaveLength(1);
    expect(policyAnnotations[0].level).toBe('error'); // enforce + error = error
  });

  it('generates notice/warning annotations for advisory mode', () => {
    const policyEval = {
      violations: [
        { violationCategory: 'tier_violation', from: 'apps', to: 'infra', severity: 'error', ruleSource: 'tier_rule', confidenceContext: 'HIGH' }
      ],
      policyMode: 'advisory',
      policyVersion: 1,
      policyHash: 'abc',
      matchedEdges: 1
    } as any;

    const annotations = mapAnnotations({
      meta: { warnings: [], coverage: 0.9, connectivity: 0.9, extractionMode: 'structured', topologyConfidence: 0.9, workspaceType: 'monorepo', connectedNodes: 10, detectedNodes: 10, expectedNodes: 10 },
      stabilityScore: 0.9,
      stabilityTier: 'STABLE',
      crossings: [],
      crossingCount: 0,
      blockerCount: 0,
      domainDistribution: {},
      regression: null,
      config: { failOnFallback: false, failOnRegression: false, failOnWarnings: false, minCoverage: 0 },
      policyEval,
      executionMetrics: { extractionMs: 0, pipelineMs: 0, totalMs: 0 }
    });

    const policyAnnotations = annotations.filter(a => a.message.includes('Policy violation'));
    expect(policyAnnotations).toHaveLength(1);
    expect(policyAnnotations[0].level).toBe('notice'); // advisory downgrades to notice
  });

});
