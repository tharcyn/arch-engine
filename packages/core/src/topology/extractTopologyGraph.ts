import type { ValidatorTopologyView } from './validator-topology-view';
import type { TopologyGraph } from './TopologyGraph';
import { computeGraphSurfaceHash } from './computeGraphSurfaceHash';

export function extractTopologyGraph(
  view: ValidatorTopologyView
): TopologyGraph {
  const nodes = [
    Object.freeze({
      id: "dataset_identity",
      type: "dataset_identity",
      metadata: Object.freeze({ ...view.identity })
    }),
    Object.freeze({
      id: "schema_version",
      type: "schema_version",
      metadata: Object.freeze({ version: view.schemaVersion })
    }),
    Object.freeze({
      id: "capability_manifest",
      type: "capability_manifest",
      metadata: Object.freeze({ ...view.capabilities.manifest })
    }),
    Object.freeze({
      id: "policy_pack_compatibility",
      type: "policy_pack_compatibility",
      metadata: Object.freeze({ ...view.capabilities.policyPackCompatibility })
    })
  ];

  const edges = [
    Object.freeze({
      from: "dataset_identity",
      to: "schema_version",
      type: "declares_schema_version"
    }),
    Object.freeze({
      from: "dataset_identity",
      to: "capability_manifest",
      type: "declares_capability_manifest"
    }),
    Object.freeze({
      from: "dataset_identity",
      to: "policy_pack_compatibility",
      type: "declares_policy_pack_compatibility"
    })
  ];

  const graphSurfaceHash = computeGraphSurfaceHash(nodes, edges);

  return Object.freeze({
    graphSurfaceVersion: "1.0.0",
    graphSurfaceHash,
    nodes: Object.freeze(nodes) as any,
    edges: Object.freeze(edges) as any,
  });
}
