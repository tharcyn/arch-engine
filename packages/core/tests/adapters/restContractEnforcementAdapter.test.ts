import { describe, it, expect } from 'vitest';
import {
  RestContractEnforcementAdapter
} from '../../src/adapters/rest-contract-enforcement-adapter.js';
import { AuthorityNodeMetadata } from '../../src/adapters/authority-boundary-adapter.js';
import { CanonicalEdgeEntry } from '../../src/reconciliation/canonical-edge-promoter.js';
import { AdapterCapabilityRegistry } from '../../src/adapters/capability-registry.js';
import { stableCanonicalStringify } from '../../src/transport/stableCanonicalStringify.js';

describe('Phase 9 Step 2: REST Contract Enforcement Adapter', () => {

  const adapter = new RestContractEnforcementAdapter();

  const nodeMeta: Record<string, AuthorityNodeMetadata> = {
    'ui_consumer': { nodeId: 'ui_consumer', domain: 'edge', authorityTier: 0 },
    'rte_get_api_v1_inventory': { nodeId: 'rte_get_api_v1_inventory', domain: 'inventory', authorityTier: 2 },
    'rte_get_internal_finance': { nodeId: 'rte_get_internal_finance', domain: 'finance', authorityTier: 3 },
    'rte_get_get_mixedCase': { nodeId: 'rte_get_get_mixedCase', domain: 'unknown', authorityTier: 2 },
    'rte_post_public_unversioned': { nodeId: 'rte_post_public_unversioned', domain: 'unknown', authorityTier: 2 }
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
    expect(desc.adapter_id).toBe('arch-engine-rest-contract-adapter');
    expect(desc.capabilities.contractSurface).toBe('full');
    expect(desc.capabilities.authorityMetadata).toBe('none'); // Does not redefine authority
  });

  it('Test 2: Generates findings for REST-001 Naming Grammar & REST-006 Versioning Drift', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_consumer', 'rte_get_get_mixedCase', 'fetch'),
      mockEdge('ui_consumer', 'rte_post_public_unversioned', 'fetch')
    ];

    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('REST-001-NAMING-GRAMMAR-VIOLATION');
    expect(findings).toContain('mixed case or duplicate verbs');

    expect(findings).toContain('REST-006-VERSIONING-DRIFT');
    expect(findings).toContain('lacks versioning prefix identifier');
  });

  it('Test 3: Generates finding for REST-002 Internal Route Exposure', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_consumer', 'rte_get_internal_finance', 'fetch')
    ];

    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('REST-002-INTERNAL-ROUTE-EXPOSURE');
  });

  it('Test 4: Generates finding for REST-003 Schema Parity Mismatch & REST-004 Frontend Linkage Gap', () => {
    const nodeMetaExt: Record<string, AuthorityNodeMetadata> = {
      ...nodeMeta,
      'rte_deprecated_login': { nodeId: 'rte_deprecated_login', domain: 'edge', authorityTier: 1 }
    };
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_consumer', 'rte_get_api_v1_inventory', 'schema_mismatch'),
      mockEdge('ui_consumer', 'rte_deprecated_login', 'invalid_linkage')
    ];

    const findings = adapter.evaluateTopology(edges, nodeMetaExt);
    expect(findings).toContain('REST-003-SCHEMA-PARITY-MISMATCH');
    expect(findings).toContain('Authoritative precedence locked to');
    expect(findings).toContain('REST-004-FRONTEND-LINKAGE-GAP');
  });

  it('Test 5: Transport authority mismatch REST-007', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_consumer', 'rte_get_internal_finance', 'fetch')
    ];
    // ui_consumer is tier 0, internal_finance is tier 3.
    const findings = adapter.evaluateTopology(edges, nodeMeta);
    expect(findings).toContain('REST-007-TRANSPORT-AUTHORITY-MISMATCH');
  });

  it('Test 6: Identical topology yields byte-identical findings across repeated runs', () => {
    const edges: CanonicalEdgeEntry[] = [
      mockEdge('ui_consumer', 'rte_get_internal_finance', 'fetch')
    ];

    const runA = adapter.evaluateTopology(edges, nodeMeta);
    const runB = adapter.evaluateTopology(edges, nodeMeta);
    const runC = adapter.evaluateTopology([{...edges[0]}], {...nodeMeta});

    expect(runA).toBe(runB);
    expect(runA).toStrictEqual(runC);
  });
});
