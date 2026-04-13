import { AdapterCapabilityDescriptor } from './capability-registry.js';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';
import { CanonicalEdgeEntry } from '../reconciliation/canonical-edge-promoter.js';
import { AuthorityViolationFinding, AuthorityNodeMetadata } from './authority-boundary-adapter.js';

export const JOURNEY_REGRESSION_ADAPTER_VERSION = '1.0.0';

export class JourneyRegressionAdapter {
  private descriptor: AdapterCapabilityDescriptor;

  constructor() {
    this.descriptor = Object.freeze({
      adapter_id: 'arch-engine-journey-regression-adapter',
      adapter_name: 'Core Journey Regression Enforcement Adapter',
      adapter_language: 'typescript',
      adapter_version: JOURNEY_REGRESSION_ADAPTER_VERSION,
      entity_types: ['journey_violation', 'path_regression'],
      output_files: [],
      capabilities: {
        surfaceTopology: 'full',
        handlerResolution: 'none',
        invocationEdges: 'full',
        eventEdges: 'full',
        dataAccessEdges: 'partial',
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
    nodeMetaRecord: Record<string, AuthorityNodeMetadata>
  ): string {
    const rawFindings: AuthorityViolationFinding[] = [];

    // Track targets to ensure provider continuity
    const consumedTargets = new Set<string>();

    for (const edge of edges) {
      consumedTargets.add(edge.target);

      const sourceMeta = nodeMetaRecord[edge.source] || { authorityTier: 0, domain: 'unknown', persona: 'unknown' };
      const targetMeta = nodeMetaRecord[edge.target] || { authorityTier: 0, domain: 'unknown', persona: 'unknown' };
      const crossingType = this.resolveCrossingType(edge.type);
      const isMutating = crossingType === 'write';
      const tierDiff = targetMeta.authorityTier - sourceMeta.authorityTier;
      const crossDomain = sourceMeta.domain !== targetMeta.domain && sourceMeta.domain !== 'edge' && sourceMeta.domain !== 'unknown';

      // JRNY-001-MUTATION-PATH-DISCONTINUITY (BLOCKER)
      if (isMutating && sourceMeta.authorityTier <= 1 && targetMeta.authorityTier >= 3) {
        rawFindings.push({
          ruleId: 'JRNY-001-MUTATION-PATH-DISCONTINUITY',
          severity: 'BLOCKER',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized: false,
          message: `Mutation flow bypasses required orchestration layers, jumping directly from tier ${sourceMeta.authorityTier} to ${targetMeta.authorityTier}.`
        });
      }

      // JRNY-002-PERSONA-BOUNDARY-VIOLATION (CRITICAL)
      if (sourceMeta.persona === 'customer' && (targetMeta.persona === 'admin' || targetMeta.persona === 'internal')) {
        rawFindings.push({
          ruleId: 'JRNY-002-PERSONA-BOUNDARY-VIOLATION',
          severity: 'CRITICAL',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized: false,
          message: `Persona boundary violation: '${sourceMeta.persona}' consumer incorrectly invoking privileged '${targetMeta.persona}' mutation surfaces.`
        });
      }

      // JRNY-003-CONTRACT-SURFACE-MISUSE (CRITICAL)
      // E.g., invoking internal-only or deprecated endpoints across journey flow boundaries without UI/Edge flags directly
      if (edge.target.includes('_deprecated_') || (edge.target.includes('_internal_') && sourceMeta.authorityTier < 2)) {
        rawFindings.push({
          ruleId: 'JRNY-003-CONTRACT-SURFACE-MISUSE',
          severity: 'CRITICAL',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized: false,
          message: `Execution flow invokes invalid contract surface ('${edge.target}') mid-journey.`
        });
      }

      // JRNY-004-AUTHORITY-TIER-ESCALATION (BLOCKER)
      if (tierDiff > 1 && crossingType !== 'read') {
         rawFindings.push({
           ruleId: 'JRNY-004-AUTHORITY-TIER-ESCALATION',
           severity: 'BLOCKER',
           sourceNodeId: edge.source,
           targetNodeId: edge.target,
           sourceAuthorityTier: sourceMeta.authorityTier,
           targetAuthorityTier: targetMeta.authorityTier,
           sourceOwnershipDomain: sourceMeta.domain,
           targetOwnershipDomain: targetMeta.domain,
           crossingType,
           explicitlyAuthorized: false,
           message: `Multi-hop authority tier escalation detected: hopping from tier ${sourceMeta.authorityTier} to tier ${targetMeta.authorityTier} without validation logic.`
         });
      }

      // JRNY-006-TRANSPORT-ENTRYPOINT-BYPASS (CRITICAL)
      // Evaluated when deeper layers (tier 2, 3) are directly invoked from non-transport origins (like skipping Tier 1 completely for frontend origin).
      if (sourceMeta.nodeKind === 'frontend_consumer' && targetMeta.authorityTier > 1 && !targetMeta.contractSurface) {
        rawFindings.push({
          ruleId: 'JRNY-006-TRANSPORT-ENTRYPOINT-BYPASS',
          severity: 'CRITICAL',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized: false,
          message: `Unexpected transport bypass entering deeply nested logic without mapping via legitimate transport surfaces.`
        });
      }

      // JRNY-007-CROSS-DOMAIN-BEHAVIORAL-SHORTCUT (WARNING)
      if (crossDomain && targetMeta.authorityTier >= 3) {
        rawFindings.push({
          ruleId: 'JRNY-007-CROSS-DOMAIN-BEHAVIORAL-SHORTCUT',
          severity: 'WARNING',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized: false,
          message: `Execution flow crosses ownership domains (${sourceMeta.domain} to ${targetMeta.domain}) mapping an unauthorized shortcut directly to deep tier ${targetMeta.authorityTier}.`
        });
      }
    }

    // JRNY-005-CONSUMER-PROVIDER-DISCONTINUITY (WARNING) 
    // Emitted when a required intermediate provider goes entirely unused in a graph that claims it's traversed.
    // Ensure deterministic iteration to prevent Object.keys insertion order drift
    const sortedNodeEntries = Object.entries(nodeMetaRecord).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    
    for (const [nodeId, meta] of sortedNodeEntries) {
      if (meta.nodeKind === 'route' && !consumedTargets.has(nodeId)) {
        // Warning: This implies the graph has dangling providers entirely disconnected from any journey traversal mapping.
        rawFindings.push({
          ruleId: 'JRNY-005-CONSUMER-PROVIDER-DISCONTINUITY',
          severity: 'WARNING',
          sourceNodeId: nodeId,
          targetNodeId: nodeId,
          sourceAuthorityTier: meta.authorityTier,
          targetAuthorityTier: meta.authorityTier,
          sourceOwnershipDomain: meta.domain,
          targetOwnershipDomain: meta.domain,
          crossingType: 'unknown',
          explicitlyAuthorized: false,
          message: `Provider continuity broken: Expected topology path via intermediate provider '${nodeId}' is entirely orphaned or un-resolvable from the journey.`
        });
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
