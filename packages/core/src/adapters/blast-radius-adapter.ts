import { AdapterCapabilityDescriptor } from './capability-registry.js';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';
import { CanonicalEdgeEntry } from '../reconciliation/canonical-edge-promoter.js';
import { AuthorityViolationFinding, AuthorityNodeMetadata } from './authority-boundary-adapter.js';

export const BLAST_RADIUS_ADAPTER_VERSION = '1.0.0';

export class BlastRadiusAdapter {
  private descriptor: AdapterCapabilityDescriptor;
  private cascadeDepthLimit: number;

  constructor(cascadeDepthLimit: number = 3) {
    this.cascadeDepthLimit = cascadeDepthLimit;
    this.descriptor = Object.freeze({
      adapter_id: 'arch-engine-blast-radius-adapter',
      adapter_name: 'Core Blast Radius Enforcement Adapter',
      adapter_language: 'typescript',
      adapter_version: BLAST_RADIUS_ADAPTER_VERSION,
      entity_types: ['blast_violation', 'cascade_ripple'],
      output_files: [],
      capabilities: {
        surfaceTopology: 'full',
        handlerResolution: 'none',
        invocationEdges: 'full',
        eventEdges: 'full',
        dataAccessEdges: 'full',
        mutationTopology: 'full',
        authorityMetadata: 'none',
        contractSurface: 'none',
        frontendTopology: 'full',
        modelRelationships: 'none'
      }
    });
  }

  public getRegistryDescriptor(): AdapterCapabilityDescriptor {
    return this.descriptor;
  }

  private resolveCrossingType(edgeType: string): 'read' | 'write' | 'execute' | 'unknown' {
    if (edgeType.includes('write') || edgeType.includes('mutate') || edgeType.includes('create') || edgeType.includes('delete') || edgeType.includes('update')) return 'write';
    if (edgeType.includes('read')) return 'read';
    if (edgeType.includes('invoke') || edgeType.includes('consume') || edgeType.includes('fetch')) return 'execute';
    return 'unknown';
  }

