import { AdapterCapabilityDescriptor } from './capability-registry.js';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';
import { CanonicalEdgeEntry } from '../reconciliation/canonical-edge-promoter.js';
import { AuthorityViolationFinding, AuthorityNodeMetadata } from './authority-boundary-adapter.js';

import { LOADER_PROTOCOL_VERSION } from '../transport/types.js';

export const FEDERATION_OVERLAY_ADAPTER_VERSION = '1.0.0';

export interface SnapshotWatermarkEnvelope {
  repoId: string;
  snapshotClosureGraphHash: string;
  policyHashes: string[];
  topologyVersion: string;
  generatedAt: string;
  snapshotSignature?: string;
}

export interface AdapterAdmissionContract {
  protocolVersion: string;
  determinismContract: boolean;
  capabilitySurface: string[];
  matrixCompatibility: string;
}

export interface OverlayTopologyDefinition {
  namespace: string;
  precedence: number;  // Fallback precedence level
  precedenceRank?: number; // Explicit explicit overlay precedence layer rank
  repoSource: string;
  edges: CanonicalEdgeEntry[];
  nodeMetaRecord: Record<string, AuthorityNodeMetadata>;
  upstreamFindings: AuthorityViolationFinding[];
  snapshotWatermark?: SnapshotWatermarkEnvelope;
  adapterAdmissions?: AdapterAdmissionContract[];
}

export interface OverlayDiagnosticSurface {
  overlaySources: string[];
  snapshotVersions: string[];
  policyNamespaces: string[];
  stitchAnchors: string[];
}

export class FederationOverlayAdapter {
  private descriptor: AdapterCapabilityDescriptor;

  constructor() {
    this.descriptor = Object.freeze({
      adapter_id: 'arch-engine-federation-overlay-adapter',
      adapter_name: 'Core Federation Overlay Enforcement Adapter',
      adapter_language: 'typescript',
      adapter_version: FEDERATION_OVERLAY_ADAPTER_VERSION,
      entity_types: ['federation_violation', 'overlay_conflict'],
      output_files: [],
      capabilities: {
        surfaceTopology: 'full',
        handlerResolution: 'none',
        invocationEdges: 'none',
        eventEdges: 'none',
        dataAccessEdges: 'none',
        mutationTopology: 'none',
        authorityMetadata: 'none',
        contractSurface: 'none',
        frontendTopology: 'none',
        modelRelationships: 'full' // Represents cross-domain/policy matrix stitching naturally
      }
    });
  }

  public getRegistryDescriptor(): AdapterCapabilityDescriptor {
    return this.descriptor;
  }

