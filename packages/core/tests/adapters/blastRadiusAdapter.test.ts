import { describe, it, expect } from 'vitest';
import { 
  BlastRadiusAdapter
} from '../../src/adapters/blast-radius-adapter.js';
import { AuthorityNodeMetadata, AuthorityViolationFinding } from '../../src/adapters/authority-boundary-adapter.js';
import { CanonicalEdgeEntry } from '../../src/reconciliation/canonical-edge-promoter.js';
import { AdapterCapabilityRegistry } from '../../src/adapters/capability-registry.js';
import { stableCanonicalStringify } from '../../src/transport/stableCanonicalStringify.js';

describe('Phase 9 Step 4: Blast Radius Adapter', () => {

  const adapter = new BlastRadiusAdapter();

  const nodeMeta: Record<string, AuthorityNodeMetadata> = {
    'ui_merchant': { nodeId: 'ui_merchant', domain: 'edge', authorityTier: 0, persona: 'merchant', nodeKind: 'frontend_consumer' },
    'ui_customer': { nodeId: 'ui_customer', domain: 'edge', authorityTier: 0, persona: 'customer', nodeKind: 'frontend_consumer' },
    'rte_commerce': { nodeId: 'rte_commerce', domain: 'commerce', authorityTier: 1, persona: 'merchant', nodeKind: 'route', contractSurface: true },
    'svc_auth_logic': { nodeId: 'svc_auth_logic', domain: 'auth', authorityTier: 2, persona: 'internal', nodeKind: 'service' },
    'svc_commerce': { nodeId: 'svc_commerce', domain: 'commerce', authorityTier: 2, persona: 'merchant', nodeKind: 'service' },
    'svc_ledger': { nodeId: 'svc_ledger', domain: 'finance', authorityTier: 2, persona: 'internal', nodeKind: 'service' },
    'db_finance_ledger': { nodeId: 'db_finance_ledger', domain: 'finance', authorityTier: 4, persona: 'internal', nodeKind: 'database' },
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

  const getDummyValidation = (id: string, source: string, target: string): AuthorityViolationFinding => ({
    ruleId: id,
    severity: 'CRITICAL',
    sourceNodeId: source,
    targetNodeId: target,
    sourceAuthorityTier: 0,
    targetAuthorityTier: 0,
    sourceOwnershipDomain: 'unknown',
    targetOwnershipDomain: 'unknown',
    crossingType: 'unknown',
    explicitlyAuthorized: false,
    message: 'mock'
  });

  it('Test 1: Registration does not mutate standard hashes or freeze boundaries', () => {
    const registry = new AdapterCapabilityRegistry();
    const result = registry.register(adapter.getRegistryDescriptor());
    
    expect(result.registered).toBe(true);
    const desc = adapter.getRegistryDescriptor();
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.adapter_id).toBe('arch-engine-blast-radius-adapter');
  });

  it('Test 2: BLAST-001 && BLAST-002 Downstream/Upstream Shock detection', () => {
    // Chain length = 4 nodes. A->B->C->D. So A hits 3 downs. D hits 3 ups.
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_merchant', 'rte_commerce', 'fetch'),
      mockEdge('rte_commerce', 'svc_commerce', 'execute'),
      mockEdge('svc_commerce', 'db_finance_ledger', 'write')
    ];
    
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('BLAST-001-DOWNSTREAM-CASCADE-SPREAD');
    expect(findings).toContain(`Node 'ui_merchant' mutation propagates across 3 downstream layers (limit configured locally to 3`);
    expect(findings).toContain('BLAST-002-UPSTREAM-DEPENDENCY-SHOCK');
    expect(findings).toContain(`Node 'db_finance_ledger' exposes 3 upstream dependents to amplified regression (limit configured locally to 3`);
  });

  it('Test 3: BLAST-003 Authority Cascade Violation Spread', () => {
    // ui_merchant (Tier 0 edge) cascades to db_finance_ledger (Tier 4 finance) across a chain.
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_merchant', 'svc_commerce', 'fetch'),
      mockEdge('svc_commerce', 'db_finance_ledger', 'write')
    ];
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('BLAST-003-AUTHORITY-CASCADE-VIOLATION-SPREAD');
    expect(findings).toContain(`Unprivileged 'ui_merchant' indirectly cascades into heavily privileged domain 'db_finance_ledger'`);
  });

  it('Test 4: BLAST-004 Contract Surface Diffusion & BLAST-006 Persona Ripple', () => {
    // rte_commerce (contractSurface) to ui_customer (frontend_consumer)
    // rte_commerce (merchant persona) to ui_customer (customer persona)
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('rte_commerce', 'ui_customer', 'read')
    ];
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('BLAST-004-CONTRACT-SURFACE-DIFFUSION');
    expect(findings).toContain('BLAST-006-PERSONA-BOUNDARY-RIPPLE');
  });

  it('Test 5: BLAST-007 Cross Domain Ripple Amplification', () => {
     // svc_commerce (Tier 2 commerce) -> svc_ledger (Tier 2 finance)
     const edges: CanonicalEdgeEntry[] = [
      mockEdge('svc_commerce', 'svc_ledger', 'invoke')
    ];
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('BLAST-007-CROSS-DOMAIN-RIPPLE-AMPLIFICATION');
  });

  it('Test 6: BLAST-005 Journey Ripple & BLAST-008 Transport Shock', () => {
     const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_merchant', 'svc_commerce', 'fetch'),
      mockEdge('svc_commerce', 'db_finance_ledger', 'write')
    ];
    // Supply upstream errors on target svc_commerce which has downstream db_finance_ledger.
    const findings = adapter.evaluateTopology(edges, nodeMeta, [
      getDummyValidation('JRNY-005-CONSUMER-PROVIDER-DISCONTINUITY', 'ui_merchant', 'svc_commerce'),
      getDummyValidation('REST-007-TRANSPORT-AUTHORITY-MISMATCH', 'ui_merchant', 'svc_commerce')
    ]);
    expect(findings).toContain('BLAST-005-JOURNEY-CONTINUITY-RIPPLE');
    expect(findings).toContain('BLAST-008-TRANSPORT-ENTRYPOINT-SHOCK');
  });

  it('Test 7: Byte-identical determinism constraint validation', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('svc_commerce', 'db_finance_ledger', 'write'),
      mockEdge('ui_merchant', 'svc_commerce', 'fetch')
    ];
    // Reverse edges manually
    const edgesReversed: CanonicalEdgeEntry[] = [
      mockEdge('ui_merchant', 'svc_commerce', 'fetch'),
      mockEdge('svc_commerce', 'db_finance_ledger', 'write')
    ];

    const runA = adapter.evaluateTopology(edges, nodeMeta);
    const runB = adapter.evaluateTopology(edgesReversed, nodeMeta);
    
    expect(runA).toStrictEqual(runB);
  });
});