  public evaluateTopology(
    edges: CanonicalEdgeEntry[],
    nodeMetaRecord: Record<string, AuthorityNodeMetadata>,
    upstreamFindings: AuthorityViolationFinding[] = [] // Ingest anchors logically passed from upstream adapters
  ): string {
    const rawFindings: AuthorityViolationFinding[] = [];

    // Reachability Propagation Maps
    const downstreamMap: Record<string, string[]> = {};
    const upstreamMap: Record<string, string[]> = {};
    const allNodes = new Set<string>();

    for (const edge of edges) {
      if (!downstreamMap[edge.source]) downstreamMap[edge.source] = [];
      if (!upstreamMap[edge.target]) upstreamMap[edge.target] = [];
      
      downstreamMap[edge.source].push(edge.target);
      upstreamMap[edge.target].push(edge.source);
      allNodes.add(edge.source);
      allNodes.add(edge.target);
    }

    // Helper to compute deterministic set of reachable targets (multi-hop)
    const getReachable = (startNode: string, directionMap: Record<string, string[]>) => {
      const visited = new Set<string>();
      const queue = [startNode];
      while(queue.length > 0) {
        // Shift is heavily environment-dependent for large arrays technically, but safe on small graphs. 
        // We ensure consistent sorting before resolution to prevent Map/Set drift internally.
        const current = queue.shift()!;
        const neighbors = (directionMap[current] || []).sort((a,b) => a < b ? -1 : a > b ? 1 : 0);
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
      return Array.from(visited).sort((a,b) => a < b ? -1 : a > b ? 1 : 0);
    };

    const sortedNodes = Array.from(allNodes).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    for (const node of sortedNodes) {
      const downs = getReachable(node, downstreamMap);
      const ups = getReachable(node, upstreamMap);
      
      const nodeMeta = nodeMetaRecord[node] || { authorityTier: 0, domain: 'unknown', persona: 'unknown' };

      // BLAST-001-DOWNSTREAM-CASCADE-SPREAD (CRITICAL)
      // Detect excessive multi-hop mutation downstream limits.
      if (downs.length >= this.cascadeDepthLimit) {
        rawFindings.push({
          ruleId: 'BLAST-001-DOWNSTREAM-CASCADE-SPREAD',
          severity: 'CRITICAL',
          sourceNodeId: node,
          targetNodeId: node,
          sourceAuthorityTier: nodeMeta.authorityTier,
          targetAuthorityTier: nodeMeta.authorityTier,
          sourceOwnershipDomain: nodeMeta.domain,
          targetOwnershipDomain: nodeMeta.domain,
          crossingType: 'unknown',
          explicitlyAuthorized: false,
          message: `Excessive downstream cascade spread detected: Node '${node}' mutation propagates across ${downs.length} downstream layers (limit configured locally to ${this.cascadeDepthLimit}).`
        });
      }

      // BLAST-002-UPSTREAM-DEPENDENCY-SHOCK (WARNING)
      if (ups.length >= this.cascadeDepthLimit) {
        rawFindings.push({
          ruleId: 'BLAST-002-UPSTREAM-DEPENDENCY-SHOCK',
          severity: 'WARNING',
          sourceNodeId: node,
          targetNodeId: node,
          sourceAuthorityTier: nodeMeta.authorityTier,
          targetAuthorityTier: nodeMeta.authorityTier,
          sourceOwnershipDomain: nodeMeta.domain,
          targetOwnershipDomain: nodeMeta.domain,
          crossingType: 'unknown',
          explicitlyAuthorized: false,
          message: `Upstream dependency shock risk: Node '${node}' exposes ${ups.length} upstream dependents to amplified regression (limit configured locally to ${this.cascadeDepthLimit}).`
        });
      }

      for (const downNode of downs) {
        const downMeta = nodeMetaRecord[downNode] || { authorityTier: 0, domain: 'unknown', persona: 'unknown' };
        
        // BLAST-003-AUTHORITY-CASCADE-VIOLATION-SPREAD (BLOCKER)
        // Multi-hop spread escaping local domains to hit highly privileged architectures inappropriately
        if (nodeMeta.authorityTier <= 1 && downMeta.authorityTier >= 3 && nodeMeta.domain !== downMeta.domain) {
          rawFindings.push({
            ruleId: 'BLAST-003-AUTHORITY-CASCADE-VIOLATION-SPREAD',
            severity: 'BLOCKER',
            sourceNodeId: node,
            targetNodeId: downNode,
            sourceAuthorityTier: nodeMeta.authorityTier,
            targetAuthorityTier: downMeta.authorityTier,
            sourceOwnershipDomain: nodeMeta.domain,
            targetOwnershipDomain: downMeta.domain,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Authority spread violation: Unprivileged '${node}' indirectly cascades into heavily privileged domain '${downNode}'.`
          });
        }

        // BLAST-004-CONTRACT-SURFACE-DIFFUSION (CRITICAL)
        if (nodeMeta.contractSurface && downMeta.nodeKind === 'frontend_consumer') {
           rawFindings.push({
            ruleId: 'BLAST-004-CONTRACT-SURFACE-DIFFUSION',
            severity: 'CRITICAL',
            sourceNodeId: node,
            targetNodeId: downNode,
            sourceAuthorityTier: nodeMeta.authorityTier,
            targetAuthorityTier: downMeta.authorityTier,
            sourceOwnershipDomain: nodeMeta.domain,
            targetOwnershipDomain: downMeta.domain,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Contract regression diffuses widely: Instability at '${node}' risks cascading to frontend consumer '${downNode}'.`
          });
        }

        // BLAST-006-PERSONA-BOUNDARY-RIPPLE (WARNING)
        if (nodeMeta.persona && downMeta.persona && nodeMeta.persona !== downMeta.persona && downMeta.persona !== 'unknown' && downMeta.persona !== 'internal') {
           rawFindings.push({
            ruleId: 'BLAST-006-PERSONA-BOUNDARY-RIPPLE',
            severity: 'WARNING',
            sourceNodeId: node,
            targetNodeId: downNode,
            sourceAuthorityTier: nodeMeta.authorityTier,
            targetAuthorityTier: downMeta.authorityTier,
            sourceOwnershipDomain: nodeMeta.domain,
            targetOwnershipDomain: downMeta.domain,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Persona boundary ripple: '${node}' (${nodeMeta.persona}) indirectly influences disjoint persona '${downNode}' (${downMeta.persona}).`
          });
        }

        // BLAST-007-CROSS-DOMAIN-RIPPLE-AMPLIFICATION (CRITICAL)
        if (nodeMeta.domain && downMeta.domain && nodeMeta.domain !== downMeta.domain && nodeMeta.authorityTier === downMeta.authorityTier) {
          rawFindings.push({
            ruleId: 'BLAST-007-CROSS-DOMAIN-RIPPLE-AMPLIFICATION',
            severity: 'CRITICAL',
            sourceNodeId: node,
            targetNodeId: downNode,
            sourceAuthorityTier: nodeMeta.authorityTier,
            targetAuthorityTier: downMeta.authorityTier,
            sourceOwnershipDomain: nodeMeta.domain,
            targetOwnershipDomain: downMeta.domain,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Cross-domain ripple amplification: Peer domain '${nodeMeta.domain}' modifications aggressively cascade into ownership-isolated '${downMeta.domain}'.`
          });
        }
      }
    }

    // Process upstream findings dynamically passed in as anchors (Journey gaps, Rest schema gaps etc.)
    for (const validation of upstreamFindings) {
      if (validation.ruleId.startsWith('JRNY-005') || validation.ruleId.startsWith('JRNY-001')) {
         const cascades = getReachable(validation.targetNodeId, downstreamMap);
         if (cascades.length > 0) {
           rawFindings.push({
            ruleId: 'BLAST-005-JOURNEY-CONTINUITY-RIPPLE',
            severity: 'CRITICAL',
            sourceNodeId: validation.sourceNodeId,
            targetNodeId: validation.targetNodeId,
            sourceAuthorityTier: validation.sourceAuthorityTier,
            targetAuthorityTier: validation.targetAuthorityTier,
            sourceOwnershipDomain: validation.sourceOwnershipDomain,
            targetOwnershipDomain: validation.targetOwnershipDomain,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Journey discontinuity ripple: The gap at '${validation.targetNodeId}' actively destabilizes ${cascades.length} additional downstream entities.`
          });
         }
      }

      if (validation.ruleId.startsWith('REST-007')) {
         const propagates = getReachable(validation.targetNodeId, downstreamMap);
         if (propagates.length > 0) {
             rawFindings.push({
              ruleId: 'BLAST-008-TRANSPORT-ENTRYPOINT-SHOCK',
              severity: 'BLOCKER',
              sourceNodeId: validation.sourceNodeId,
              targetNodeId: validation.targetNodeId,
              sourceAuthorityTier: validation.sourceAuthorityTier,
              targetAuthorityTier: validation.targetAuthorityTier,
              sourceOwnershipDomain: validation.sourceOwnershipDomain,
              targetOwnershipDomain: validation.targetOwnershipDomain,
              crossingType: 'unknown',
              explicitlyAuthorized: false,
              message: `Transport-layer instability shock: Entrypoint mismatch violently shifts volatility directly across ${propagates.length} tier layers.`
            });
         }
      }
    }

    // Sort outputs deterministically
    const sortedFindings = rawFindings.sort((a, b) => {
      if (a.sourceNodeId !== b.sourceNodeId) return a.sourceNodeId < b.sourceNodeId ? -1 : 1;
      if (a.targetNodeId !== b.targetNodeId) return a.targetNodeId < b.targetNodeId ? -1 : 1;
      return a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0;
    });

    return stableCanonicalStringify(sortedFindings);
  }
}
