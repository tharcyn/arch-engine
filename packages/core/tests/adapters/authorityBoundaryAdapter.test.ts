import { describe, it, expect } from 'vitest';
import { 
  AuthorityBoundaryAdapter, 
  AuthorityNodeMetadata 
} from '../../src/adapters/authority-boundary-adapter.js';
import { CanonicalEdgeEntry } from '../../src/reconciliation/canonical-edge-promoter.js';
import { AdapterCapabilityRegistry } from '../../src/adapters/capability-registry.js';
import { stableCanonicalStringify } from '../../src/transport/stableCanonicalStringify.js';

describe('Phase 9 Step 1: Authority Boundary Adapter', () => {

  const adapter = new AuthorityBoundaryAdapter();

  it('Test 1: Registration does not mutate standard hashes or freeze boundaries', () => {
    const registry = new AdapterCapabilityRegistry();
    const result = registry.register(adapter.getRegistryDescriptor());
    
    expect(result.registered).toBe(true);
    expect(result.validation_errors.length).toBe(0);

    // Verify descriptor provides correctly and is frozen 
    const desc = adapter.getRegistryDescriptor();
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.capabilities.authorityMetadata).toBe('full');
    expect(desc.adapter_id).toBe('arch-engine-authority-boundary-adapter');
  });

  const nodeMeta: Record<string, AuthorityNodeMetadata> = {
    'ui-client': { nodeId: 'ui-client', domain: 'edge', authorityTier: 0 },
    'auth-gateway': { nodeId: 'auth-gateway', domain: 'gateway', authorityTier: 1 },
    'inventory-service': { nodeId: 'inventory-service', domain: 'inventory', authorityTier: 2 },
    'inventory-db': { nodeId: 'inventory-db', domain: 'inventory', authorityTier: 4 },
    'finance-service': { nodeId: 'finance-service', domain: 'finance', authorityTier: 2 },
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

  it('Test 2: Generates findings deterministically across repeated runs', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui-client', 'inventory-db', 'write_state'), // Rule 5: UI directly mutating DB
      mockEdge('auth-gateway', 'finance-service', 'create_record'), // Rule 1: Lower mutating higher cross domain
    ];

    const findings1 = adapter.evaluateTopology(edges, nodeMeta);
    const findings2 = adapter.evaluateTopology(edges, nodeMeta);

    expect(findings1).toBe(findings2);
    
    // Check stable structure usage (uses stableCanonicalStringify implicitly)
    const expectedObj = [
      {
        crossingType: "write",
        explicitlyAuthorized: false,
        message: "Lower authority tier (1) cannot mutate higher tier (2) out of domain.",
        ruleId: 'AUTH-001-TIER-INVERSION',
        severity: 'BLOCKER',
        sourceAuthorityTier: 1,
        sourceNodeId: 'auth-gateway',
        sourceOwnershipDomain: 'gateway',
        targetAuthorityTier: 2,
        targetNodeId: 'finance-service',
        targetOwnershipDomain: 'finance',
      },
      {
        crossingType: "write",
        explicitlyAuthorized: false,
        message: "UI/Edge (Tier 0) bypassed application logic to mutate persistence (Tier 4).",
        ruleId: 'AUTH-005-UI-DB-BYPASS',
        severity: 'BLOCKER',
        sourceAuthorityTier: 0,
        sourceNodeId: 'ui-client',
        sourceOwnershipDomain: 'edge',
        targetAuthorityTier: 4,
        targetNodeId: 'inventory-db',
        targetOwnershipDomain: 'inventory',
      }
    ];
    expect(findings1).toBe(stableCanonicalStringify(expectedObj));
  });

  it('Test 3: Lateral unauthorized write across equal tiers', () => {
    const lateralEdges: CanonicalEdgeEntry[] = [
      mockEdge('inventory-service', 'finance-service', 'update_record')
    ];

    const result = adapter.evaluateTopology(lateralEdges, nodeMeta);
    expect(result).toContain('AUTH-004-LATERAL-MUTATION');
    expect(result).toContain('finance by inventory without explicit authorization');
  });

  it('Test 4: Explicit authority allowance suppresses violations safely', () => {
    const explicitlyAllowedEdges: CanonicalEdgeEntry[] = [
      mockEdge('inventory-service', 'finance-service', 'update_record')
    ];
    const allowed = new Set<string>();
    allowed.add('inventory-service->finance-service');

    const result = adapter.evaluateTopology(explicitlyAllowedEdges, nodeMeta, allowed);
    expect(result).toBe('[]'); // No findings
  });

  it('Test 5: Domain-level authority inversion (High invokes low async boundaries out of order)', () => {
    const inversionEdges: CanonicalEdgeEntry[] = [
      mockEdge('inventory-db', 'auth-gateway', 'invoke')
    ];

    const result = adapter.evaluateTopology(inversionEdges, nodeMeta);
    expect(result).toContain('AUTH-007-AUTHORITY-INVERSION');
  });

  it('Test 6: Identical topology yields byte-identical findings across repeated runs', () => {
    const inversionEdges: CanonicalEdgeEntry[] = [
      mockEdge('inventory-db', 'auth-gateway', 'invoke')
    ];
    
    // Explicit guarantee for bullet 5 of specific validation.
    const runA = adapter.evaluateTopology(inversionEdges, nodeMeta);
    const runB = adapter.evaluateTopology(inversionEdges, nodeMeta);
    const runC = adapter.evaluateTopology([{...inversionEdges[0]}], {...nodeMeta});
    
    expect(runA).toStrictEqual(runB);
    expect(runA).toStrictEqual(runC);
  });
});
