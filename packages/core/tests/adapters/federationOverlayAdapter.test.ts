import { describe, it, expect } from 'vitest';
import { 
  FederationOverlayAdapter,
  OverlayTopologyDefinition
} from '../../src/adapters/federation-overlay-adapter.js';
import { CanonicalEdgeEntry } from '../../src/reconciliation/canonical-edge-promoter.js';
import { AdapterCapabilityRegistry } from '../../src/adapters/capability-registry.js';
import { AuthorityViolationFinding, AuthorityNodeMetadata } from '../../src/adapters/authority-boundary-adapter.js';

describe('Phase 9 Step 5: Federation Overlay Adapter', () => {

  const adapter = new FederationOverlayAdapter();

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

  const getDummyValidation = (id: string, domain: string): AuthorityViolationFinding => ({
    ruleId: id,
    severity: 'CRITICAL',
    sourceNodeId: 'A',
    targetNodeId: 'B',
    sourceAuthorityTier: 0,
    targetAuthorityTier: 0,
    sourceOwnershipDomain: 'repo_1',
    targetOwnershipDomain: domain,
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
    expect(desc.adapter_id).toBe('arch-engine-federation-overlay-adapter');
  });

  it('Test 2: FED-001 Namespace Collision', () => {
    const overlays: OverlayTopologyDefinition[] = [
      { namespace: 'policy_a', precedence: 1, repoSource: 'repo1', edges: [], nodeMetaRecord: {}, upstreamFindings: [] },
      { namespace: 'policy_a', precedence: 2, repoSource: 'repo2', edges: [], nodeMetaRecord: {}, upstreamFindings: [] }
    ];
    const result = adapter.evaluateTopologyOverlays(overlays);
    expect(result.findingsString).toContain('FED-001-NAMESPACE-COLLISION');
  });

  it('Test 3: FED-007 Overlay Precedence Ambiguity & FED-011 Precedence Rank Conflict', () => {
    const overlays: OverlayTopologyDefinition[] = [
      { namespace: 'policy_a', precedence: 1, precedenceRank: 5, repoSource: 'repo1', edges: [], nodeMetaRecord: {}, upstreamFindings: [] },
      { namespace: 'policy_b', precedence: 1, precedenceRank: 5, repoSource: 'repo2', edges: [], nodeMetaRecord: {}, upstreamFindings: [] }
    ];
    const result = adapter.evaluateTopologyOverlays(overlays);
    expect(result.findingsString).toContain('FED-011-PRECEDENCE-RANK-CONFLICT');
  });

  it('Test 4: FED-004 Authority Tier Conflict & FED-003 Contract Divergence', () => {
    const overlays: OverlayTopologyDefinition[] = [
      { 
        namespace: 'policy_a', precedence: 1, repoSource: 'repo1', edges: [], 
        nodeMetaRecord: { 'node_x': { nodeId: 'node_x', domain: 'x', authorityTier: 2, contractSurface: true, nodeKind: 'service' } }, 
        upstreamFindings: [] 
      },
      { 
        namespace: 'policy_b', precedence: 2, repoSource: 'repo2', edges: [], 
        nodeMetaRecord: { 'node_x': { nodeId: 'node_x', domain: 'x', authorityTier: 4, contractSurface: false, nodeKind: 'database' } }, 
        upstreamFindings: [] 
      }
    ];
    const result = adapter.evaluateTopologyOverlays(overlays);
    expect(result.findingsString).toContain('FED-004-AUTHORITY-TIER-CONFLICT');
    expect(result.findingsString).toContain('FED-003-OVERLAY-CONTRACT-DIVERGENCE');
  });

  it('Test 5: FED-005 Journey Continuity & FED-006 Cascade Conflict & FED-002 Trust Conflict', () => {
    const overlays: OverlayTopologyDefinition[] = [
      { 
        namespace: 'policy_a', precedence: 1, repoSource: 'repo1', edges: [], nodeMetaRecord: {}, 
        upstreamFindings: [
          getDummyValidation('JRNY-001', 'repo2'),
          getDummyValidation('BLAST-005', 'repo2'),
          getDummyValidation('TRUST_CONFLICT_OVERLAY', 'repo1')
        ] 
      }
    ];
    const result = adapter.evaluateTopologyOverlays(overlays);
    expect(result.findingsString).toContain('FED-005-JOURNEY-CONTINUITY-DIVERGENCE');
    expect(result.findingsString).toContain('FED-006-CASCADE-PROPAGATION-CONFLICT');
    expect(result.findingsString).toContain('FED-002-TRUST-TIER-CONFLICT');
  });

  it('Test 6: FED-008 Multi-Repo Stitching Gap & FED-010 Ghost Hop', () => {
    const overlays: OverlayTopologyDefinition[] = [
      { 
        namespace: 'policy_a', precedence: 1, repoSource: 'repo1', 
        edges: [ mockEdge('node_a', 'node_b', 'fetch') ], // node_b is external, no meta.
        nodeMetaRecord: { 'node_a': { nodeId: 'node_a', domain: 'x', authorityTier: 2 } }, // x is not repo1 domain -> Ghost Hop
        upstreamFindings: [] 
      }
    ];
    const result = adapter.evaluateTopologyOverlays(overlays);
    expect(result.findingsString).toContain('FED-008-MULTI-REPO-STITCHING-GAP');
    expect(result.findingsString).toContain('FED-010-STITCH-ANCHOR-GAP');
  });

  it('Test 7: Byte-identical determinism consistency', () => {
    const overlays: OverlayTopologyDefinition[] = [
      { namespace: 'policy_a', precedence: 1, repoSource: 'repo1', edges: [], nodeMetaRecord: {}, upstreamFindings: [] },
      { namespace: 'policy_b', precedence: 2, repoSource: 'repo2', edges: [], nodeMetaRecord: {}, upstreamFindings: [] }
    ];
    const runA = adapter.evaluateTopologyOverlays(overlays);
    // Deep clone reversed
    const overlaysReversed = [...overlays].reverse();
    const runB = adapter.evaluateTopologyOverlays(overlaysReversed);
    expect(runA.findingsString).toBe(runB.findingsString);
  });
  
  it('Test 8: FED-009 Snapshot Drift and FED-013 Topology Version Incompatibility and FED-012 Adapter Admission', () => {
     const overlays: OverlayTopologyDefinition[] = [
      { 
        namespace: 'policy_a', precedence: 1, repoSource: 'repo1', edges: [], nodeMetaRecord: {}, upstreamFindings: [],
        snapshotWatermark: { repoId: 'repo1', generatedAt: '2026-04-12T00:00:00Z', topologyVersion: 'v1.0.0', snapshotClosureGraphHash: 'aaa', policyHashes: [] },
        adapterAdmissions: [ { protocolVersion: '4.13', determinismContract: true, capabilitySurface: [], matrixCompatibility: 'all' } ]
      },
      { 
        namespace: 'policy_b', precedence: 2, repoSource: 'repo2', edges: [], nodeMetaRecord: {}, upstreamFindings: [],
        snapshotWatermark: { repoId: 'repo2', generatedAt: '2026-04-12T01:00:00Z', topologyVersion: 'v1.1.0', snapshotClosureGraphHash: 'ccc', policyHashes: [] },
        adapterAdmissions: [ { protocolVersion: '4.00', determinismContract: false, capabilitySurface: [], matrixCompatibility: 'all' } ]
      }
    ];
    const result = adapter.evaluateTopologyOverlays(overlays);
    expect(result.findingsString).toContain('FED-009-SNAPSHOT-VERSION-DRIFT');
    expect(result.findingsString).toContain('FED-013-TOPOLOGY-VERSION-INCOMPATIBILITY');
    expect(result.findingsString).toContain('FED-012-NONDETERMINISTIC-ADAPTER-SURFACE');
  });
});
