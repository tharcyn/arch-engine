/**
 * ═══════════════════════════════════════════════════════════
 *  Topology Layer Completeness Heatmap — Phase 2.7
 * ═══════════════════════════════════════════════════════════
 *
 *  Measures per-layer completeness at a finer granularity
 *  than coverage-index. Heatmap answers:
 *    - Which specific entity types have weak topology?
 *    - Where are the structural holes in the graph?
 *
 *  Supports: adapter insertion planning, governance confidence
 *  interpretation, topology reliability diagnostics.
 *
 *  Forward-portable to: @arch-engine/core/telemetry
 */

import type { CoverageIndex } from '../adapters/coverage-index';

// ─── Heatmap Cell ───────────────────────────────────────

export interface HeatmapCell {
  /** Completeness score (0.0 – 1.0) */
  completeness: number;

  /** Color band: 'red' | 'yellow' | 'green' */
  band: 'red' | 'yellow' | 'green';

  /** Number of entities in this cell */
  entity_count: number;

  /** Number of entities with relevant edges */
  entities_with_edges: number;

  /** Average edge density per entity */
  average_edge_density: number;

  /** Description of completeness state */
  description: string;
}

// ─── Heatmap ────────────────────────────────────────────

export interface TopologyCompletenessHeatmap {
  generated_at: string;

  /** Per-graph-layer completeness */
  layers: {
    entity_graph: HeatmapCell;
    surface_graph: HeatmapCell;
    handler_graph: HeatmapCell;
    authority_graph: HeatmapCell;
    contract_graph: HeatmapCell;
    event_graph: HeatmapCell;
    consumer_graph: HeatmapCell;
    callback_graph: HeatmapCell;
  };

  /** Per-entity-type completeness breakdown */
  entity_types: Record<string, HeatmapCell>;

  /** Overall heatmap score */
  overall_completeness: number;

  /** Structural holes: layers below threshold */
  structural_holes: Array<{
    layer: string;
    completeness: number;
    recommendation: string;
  }>;
}

// ─── Cell Builder ───────────────────────────────────────

function buildCell(
  entityCount: number,
  entitiesWithEdges: number,
  totalEdges: number,
  description: string,
): HeatmapCell {
  const completeness = entityCount > 0 ? entitiesWithEdges / entityCount : 0;
  const avgDensity = entityCount > 0 ? totalEdges / entityCount : 0;

  let band: 'red' | 'yellow' | 'green';
  if (completeness >= 0.70) band = 'green';
  else if (completeness >= 0.30) band = 'yellow';
  else band = 'red';

  return {
    completeness: Number(completeness.toFixed(4)),
    band,
    entity_count: entityCount,
    entities_with_edges: entitiesWithEdges,
    average_edge_density: Number(avgDensity.toFixed(2)),
    description,
  };
}

// ─── Heatmap Computation ────────────────────────────────

/**
 * Compute the topology completeness heatmap from the entity graph.
 *
 * @param adjacencyMap     Loaded entity adjacency map
 * @param routeServiceMap  Loaded route-service map
 * @param coverageIndex    Coverage index from Phase 1
 */
