import { AdapterCapabilityDescriptor } from './capability-registry.js';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';
import { CanonicalEdgeEntry } from '../reconciliation/canonical-edge-promoter.js';
import { AuthorityViolationFinding, AuthorityNodeMetadata } from './authority-boundary-adapter.js';

export const REST_CONTRACT_ADAPTER_VERSION = '1.0.0';

export class RestContractEnforcementAdapter {
  private descriptor: AdapterCapabilityDescriptor;

  constructor() {
    this.descriptor = Object.freeze({
      adapter_id: 'arch-engine-rest-contract-adapter',
      adapter_name: 'Core REST Contract Enforcement Adapter',
      adapter_language: 'typescript',
      adapter_version: REST_CONTRACT_ADAPTER_VERSION,
      entity_types: ['rest_violation', 'contract_gap'],
      output_files: [],
      capabilities: {
        surfaceTopology: 'full',
        handlerResolution: 'partial',
        invocationEdges: 'none',
        eventEdges: 'none',
        dataAccessEdges: 'none',
        mutationTopology: 'none',
        authorityMetadata: 'none',
        contractSurface: 'full',
        frontendTopology: 'full',
        modelRelationships: 'none'
      }
    } satisfies AdapterCapabilityDescriptor);
  }

  public getRegistryDescriptor(): AdapterCapabilityDescriptor {
    return this.descriptor;
  }

  private isRouteNode(nodeId: string, nodeMetaRecord: Record<string, AuthorityNodeMetadata>): boolean {
    const meta = nodeMetaRecord[nodeId];
    // Rule 1: Semantic Topology Classification Primary
    if (meta && meta.nodeKind) return meta.nodeKind === 'route';
    // Rule 2: Deterministic Prefix Fallback
    return nodeId.startsWith('rte_');
  }

  private isApiSpecNode(nodeId: string, nodeMetaRecord: Record<string, AuthorityNodeMetadata>): boolean {
    const meta = nodeMetaRecord[nodeId];
    if (meta && meta.nodeKind) return meta.nodeKind === 'api_spec';
    return nodeId.startsWith('api_');
  }

  private isFrontendNode(nodeId: string, nodeMetaRecord: Record<string, AuthorityNodeMetadata>): boolean {
    const meta = nodeMetaRecord[nodeId];
    if (meta && meta.nodeKind) return meta.nodeKind === 'frontend_consumer';
    return nodeId.startsWith('ui_') || nodeId.startsWith('frontend_');
  }

