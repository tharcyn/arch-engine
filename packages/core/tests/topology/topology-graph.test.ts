import { expect, test, describe } from 'vitest';
import { extractTopologyGraph } from '../../src/topology/extractTopologyGraph';
import { buildTopologyGraphIndex } from '../../src/topology/buildTopologyGraphIndex';
import { getDirectNeighbors, hasPath, getReachableNodeIds } from '../../src/topology/topologyGraphReachability';
import { getNodeById, getOutgoingEdges, getIncomingEdges } from '../../src/topology/topologyGraphTraversal';
import { validateNodeExists, validateRequiredEdge, validateReachability, validateRequiredNeighbors } from '../../src/topology/topologyGraphValidatorUtilities';
import type { ValidatorTopologyView } from '../../src/topology/validator-topology-view';

describe('Phase 3 Topology Structural Parsing Layer', () => {
  const dummyView: ValidatorTopologyView = {
    projectionSurfaceVersion: '1.0.0',
    projectionSurfaceHash: 'dummy',
    datasetPath: '/dummy',
    datasetSemver: '1.0.0',
    schemaVersion: '1.0.0',
    identity: {
      dataset_id: 'test',
      dataset_semver: '1.0.0',
      dataset_producer_version: '1.0'
    },
    capabilities: {
      manifest: {
        supports_authority_scope: true,
        supports_directionality: false
      },
      policyPackCompatibility: {},
      supportedPolicyPacks: {},
      requiredCapabilities: []
    }
  } as any;

  test('metadata_graph_contains_expected_nodes', () => {
    const graph1 = extractTopologyGraph(dummyView);

    expect(graph1.graphSurfaceVersion).toBe('1.0.0');
    expect(Array.isArray(graph1.nodes)).toBe(true);
    expect(Array.isArray(graph1.edges)).toBe(true);
    
    // Structure verification (4 nodes, 3 edges)
    expect(graph1.nodes.length).toBe(4);
    expect(graph1.edges.length).toBe(3);

    // Node id verifications matching expected structural ordering
    expect(graph1.nodes[0].id).toBe('dataset_identity');
    expect(graph1.nodes[1].id).toBe('schema_version');
    expect(graph1.nodes[2].id).toBe('capability_manifest');
    expect(graph1.nodes[3].id).toBe('policy_pack_compatibility');

    // Expected routing verification across edges
    expect(graph1.edges[0]).toEqual({ from: 'dataset_identity', to: 'schema_version', type: 'declares_schema_version' });
    expect(graph1.edges[1]).toEqual({ from: 'dataset_identity', to: 'capability_manifest', type: 'declares_capability_manifest' });
    expect(graph1.edges[2]).toEqual({ from: 'dataset_identity', to: 'policy_pack_compatibility', type: 'declares_policy_pack_compatibility' });
    
    // Arrays should be structurally frozen (readonly compatible runtime assertion)
    expect(Object.isFrozen(graph1.nodes)).toBe(true);
    expect(Object.isFrozen(graph1.edges)).toBe(true);
    expect(Object.isFrozen(graph1)).toBe(true);
  });

  test('metadata_graph_is_deterministic', () => {
    const graph1 = extractTopologyGraph(dummyView);
    const graph2 = extractTopologyGraph(dummyView);

    // Test determinism deep equality natively matches identically
    expect(graph1).toEqual(graph2);
  });

  test('metadata_graph_does_not_reference_projection_objects', () => {
    const view = JSON.parse(JSON.stringify(dummyView)) as ValidatorTopologyView;
    const graph = extractTopologyGraph(view);

    // Mutate view identically following extracting structure safely 
    (view as any).schemaVersion = '99.9.9';
    (view.capabilities.manifest as any).supports_authority_scope = false;
    
    // Nodes should strictly maintain disconnected representations directly
    expect((graph.nodes[1].metadata as any).version).toBe('1.0.0');
    expect((graph.nodes[2].metadata as any).supports_authority_scope).toBe(true);
  });

  test('graph_surface_hash_is_deterministic', () => {
    const graph1 = extractTopologyGraph(dummyView);
    const graph2 = extractTopologyGraph(dummyView);

    expect(graph1.graphSurfaceHash).toEqual(graph2.graphSurfaceHash);
    expect(typeof graph1.graphSurfaceHash).toBe('string');
  });

  test('graph_surface_hash_changes_when_node_changes', () => {
    const graph1 = extractTopologyGraph(dummyView);
    
    // Mutate and test difference securely
    const view2 = JSON.parse(JSON.stringify(dummyView)) as ValidatorTopologyView;
    (view2.capabilities.manifest as any).supports_authority_scope = false;
    const graph2 = extractTopologyGraph(view2);
    
    expect(graph1.graphSurfaceHash).not.toEqual(graph2.graphSurfaceHash);
  });

  test('get_node_by_id_returns_expected_node', () => {
    const graph = extractTopologyGraph(dummyView);
    const node = getNodeById(graph, 'dataset_identity');
    expect(node).toBeDefined();
    expect(node?.id).toBe('dataset_identity');

    const missing = getNodeById(graph, 'hacked');
    expect(missing).toBeUndefined();
  });

  test('get_outgoing_edges_returns_expected_edges', () => {
    const graph = extractTopologyGraph(dummyView);
    const edges = getOutgoingEdges(graph, 'dataset_identity');
    
    expect(edges.length).toBe(3);
    expect(edges[0].from).toBe('dataset_identity');
    
    const missing = getOutgoingEdges(graph, 'schema_version');
    expect(missing.length).toBe(0);
  });

  test('get_incoming_edges_returns_expected_edges', () => {
    const graph = extractTopologyGraph(dummyView);
    const edges = getIncomingEdges(graph, 'schema_version');
    
    expect(edges.length).toBe(1);
    expect(edges[0].to).toBe('schema_version');
    
    const missing = getIncomingEdges(graph, 'dataset_identity');
    expect(missing.length).toBe(0);
  });

  test('graph_index_builds_successfully', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    
    // Nodes indexed correctly
    expect(index.nodesById.get('dataset_identity')?.type).toBe('dataset_identity');
    expect(index.nodesById.get('schema_version')?.type).toBe('schema_version');
    
    // Edges indexed correctly
    expect(index.outgoingByNodeId.get('dataset_identity')?.length).toBe(3);
    expect(index.incomingByNodeId.get('schema_version')?.length).toBe(1);
    expect(index.outgoingByNodeId.get('schema_version')).toBeUndefined();
  });

  test('reachable_nodes_detected_correctly', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    
    const neighbors = getDirectNeighbors(index, 'dataset_identity');
    expect(neighbors.length).toBe(3);
    
    const reachable = getReachableNodeIds(index, 'dataset_identity');
    expect(reachable.length).toBe(3);
    expect(reachable.includes('schema_version')).toBe(true);
  });

  test('path_detection_is_correct', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    
    expect(hasPath(index, 'dataset_identity', 'schema_version')).toBe(true);
    expect(hasPath(index, 'schema_version', 'dataset_identity')).toBe(false);
    expect(hasPath(index, 'dataset_identity', 'dataset_identity')).toBe(true);
  });

  test('cycle_handling_safe', () => {
    const graph = extractTopologyGraph(dummyView);
    // Mutate graph secretly to test cycle
    const cycledNodes = [...graph.nodes];
    const cycledEdges = [...graph.edges, { from: 'schema_version', to: 'dataset_identity', type: 'cycle' }];
    const cycledGraph = { ...graph, edges: cycledEdges, nodes: cycledNodes } as any;
    
    const index = buildTopologyGraphIndex(cycledGraph);
    
    // Must not infinite loop
    const reachable = getReachableNodeIds(index, 'dataset_identity');
    expect(reachable.length).toBe(3); // visits all nodes safely
    
    expect(hasPath(index, 'schema_version', 'capability_manifest')).toBe(true);
  });

  test('validate_node_exists_succeeds_for_known_node', () => {
    const graph = extractTopologyGraph(dummyView);
    const result = validateNodeExists(graph, 'dataset_identity');
    expect(result.success).toBe(true);
    expect(result.code).toBe('NODE_EXISTS');
  });

  test('validate_node_exists_fails_for_unknown_node', () => {
    const graph = extractTopologyGraph(dummyView);
    const result = validateNodeExists(graph, 'missing_node_x');
    expect(result.success).toBe(false);
    expect(result.code).toBe('NODE_MISSING');
  });

  test('validate_required_edge_succeeds_when_edge_exists', () => {
    const graph = extractTopologyGraph(dummyView);
    const result = validateRequiredEdge(graph, 'dataset_identity', 'schema_version', 'declares_schema_version');
    expect(result.success).toBe(true);
    expect(result.code).toBe('EDGE_EXISTS');
  });

  test('validate_required_edge_fails_when_edge_missing', () => {
    const graph = extractTopologyGraph(dummyView);
    const result = validateRequiredEdge(graph, 'schema_version', 'dataset_identity', 'declares_schema_version');
    expect(result.success).toBe(false);
    expect(result.code).toBe('EDGE_MISSING');
  });

  test('validate_reachability_succeeds_when_path_exists', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    const result = validateReachability(index, 'dataset_identity', 'schema_version');
    expect(result.success).toBe(true);
    expect(result.code).toBe('PATH_EXISTS');
  });

  test('validate_reachability_fails_when_path_missing', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    const result = validateReachability(index, 'schema_version', 'dataset_identity');
    expect(result.success).toBe(false);
    expect(result.code).toBe('PATH_MISSING');
  });

  test('validate_required_neighbors_succeeds_when_neighbors_match', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    const result = validateRequiredNeighbors(index, 'dataset_identity', ['schema_version', 'capability_manifest']);
    expect(result.success).toBe(true);
    expect(result.code).toBe('NEIGHBORS_MATCH');
  });

  test('validate_required_neighbors_fails_when_neighbors_missing', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    const result = validateRequiredNeighbors(index, 'dataset_identity', ['schema_version', 'missing_neighbor_y']);
    expect(result.success).toBe(false);
    expect(result.code).toBe('NEIGHBORS_MISSING');
  });

  test('validate_required_neighbors_ignores_expected_order', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    
    const result1 = validateRequiredNeighbors(index, 'dataset_identity', ['schema_version', 'capability_manifest']);
    const result2 = validateRequiredNeighbors(index, 'dataset_identity', ['capability_manifest', 'schema_version']);
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    
    // Test deterministic error message rendering independent of input order
    const err1 = validateRequiredNeighbors(index, 'dataset_identity', ['missing_b', 'missing_a']);
    const err2 = validateRequiredNeighbors(index, 'dataset_identity', ['missing_a', 'missing_b']);
    expect(err1.message).toBe(err2.message);
  });

  test('validate_reachability_is_cycle_safe', () => {
    const graph = extractTopologyGraph(dummyView);
    // Bind cyclic dependencies natively evaluating structure mappings safely
    const cycledNodes = [...graph.nodes];
    const cycledEdges = [...graph.edges, { from: 'schema_version', to: 'dataset_identity', type: 'cycle' }];
    const cycledGraph = { ...graph, edges: cycledEdges, nodes: cycledNodes } as any;
    
    const index = buildTopologyGraphIndex(cycledGraph);
    const result = validateReachability(index, 'dataset_identity', 'capability_manifest');
    expect(result.success).toBe(true);
  });

  test('graph_validator_utilities_do_not_mutate_inputs', () => {
    const graph = extractTopologyGraph(dummyView);
    const index = buildTopologyGraphIndex(graph);
    
    const originalNodesLength = graph.nodes.length;
    const originalEdgesLength = graph.edges.length;
    const originalHash = graph.graphSurfaceHash;

    validateNodeExists(graph, 'dataset_identity');
    validateRequiredEdge(graph, 'dataset_identity', 'schema_version', 'declares_schema_version');
    validateReachability(index, 'dataset_identity', 'schema_version');
    validateRequiredNeighbors(index, 'dataset_identity', ['schema_version']);

    // Ensures arrays and internal pointers remain pure and synchronous without memory leakage or mapping overlaps
    expect(graph.nodes.length).toBe(originalNodesLength);
    expect(graph.edges.length).toBe(originalEdgesLength);
    expect(graph.graphSurfaceHash).toBe(originalHash);
  });
});

