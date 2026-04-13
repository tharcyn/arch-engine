import { AdapterCapabilityDescriptor } from './capability-registry.js';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';
import { CanonicalEdgeEntry } from '../reconciliation/canonical-edge-promoter.js';

/**
 * Phase 9: Authority Boundary Adapter
 * 
 * Enforces deterministically evaluated architectural boundaries over policy
 * evaluation traces without rewriting topologies or mutating descriptors.
 */

export const AUTHORITY_BOUNDARY_ADAPTER_VERSION = '1.0.0';

export interface AuthorityNodeMetadata {
  nodeId: string;
  domain: string | null;
  /**
   * Authority Tier Canonical Model:
   * 0 = Edge/UI
   * 1 = Presentation/Delivery
   * 2 = Application/Journey
   * 3 = Domain/Orchestration
   * 4 = Protected Persistence/System
   */
  authorityTier: 0 | 1 | 2 | 3 | 4;

  /**
   * Semantic Topology Classification
   */
  nodeKind?: 'route' | 'api_spec' | 'frontend_consumer' | 'service' | 'database' | 'unknown';
  contractSurface?: boolean;

  /**
   * Persona Role Execution Context
   */
  persona?: 'customer' | 'merchant' | 'admin' | 'internal' | 'unknown';
}

export interface AuthorityViolationFinding {
  ruleId: string;
  severity: 'WARNING' | 'CRITICAL' | 'BLOCKER';
  sourceNodeId: string;
  targetNodeId: string;
  sourceAuthorityTier: number;
  targetAuthorityTier: number;
  sourceOwnershipDomain: string | null;
  targetOwnershipDomain: string | null;
  crossingType: 'read' | 'write' | 'execute' | 'unknown';
  explicitlyAuthorized: boolean;
  message: string;
}

export class AuthorityBoundaryAdapter {
  private descriptor: AdapterCapabilityDescriptor;

  constructor() {
    this.descriptor = Object.freeze({
      adapter_id: 'arch-engine-authority-boundary-adapter',
      adapter_name: 'Core Authority Boundary Enforcement Adapter',
      adapter_language: 'typescript',
      adapter_version: AUTHORITY_BOUNDARY_ADAPTER_VERSION,
      entity_types: ['authority_crossing', 'violation'],
      output_files: [],
      capabilities: {
        surfaceTopology: 'none',
        handlerResolution: 'none',
        invocationEdges: 'none',
        eventEdges: 'none',
        dataAccessEdges: 'none',
        mutationTopology: 'none',
        authorityMetadata: 'full',
        contractSurface: 'none',
        frontendTopology: 'none',
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
    if (edgeType.includes('invoke')) return 'execute';
    return 'unknown';
  }

  public evaluateTopology(
    edges: CanonicalEdgeEntry[],
    nodeMetaRecord: Record<string, AuthorityNodeMetadata>,
    authorizedPaths: Set<string> = new Set()
  ): string {
    const rawFindings: AuthorityViolationFinding[] = [];

    for (const edge of edges) {
      const sourceMeta = nodeMetaRecord[edge.source];
      const targetMeta = nodeMetaRecord[edge.target];

      if (!sourceMeta || !targetMeta) continue;

      const crossingType = this.resolveCrossingType(edge.type);
      const isMutating = crossingType === 'write';
      const crossDomain = sourceMeta.domain !== targetMeta.domain;
      const tierDiff = targetMeta.authorityTier - sourceMeta.authorityTier;
      const edgeId = `${edge.source}->${edge.target}`;
      const explicitlyAuthorized = authorizedPaths.has(edgeId);

      // Rule 5: UI / Delivery directly mutating core
      if (isMutating && sourceMeta.authorityTier <= 1 && targetMeta.authorityTier >= 3) {
        rawFindings.push({
          ruleId: 'AUTH-005-UI-DB-BYPASS',
          severity: 'BLOCKER',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized,
          message: `UI/Edge (Tier ${sourceMeta.authorityTier}) bypassed application logic to mutate persistence (Tier ${targetMeta.authorityTier}).`
        });
        continue;
      }

      // Rule 1: Lower-authority zone mutating higher-authority domain
      if (isMutating && tierDiff > 0 && crossDomain && !explicitlyAuthorized) {
        rawFindings.push({
          ruleId: 'AUTH-001-TIER-INVERSION',
          severity: 'BLOCKER',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized,
          message: `Lower authority tier (${sourceMeta.authorityTier}) cannot mutate higher tier (${targetMeta.authorityTier}) out of domain.`
        });
        continue;
      }

      // Rule 2 & 3: Non-owning service performing protected lateral mutation
      if (isMutating && crossDomain && !explicitlyAuthorized && sourceMeta.authorityTier === targetMeta.authorityTier) {
        rawFindings.push({
          ruleId: 'AUTH-004-LATERAL-MUTATION',
          severity: 'CRITICAL',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized,
          message: `Lateral cross-domain mutation of ${targetMeta.domain} by ${sourceMeta.domain} without explicit authorization.`
        });
        continue;
      }

      // Rule 7: Domain-level authority inversion (Executables dropping back asynchronously unmonitored across remote domains)
      if (tierDiff < -1 && crossDomain && crossingType === 'execute') {
        rawFindings.push({
          ruleId: 'AUTH-007-AUTHORITY-INVERSION',
          severity: 'WARNING',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized,
          message: `High authority layer (${sourceMeta.authorityTier}) synchronously invoking lowest layer (${targetMeta.authorityTier}) causes orchestration inversion.`
        });
      }
    }

    // Ensure completely deterministic output mapping using binary codepoint sort.
    const sortedFindings = rawFindings.sort((a, b) => {
      if (a.sourceNodeId !== b.sourceNodeId) return a.sourceNodeId < b.sourceNodeId ? -1 : 1;
      if (a.targetNodeId !== b.targetNodeId) return a.targetNodeId < b.targetNodeId ? -1 : 1;
      return a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0;
    });

    // Produce deterministic stringified payload.
    return stableCanonicalStringify(sortedFindings);
  }
}