  /**
   * Deterministic Schema Precedence Lock
   * Resolves the authoritative schema source to prevent bidirectional guessing.
   */
  private resolveSchemaAuthority(
    sourceId: string, 
    targetId: string, 
    nodeMetaRecord: Record<string, AuthorityNodeMetadata>
  ): 'openapi' | 'controller' | 'route' | 'frontend' | 'fallback' {
    const sourceMeta = nodeMetaRecord[sourceId];
    const targetMeta = nodeMetaRecord[targetId];

    // Priority 1: OpenAPI specification (if present as contract surface)
    if (this.isApiSpecNode(sourceId, nodeMetaRecord) || this.isApiSpecNode(targetId, nodeMetaRecord)) {
      if (sourceMeta?.contractSurface || targetMeta?.contractSurface) return 'openapi';
    }

    // Priority 2: Controller signature / DTO contract (Tier 2/3 Services)
    if (sourceMeta?.authorityTier === 2 || targetMeta?.authorityTier === 2) {
       if (sourceMeta?.nodeKind === 'service' || targetMeta?.nodeKind === 'service') return 'controller';
    }

    // Priority 3: Transport-layer route metadata
    if (this.isRouteNode(sourceId, nodeMetaRecord) || this.isRouteNode(targetId, nodeMetaRecord)) {
      return 'route';
    }

    // Priority 4: Frontend consumption metadata
    if (this.isFrontendNode(sourceId, nodeMetaRecord) || this.isFrontendNode(targetId, nodeMetaRecord)) {
      return 'frontend';
    }

    // Priority 5: Canonical-edge inferred fallback
    return 'fallback';
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
    const allNodes = new Set<string>();

    for (const edge of edges) {
      allNodes.add(edge.source);
      allNodes.add(edge.target);
    }

    // Pass 1: Node-level route naming / properties
    for (const nodeId of allNodes) {
      if (this.isRouteNode(nodeId, nodeMetaRecord)) {
        // Naming Grammar Validation
        // Using namespace isolation to prevent federation crossover issues. Ensure prefix normalization.
        const normalizedId = nodeId.split('::').pop() || nodeId; 
        const isMixedCase = /[A-Z]/.test(normalizedId.replace('rte_', ''));
        const duplicateVerbs = /(get_get|post_post|put_put|delete_delete)/.test(normalizedId);
        
        if (isMixedCase || duplicateVerbs) {
          const meta = nodeMetaRecord[nodeId] || { authorityTier: 2, domain: 'unknown' };
          rawFindings.push({
            ruleId: 'REST-001-NAMING-GRAMMAR-VIOLATION',
            severity: 'WARNING',
            sourceNodeId: nodeId,
            targetNodeId: nodeId,
            sourceAuthorityTier: meta.authorityTier,
            targetAuthorityTier: meta.authorityTier,
            sourceOwnershipDomain: meta.domain,
            targetOwnershipDomain: meta.domain,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Route identifier '${nodeId}' violates canonical naming grammar (mixed case or duplicate verbs).`
          });
        }

        // Versioning Drift Validation (missing _v[0-9]+_)
        const isPublicRoute = !normalizedId.includes('_internal_');
        const hasVersionPrefix = /_v\d+_/.test(normalizedId);
        if (isPublicRoute && !hasVersionPrefix) {
          const meta = nodeMetaRecord[nodeId] || { authorityTier: 2, domain: 'unknown' };
          rawFindings.push({
            ruleId: 'REST-006-VERSIONING-DRIFT',
            severity: 'WARNING',
            sourceNodeId: nodeId,
            targetNodeId: nodeId,
            sourceAuthorityTier: meta.authorityTier,
            targetAuthorityTier: meta.authorityTier,
            sourceOwnershipDomain: meta.domain,
            targetOwnershipDomain: meta.domain,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Public route '${nodeId}' lacks versioning prefix identifier.`
          });
        }
      }
    }

    // Pass 2: Edge-level contract violations
    for (const edge of edges) {
      const sourceMeta = nodeMetaRecord[edge.source] || { authorityTier: 0, domain: 'unknown' };
      const targetMeta = nodeMetaRecord[edge.target] || { authorityTier: 0, domain: 'unknown' };
      const crossingType = this.resolveCrossingType(edge.type);

      const isFrontendSource = this.isFrontendNode(edge.source, nodeMetaRecord);
      const isRouteTarget = this.isRouteNode(edge.target, nodeMetaRecord);

      if (isFrontendSource && isRouteTarget) {
        // REST-002: Internal route exposure
        if (edge.target.includes('_internal_')) {
          rawFindings.push({
            ruleId: 'REST-002-INTERNAL-ROUTE-EXPOSURE',
            severity: 'CRITICAL',
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceAuthorityTier: sourceMeta.authorityTier,
            targetAuthorityTier: targetMeta.authorityTier,
            sourceOwnershipDomain: sourceMeta.domain,
            targetOwnershipDomain: targetMeta.domain,
            crossingType,
            explicitlyAuthorized: false,
            message: `External frontend '${edge.source}' consumes internal-only route '${edge.target}'.`
          });
        }

        // REST-004: Frontend linkage gap (non-existent route or deprecated)
        if (edge.target.includes('_deprecated_') || edge.type === 'invalid_linkage') {
          rawFindings.push({
            ruleId: 'REST-004-FRONTEND-LINKAGE-GAP',
            severity: 'CRITICAL',
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceAuthorityTier: sourceMeta.authorityTier,
            targetAuthorityTier: targetMeta.authorityTier,
            sourceOwnershipDomain: sourceMeta.domain,
            targetOwnershipDomain: targetMeta.domain,
            crossingType,
            explicitlyAuthorized: false,
            message: `Frontend consumer '${edge.source}' references deprecated or invalid route '${edge.target}'.`
          });
        }
      }

      // REST-003: Schema Parity Mismatch (if explicitly recorded in edges or missing link)
      // Ensures the schema precedence is firmly locked to avoid ambiguous multi-schema guessing.
      if (edge.type === 'schema_mismatch') {
        const primaryAuth = this.resolveSchemaAuthority(edge.source, edge.target, nodeMetaRecord);
        rawFindings.push({
          ruleId: 'REST-003-SCHEMA-PARITY-MISMATCH',
          severity: 'BLOCKER',
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceAuthorityTier: sourceMeta.authorityTier,
          targetAuthorityTier: targetMeta.authorityTier,
          sourceOwnershipDomain: sourceMeta.domain,
          targetOwnershipDomain: targetMeta.domain,
          crossingType,
          explicitlyAuthorized: false,
          message: `Schema mismatch detected. Authoritative precedence locked to: [${primaryAuth}]. Contract violation between '${edge.source}' and '${edge.target}'.`
        });
      }

      // We explicitly rely strictly on upstream authority metadata, duplicating no evaluation tier mapping here.
      // We only apply explicit REST-005/007 boundary mappings where transportation signals bypass expected limits.
      if (isFrontendSource && isRouteTarget) {
        // REST-005: Domain boundary violation via REST
        if (sourceMeta.domain !== targetMeta.domain && sourceMeta.domain !== 'edge' && sourceMeta.domain !== 'unknown') {
          rawFindings.push({
            ruleId: 'REST-005-DOMAIN-BOUNDARY-VIOLATION',
            severity: 'CRITICAL',
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceAuthorityTier: sourceMeta.authorityTier,
            targetAuthorityTier: targetMeta.authorityTier,
            sourceOwnershipDomain: sourceMeta.domain,
            targetOwnershipDomain: targetMeta.domain,
            crossingType,
            explicitlyAuthorized: false,
            message: `Route topology '${edge.target}' violates domain encapsulation expected by '${sourceMeta.domain}'.`
          });
        }
        
        // REST-007: Transport authority mismatch
        // Transport-layer (Tier 0 or 1) calling directly into Tier 3+ (instead of Tier 2 applications)
        if (sourceMeta.authorityTier <= 1 && targetMeta.authorityTier >= 3) {
          rawFindings.push({
            ruleId: 'REST-007-TRANSPORT-AUTHORITY-MISMATCH',
            severity: 'BLOCKER',
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceAuthorityTier: sourceMeta.authorityTier,
            targetAuthorityTier: targetMeta.authorityTier,
            sourceOwnershipDomain: sourceMeta.domain,
            targetOwnershipDomain: targetMeta.domain,
            crossingType,
            explicitlyAuthorized: false,
            message: `Transport authority mismatch: '${edge.source}' (Tier ${sourceMeta.authorityTier}) improperly bypasses into '${edge.target}' (Tier ${targetMeta.authorityTier}).`
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