export function computeCompletenessHeatmap(
  adjacencyMap: Record<string, any>,
  routeServiceMap: any,
  coverageIndex: CoverageIndex,
): TopologyCompletenessHeatmap {
  const nodes = Object.entries(adjacencyMap);

  // ── Helper: count entities by prefix ──────────────────
  function byPrefix(prefix: string) {
    return nodes.filter(([_, v]) => (v.entity_id || '').startsWith(prefix + '_'));
  }

  function countEdges(entity: any, ...types: string[]): number {
    return types.reduce((sum, t) => sum + (entity[t] || []).length, 0);
  }

  // ── Entity graph (all entities) ───────────────────────
  const allEntities = nodes.length;
  const withAnyEdge = nodes.filter(([_, v]) =>
    countEdges(v, 'invokes', 'reads_from', 'writes_to', 'emits', 'subscribes_to', 'contracts_with', 'consumes', 'exposes') > 0,
  ).length;
  const totalEdges = nodes.reduce(
    (sum, [_, v]) => sum + countEdges(v, 'invokes', 'reads_from', 'writes_to', 'emits', 'subscribes_to', 'contracts_with', 'consumes', 'exposes'),
    0,
  );
  const entityGraph = buildCell(allEntities, withAnyEdge, totalEdges, `${withAnyEdge}/${allEntities} entities have at least one edge`);

  // ── Surface graph (routes + openapi) ──────────────────
  const routes = byPrefix('rte');
  const apis = byPrefix('api');
  const surfaceCount = routes.length + apis.length;
  const surfaceGraph = buildCell(surfaceCount, surfaceCount, surfaceCount, `${surfaceCount} surface entries (${routes.length} routes, ${apis.length} API specs)`);

  // ── Handler graph (routes with resolved controllers) ──
  const fwdMap = routeServiceMap?.forward || {};
  const totalHandlerRoutes = Object.keys(fwdMap).length;
  const resolvedHandlers = Object.values(fwdMap).filter((v: any) => v.controller_fqcn).length;
  const handlerEdges = Object.values(fwdMap).reduce(
    (sum: number, v: any) => sum + ((v.services_reachable || []).length || 0),
    0,
  );
  const handlerGraph = buildCell(totalHandlerRoutes, resolvedHandlers, handlerEdges, `${resolvedHandlers}/${totalHandlerRoutes} routes have resolved handler FQCNs`);

  // ── Authority graph ───────────────────────────────────
  const withAuthority = nodes.filter(([_, v]) => v.mutation_authority === true).length;
  const nonRouteNonApi = nodes.filter(([_, v]) => {
    const eid = v.entity_id || '';
    return !eid.startsWith('rte_') && !eid.startsWith('api_');
  }).length;
  const authorityGraph = buildCell(nonRouteNonApi, withAuthority, withAuthority, `${withAuthority}/${nonRouteNonApi} entities have authority metadata`);

  // ── Contract graph ────────────────────────────────────
  const apiSpecs = apis.length;
  const contractGraph = buildCell(routes.length, apiSpecs, apiSpecs, `${apiSpecs}/${routes.length} routes have OpenAPI contract coverage`);

  // ── Event graph ───────────────────────────────────────
  const events = byPrefix('evt');
  const listeners = byPrefix('lis');
  const withEventEdges = nodes.filter(([_, v]) =>
    (v.emits || []).length > 0 || (v.subscribes_to || []).length > 0,
  ).length;
  const totalEventEdges = nodes.reduce(
    (sum, [_, v]) => sum + (v.emits || []).length + (v.subscribes_to || []).length,
    0,
  );
  const eventGraph = buildCell(
    events.length + listeners.length,
    withEventEdges,
    totalEventEdges,
    `${events.length} events, ${listeners.length} listeners, ${withEventEdges} entities with event edges`,
  );

  // ── Consumer graph (frontend) ─────────────────────────
  const composables = byPrefix('cmp');
  const stores = byPrefix('str');
  const frontendRoutes = byPrefix('frt');
  const frontendTotal = composables.length + stores.length;
  const frontendWithEdges = nodes.filter(([_, v]) => {
    const eid = v.entity_id || '';
    return (eid.startsWith('cmp_') || eid.startsWith('str_')) &&
      countEdges(v, 'invokes', 'consumes', 'reads_from') > 0;
  }).length;
  const consumerGraph = buildCell(frontendTotal, frontendWithEdges, frontendWithEdges, `${frontendWithEdges}/${frontendTotal} frontend consumers have edges`);

  // ── Callback graph ────────────────────────────────────
  const callbackRoutes = routes.filter(([k]) => k.includes('callback') || k.includes('webhook'));
  const callbackGraph = buildCell(
    callbackRoutes.length,
    callbackRoutes.length,
    callbackRoutes.length,
    `${callbackRoutes.length} callback/webhook routes identified`,
  );

  // ── Per-entity-type completeness ──────────────────────
  const typeMap: Record<string, { prefix: string; label: string }> = {
    model: { prefix: 'mdl', label: 'Model' },
    service: { prefix: 'svc', label: 'Service' },
    controller: { prefix: 'ctrl', label: 'Controller' },
    event: { prefix: 'evt', label: 'Event' },
    listener: { prefix: 'lis', label: 'Listener' },
    job: { prefix: 'job', label: 'Job' },
    composable: { prefix: 'cmp', label: 'Composable' },
    store: { prefix: 'str', label: 'Store' },
    route: { prefix: 'rte', label: 'Route' },
    openapi_path: { prefix: 'api', label: 'OpenAPI Path' },
    frontend_route: { prefix: 'frt', label: 'Frontend Route' },
  };

  const entityTypes: Record<string, HeatmapCell> = {};
  for (const [typeName, { prefix, label }] of Object.entries(typeMap)) {
    const typeEntities = byPrefix(prefix);
    const withEdges = typeEntities.filter(([_, v]) =>
      countEdges(v, 'invokes', 'reads_from', 'writes_to', 'emits', 'subscribes_to') > 0,
    ).length;
    const edgeCount = typeEntities.reduce(
      (sum, [_, v]) => sum + countEdges(v, 'invokes', 'reads_from', 'writes_to', 'emits', 'subscribes_to'),
      0,
    );
    entityTypes[typeName] = buildCell(typeEntities.length, withEdges, edgeCount, `${label}: ${withEdges}/${typeEntities.length} with edges`);
  }

  // ── Structural holes ──────────────────────────────────
  const allLayers: Record<string, HeatmapCell> = {
    entity_graph: entityGraph,
    surface_graph: surfaceGraph,
    handler_graph: handlerGraph,
    authority_graph: authorityGraph,
    contract_graph: contractGraph,
    event_graph: eventGraph,
    consumer_graph: consumerGraph,
    callback_graph: callbackGraph,
  };

  const structuralHoles = Object.entries(allLayers)
    .filter(([_, cell]) => cell.band === 'red')
    .map(([layer, cell]) => ({
      layer,
      completeness: cell.completeness,
      recommendation: `Consider adding adapter coverage for ${layer.replace('_', ' ')} — currently at ${(cell.completeness * 100).toFixed(0)}%`,
    }))
    .sort((a, b) => a.completeness - b.completeness);

  const layerScores = Object.values(allLayers).map(l => l.completeness);
  const overall = layerScores.reduce((a, b) => a + b, 0) / layerScores.length;

  return {
    generated_at: 'baseline',
    layers: allLayers as TopologyCompletenessHeatmap['layers'],
    entity_types: entityTypes,
    overall_completeness: Number(overall.toFixed(4)),
    structural_holes: structuralHoles,
  };
}
