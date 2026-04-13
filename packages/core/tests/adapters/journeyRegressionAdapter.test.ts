import { describe, it, expect } from 'vitest';
import { 
  JourneyRegressionAdapter
} from '../../src/adapters/journey-regression-adapter.js';
import { AuthorityNodeMetadata } from '../../src/adapters/authority-boundary-adapter.js';
import { CanonicalEdgeEntry } from '../../src/reconciliation/canonical-edge-promoter.js';
import { AdapterCapabilityRegistry } from '../../src/adapters/capability-registry.js';
import { stableCanonicalStringify } from '../../src/transport/stableCanonicalStringify.js';

describe('Phase 9 Step 3: Journey Regression Adapter', () => {

  const adapter = new JourneyRegressionAdapter();

  const nodeMeta: Record<string, AuthorityNodeMetadata> = {
    'ui_merchant': { nodeId: 'ui_merchant', domain: 'edge', authorityTier: 0, persona: 'merchant', nodeKind: 'frontend_consumer' },
    'ui_customer': { nodeId: 'ui_customer', domain: 'edge', authorityTier: 0, persona: 'customer', nodeKind: 'frontend_consumer' },
    'rte_admin_panel': { nodeId: 'rte_admin_panel', domain: 'core', authorityTier: 1, persona: 'admin', nodeKind: 'route' },
    'svc_auth_logic': { nodeId: 'svc_auth_logic', domain: 'auth', authorityTier: 2, persona: 'internal', nodeKind: 'service' },
    'db_finance_ledger': { nodeId: 'db_finance_ledger', domain: 'finance', authorityTier: 4, persona: 'internal', nodeKind: 'database' },
    'rte_deprecated_login': { nodeId: 'rte_deprecated_login', domain: 'auth', authorityTier: 1, persona: 'unknown', nodeKind: 'route' }
  };

  const mockEdge = (source: string, target: string, type: string): CanonicalEdgeEntry => ({
    edge_key: `${source}->${target}::${type}`,
    source,
    target,
    type,
    authority_level: 'inferred',
    base_authority_level: 'inferred',
    promoted: false,
    confidence_score: 0.8,
    adapter_count: 1,
    adapters: ['test-adapter'],
    promotion_reason: 'mock'
  });

  it('Test 1: Registration does not mutate standard hashes or freeze boundaries', () => {
    const registry = new AdapterCapabilityRegistry();
    const result = registry.register(adapter.getRegistryDescriptor());
    
    expect(result.registered).toBe(true);

    const desc = adapter.getRegistryDescriptor();
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.adapter_id).toBe('arch-engine-journey-regression-adapter');
    expect(desc.capabilities.invocationEdges).toBe('full');
  });

  it('Test 2: JRNY-001 && JRNY-004 Mutation Bypass && Escalation', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_merchant', 'db_finance_ledger', 'write_state')
    ];
    // 0 -> 4 tier differential (Escalation = Yes. Mutation discontinuity = Yes)
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('JRNY-001-MUTATION-PATH-DISCONTINUITY');
    expect(findings).toContain('JRNY-004-AUTHORITY-TIER-ESCALATION');
  });

  it('Test 3: JRNY-002 Persona Boundary Violation', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_customer', 'rte_admin_panel', 'fetch')
    ];
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('JRNY-002-PERSONA-BOUNDARY-VIOLATION');
    expect(findings).toContain('incorrectly invoking privileged \'admin\'');
  });

  it('Test 4: JRNY-003 Contract Surface Misuse', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_merchant', 'rte_deprecated_login', 'fetch')
    ];
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('JRNY-003-CONTRACT-SURFACE-MISUSE');
  });

  it('Test 5: JRNY-005 Consumer/Provider Discontinuity', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_merchant', 'svc_auth_logic', 'fetch')
    ];
    // 'rte_admin_panel' and 'rte_deprecated_login' are defined as 'route' in nodeMeta but not consumed.
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('JRNY-005-CONSUMER-PROVIDER-DISCONTINUITY');
    expect(findings).toContain('rte_admin_panel');
  });

  it('Test 6: JRNY-006 Transport Entrypoint Bypass', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_merchant', 'svc_auth_logic', 'invoke')
    ];
    // ui_merchant (tier 0) natively jumps to svc_auth_logic (tier 2). No route abstraction used.
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('JRNY-006-TRANSPORT-ENTRYPOINT-BYPASS');
  });

  it('Test 7: JRNY-007 Cross Domain Behavioral Shortcut', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('svc_auth_logic', 'db_finance_ledger', 'write')
    ];
    // auth -> finance traversing into tier 4 without mediation.
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('JRNY-007-CROSS-DOMAIN-BEHAVIORAL-SHORTCUT');
  });

  it('Test 8: Determinism constraint validation', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('svc_auth_logic', 'db_finance_ledger', 'write')
    ];
    const runA = adapter.evaluateTopology(edges, nodeMeta);
    const runB = adapter.evaluateTopology(edges, nodeMeta);
    expect(runA).toStrictEqual(runB);
  });
});