  public evaluateTopologyOverlays(overlays: OverlayTopologyDefinition[]): { findingsString: string, diagnostics: OverlayDiagnosticSurface } {
    const rawFindings: AuthorityViolationFinding[] = [];

    // Ensure deterministic ordering to simulate trust-tier precedence and avoid filesystem/Map sorting issues.
    // Use precedenceRank first, fallback to precedence, then sort by namespace to avoid ambiguity.
    const sortedOverlays = [...overlays].sort((a, b) => {
      const aRank = a.precedenceRank !== undefined ? a.precedenceRank : a.precedence;
      const bRank = b.precedenceRank !== undefined ? b.precedenceRank : b.precedence;
      
      if (aRank !== bRank) return bRank - aRank; // Sort DESC by requirements
      return a.namespace < b.namespace ? -1 : a.namespace > b.namespace ? 1 : 0;
    });

    const namespaceRegistry = new Set<string>();
    const nodeAuthorityRegistry: Record<string, { tier: number; namespace: string; repo: string }> = {};
    const nodeContractRegistry: Record<string, { isContract: boolean; namespace: string; repo: string }> = {};

    // Diagnostic surface tracking
    const diagSources = new Set<string>();
    const diagVersions = new Set<string>();
    const diagNamespaces = new Set<string>();
    const diagAnchors = new Set<string>();

    let prevPrecedenceRank = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < sortedOverlays.length; i++) {
        const overlay = sortedOverlays[i];
        
        diagSources.add(overlay.repoSource);
        diagNamespaces.add(overlay.namespace);
        
        const currentRank = overlay.precedenceRank !== undefined ? overlay.precedenceRank : overlay.precedence;

        // FED-011 PRECEDENCE RANK CONFLICT (WARNING)
        if (i > 0 && currentRank === prevPrecedenceRank) {
           rawFindings.push({
            ruleId: 'FED-011-PRECEDENCE-RANK-CONFLICT',
            severity: 'WARNING',
            sourceNodeId: overlay.namespace,
            targetNodeId: overlay.namespace,
            sourceAuthorityTier: 0,
            targetAuthorityTier: 0,
            sourceOwnershipDomain: overlay.repoSource,
            targetOwnershipDomain: overlay.repoSource,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Precedence Rank Conflict: Namespace '${overlay.namespace}' shares a rank override definition (${currentRank}).`
          });
        }
        prevPrecedenceRank = currentRank;

        // FED-007-OVERLAY-PRECEDENCE-AMBIGUITY (WARNING)
        if (overlay.precedenceRank === undefined && i > 0 && overlay.precedence === sortedOverlays[i-1].precedence && overlay.precedenceRank === sortedOverlays[i-1].precedenceRank) {
           rawFindings.push({
            ruleId: 'FED-007-OVERLAY-PRECEDENCE-AMBIGUITY',
            severity: 'WARNING',
            sourceNodeId: overlay.namespace,
            targetNodeId: overlay.namespace,
            sourceAuthorityTier: 0,
            targetAuthorityTier: 0,
            sourceOwnershipDomain: overlay.repoSource,
            targetOwnershipDomain: overlay.repoSource,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Ambiguous overlay ordering detected: Namespace '${overlay.namespace}' shares precedence level ${overlay.precedence} with conflicting peer.`
          });
        }

        // FED-001-NAMESPACE-COLLISION (BLOCKER)
        if (namespaceRegistry.has(overlay.namespace)) {
           rawFindings.push({
            ruleId: 'FED-001-NAMESPACE-COLLISION',
            severity: 'BLOCKER',
            sourceNodeId: overlay.namespace,
            targetNodeId: overlay.namespace,
            sourceAuthorityTier: 0,
            targetAuthorityTier: 0,
            sourceOwnershipDomain: overlay.repoSource,
            targetOwnershipDomain: overlay.repoSource,
            crossingType: 'unknown',
            explicitlyAuthorized: false,
            message: `Descriptor namespace collision detected: The overlay namespace '${overlay.namespace}' is duplicated across topological inputs.`
          });
        }
        namespaceRegistry.add(overlay.namespace);
        
        // Process Watermark Validation (FED-009, FED-013)
        if (overlay.snapshotWatermark) {
            diagVersions.add(overlay.snapshotWatermark.topologyVersion);
            
            // Check compatibility if comparing multiple overlays
            for(let j = 0; j < i; j++) {
                const preOverlay = sortedOverlays[j];
                if (preOverlay.snapshotWatermark) {
                    if (preOverlay.snapshotWatermark.generatedAt !== overlay.snapshotWatermark.generatedAt || preOverlay.snapshotWatermark.topologyVersion !== overlay.snapshotWatermark.topologyVersion) {
                        rawFindings.push({
                            ruleId: 'FED-009-SNAPSHOT-VERSION-DRIFT',
                            severity: 'WARNING',
                            sourceNodeId: preOverlay.namespace,
                            targetNodeId: overlay.namespace,
                            sourceAuthorityTier: 0,
                            targetAuthorityTier: 0,
                            sourceOwnershipDomain: preOverlay.repoSource,
                            targetOwnershipDomain: overlay.repoSource,
                            crossingType: 'unknown',
                            explicitlyAuthorized: false,
                            message: `Snapshot version drift: Overlay ${preOverlay.namespace} generated at ${preOverlay.snapshotWatermark.generatedAt} drifts from ${overlay.namespace} generated at ${overlay.snapshotWatermark.generatedAt}.`
                        });
                    }
                    
                    if (preOverlay.snapshotWatermark.snapshotClosureGraphHash !== overlay.snapshotWatermark.snapshotClosureGraphHash) {
                         rawFindings.push({
                            ruleId: 'FED-013-TOPOLOGY-VERSION-INCOMPATIBILITY',
                            severity: 'CRITICAL',
                            sourceNodeId: preOverlay.namespace,
                            targetNodeId: overlay.namespace,
                            sourceAuthorityTier: 0,
                            targetAuthorityTier: 0,
                            sourceOwnershipDomain: preOverlay.repoSource,
                            targetOwnershipDomain: overlay.repoSource,
                            crossingType: 'unknown',
                            explicitlyAuthorized: false,
                            message: `Topology version incompatibility: Base graph topologies drastically conflict causing unmergeable bounds.`
                        });
                    }
                }
            }
        }
        
        // FED-012 NONDETERMINISTIC ADAPTER SURFACE (BLOCKER)
        if (overlay.adapterAdmissions) {
            for (const adm of overlay.adapterAdmissions) {
                if (adm.protocolVersion !== LOADER_PROTOCOL_VERSION || adm.determinismContract !== true) {
                    rawFindings.push({
                      ruleId: 'FED-012-NONDETERMINISTIC-ADAPTER-SURFACE',
                      severity: 'BLOCKER',
                      sourceNodeId: overlay.namespace,
                      targetNodeId: overlay.namespace,
                      sourceAuthorityTier: 0,
                      targetAuthorityTier: 0,
                      sourceOwnershipDomain: overlay.repoSource,
                      targetOwnershipDomain: overlay.repoSource,
                      crossingType: 'unknown',
                      explicitlyAuthorized: false,
                      message: `Adapter admission rejected: External adapter violates protocol expectations or cannot fulfill determinism contract.`
                    });
                }
            }
        }

        // Process Node Metadata to detect FED-004 and FED-003
        const sortedNodeIds = Object.keys(overlay.nodeMetaRecord).sort();
        for (const nodeId of sortedNodeIds) {
           const meta = overlay.nodeMetaRecord[nodeId];

           // Check Authority Tier Conflicts (FED-004)
           if (nodeAuthorityRegistry[nodeId]) {
               const existing = nodeAuthorityRegistry[nodeId];
               if (existing.tier !== meta.authorityTier) {
                   // Trust Tier Conflict evaluation logic (FED-002 proxy): Root logic vs local overrides.
                   // Here we emit authority contradiction accurately.
                   rawFindings.push({
                      ruleId: 'FED-004-AUTHORITY-TIER-CONFLICT',
                      severity: 'BLOCKER',
                      sourceNodeId: existing.namespace,
                      targetNodeId: overlay.namespace,
                      sourceAuthorityTier: existing.tier,
                      targetAuthorityTier: meta.authorityTier,
                      sourceOwnershipDomain: existing.repo,
                      targetOwnershipDomain: overlay.repoSource,
                      crossingType: 'unknown',
                      explicitlyAuthorized: false,
                      message: `Incompatible authority-tier definitions across overlay graphs: Node '${nodeId}' is defined as Tier ${existing.tier} in '${existing.namespace}' but Tier ${meta.authorityTier} in '${overlay.namespace}'.`
                   });
               }
           } else {
               nodeAuthorityRegistry[nodeId] = { tier: meta.authorityTier, namespace: overlay.namespace, repo: overlay.repoSource };
               if (meta.domain && meta.domain !== overlay.repoSource) {
                   diagAnchors.add(nodeId); // Extrapolated from explicit node ownerships outside natural bounds
               }
           }

           // Check Overlay Contract Divergence (FED-003)
           if (nodeContractRegistry[nodeId]) {
              const existing = nodeContractRegistry[nodeId];
              const currentHasContract = meta.contractSurface === true;
              if (existing.isContract !== currentHasContract) {
                  rawFindings.push({
                      ruleId: 'FED-003-OVERLAY-CONTRACT-DIVERGENCE',
                      severity: 'CRITICAL',
                      sourceNodeId: existing.namespace,
                      targetNodeId: overlay.namespace,
                      sourceAuthorityTier: 0,
                      targetAuthorityTier: 0,
                      sourceOwnershipDomain: existing.repo,
                      targetOwnershipDomain: overlay.repoSource,
                      crossingType: 'unknown',
                      explicitlyAuthorized: false,
                      message: `Contract-surface divergence: Node '${nodeId}' contract definitions conflict between '${existing.namespace}' and '${overlay.namespace}'.`
                  });
              }
           } else {
              nodeContractRegistry[nodeId] = { isContract: meta.contractSurface === true, namespace: overlay.namespace, repo: overlay.repoSource };
           }
        }

        // FED-005, FED-006: Proxy propagation tracking
        for (const finding of overlay.upstreamFindings) {
            if (finding.ruleId.startsWith('JRNY')) {
                // If a journey constraint exists in one overlay but not recognized universally across identical nodes.
                // We emit divergence flags ensuring strict continuity merging.
                // For demonstration, we simply identify the presence of cross-repo behavioral impacts.
                if (finding.targetOwnershipDomain && finding.targetOwnershipDomain !== overlay.repoSource) {
                    rawFindings.push({
                        ...finding,
                        ruleId: 'FED-005-JOURNEY-CONTINUITY-DIVERGENCE',
                        message: `Behavioral continuity conflict mapping topological boundaries externally across repositories: ${finding.message}`
                    });
                }
            }
            if (finding.ruleId.startsWith('BLAST')) {
                if (finding.targetOwnershipDomain && finding.targetOwnershipDomain !== overlay.repoSource) {
                    rawFindings.push({
                        ...finding,
                        ruleId: 'FED-006-CASCADE-PROPAGATION-CONFLICT',
                        message: `Cascade propagation mapping diverges across overlay graphs indicating external reliance shock: ${finding.message}`
                    });
                }
            }

            // FED-002-TRUST-TIER-CONFLICT (CRITICAL)
            // If explicit trust conflicts are parsed
            if (finding.ruleId === 'TRUST_CONFLICT_OVERLAY') {
                 rawFindings.push({
                  ruleId: 'FED-002-TRUST-TIER-CONFLICT',
                  severity: 'CRITICAL',
                  sourceNodeId: overlay.namespace,
                  targetNodeId: overlay.namespace,
                  sourceAuthorityTier: 0,
                  targetAuthorityTier: 0,
                  sourceOwnershipDomain: overlay.repoSource,
                  targetOwnershipDomain: overlay.repoSource,
                  crossingType: 'unknown',
                  explicitlyAuthorized: false,
                  message: `Conflicting trust-tier precedence definitions detected in overlay.`
                });
            }
        }

        // FED-008-MULTI-REPO-STITCHING-GAP (WARNING) & FED-010-STITCH-ANCHOR-GAP (BLOCKER)
        // Check if edges claim external cross-repo dependencies without anchoring explicitly
        for (const edge of overlay.edges) {
             const targetNodeMeta = overlay.nodeMetaRecord[edge.target];
             const sourceNodeMeta = overlay.nodeMetaRecord[edge.source];
             
             // Detect topological ghost-hops (cross-domain execution without an explicit stitch anchor metadata presence anywhere)
             if (sourceNodeMeta && sourceNodeMeta.domain !== overlay.repoSource && (!nodeAuthorityRegistry[edge.source] || !nodeAuthorityRegistry[edge.target])) {
                  rawFindings.push({
                    ruleId: 'FED-010-STITCH-ANCHOR-GAP',
                    severity: 'BLOCKER',
                    sourceNodeId: edge.source,
                    targetNodeId: edge.target,
                    sourceAuthorityTier: 0,
                    targetAuthorityTier: 0,
                    sourceOwnershipDomain: overlay.repoSource,
                    targetOwnershipDomain: 'unknown',
                    crossingType: 'unknown',
                    explicitlyAuthorized: false,
                    message: `Topological ghost hop detected! Missing cross-domain edge execution traversal anchoring explicitly across components.`
                  });
             }

             if (!targetNodeMeta && !nodeAuthorityRegistry[edge.target]) {
                 // Not found in local overlay AND not found in upstream processed overlays => Dangling
                  rawFindings.push({
                    ruleId: 'FED-008-MULTI-REPO-STITCHING-GAP',
                    severity: 'WARNING',
                    sourceNodeId: edge.source,
                    targetNodeId: edge.target,
                    sourceAuthorityTier: 0,
                    targetAuthorityTier: 0,
                    sourceOwnershipDomain: overlay.repoSource,
                    targetOwnershipDomain: 'unknown',
                    crossingType: 'unknown',
                    explicitlyAuthorized: false,
                    message: `Missing topology stitching anchors between repositories: Node '${edge.target}' is required by '${overlay.repoSource}' but undocumented across all active overlays.`
                  });
             }
        }
    }

    const sortedFindings = rawFindings.sort((a, b) => {
      if (a.sourceNodeId !== b.sourceNodeId) return a.sourceNodeId < b.sourceNodeId ? -1 : 1;
      if (a.targetNodeId !== b.targetNodeId) return a.targetNodeId < b.targetNodeId ? -1 : 1;
      return a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0;
    });

    return { 
       findingsString: stableCanonicalStringify(sortedFindings),
       diagnostics: {
           overlaySources: Array.from(diagSources).sort(),
           snapshotVersions: Array.from(diagVersions).sort(),
           policyNamespaces: Array.from(diagNamespaces).sort(),
           stitchAnchors: Array.from(diagAnchors).sort()
       }
    };
  }
}
