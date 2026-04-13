/**
 * ═══════════════════════════════════════════════════════════
 *  Confidence Propagation Engine — Phase 2.5 Substrate Hardening
 * ═══════════════════════════════════════════════════════════
 *
 *  Side-car implementation: does NOT modify existing traversal
 *  or reachable_from_routes().
 *
 *  Computes path-level confidence scores by analyzing edge
 *  confidence along traversal paths.
 *
 *  Forward-portable to: @arch-engine/core/traversal
 */

import {
  type EdgeConfidenceLevel,
  type EdgeConfidenceMetadata,
  CONFIDENCE_SCORE_MAP,
  getConfidenceScore,
} from '../confidence/edge-confidence';

import {
  AdapterCapabilityRegistry,
} from '../adapters/capability-registry';

import {
  getBestLevel,
} from '../adapters/coverage-index';

// ─── Propagation Strategies ─────────────────────────────

export type PropagationStrategy =
  | 'minimum'           // Path confidence = lowest edge confidence (conservative)
  | 'multiplicative'    // Path confidence = product of edge confidences
  | 'average'           // Path confidence = mean of edge confidences
  | 'consensus_boost';  // Path confidence = boosted by multi-adapter confirmation

// ─── Edge Reference ─────────────────────────────────────

export interface EdgeRef {
  source: string;
  target: string;
  type: string;
  confidence?: EdgeConfidenceLevel;
  confidence_score?: number;
  confidence_source?: string;
}

// ─── Path Confidence Result ─────────────────────────────

export interface PathConfidenceResult {
  /** Entities in the traversal path, in order */
  path: string[];

  /** Edges traversed */
  edges: EdgeRef[];

  /** Computed path confidence score */
  confidence_score: number;

  /** Strategy used to compute the score */
  strategy: PropagationStrategy;

  /** Individual edge scores used in computation */
  edge_scores: number[];

  /** Confidence sources contributing to this path */
  sources: string[];
}

// ─── Reachability Entry ─────────────────────────────────

export interface ConfidenceAwareReachabilityEntry {
  entity: string;
  entity_id: string;
  reachable_from: string;
  path_confidence: number;
  path_length: number;
  strategy: PropagationStrategy;
  edge_scores: number[];
  confidence_sources: string[];
  
  /** Indicates if this traversal path is reliable. True unless traversing through known blind spots. */
  isConclusive: boolean;
}

// ─── Propagation Engine ─────────────────────────────────

/**
 * Compute confidence for a single traversal path.
 *
 * @param path   Array of entity identifiers in traversal order
 * @param edges  Edges connecting consecutive entities in the path
 * @param strategy Propagation strategy to use
 * @returns Path confidence result
 */
export function computePathConfidence(
  path: string[],
  edges: EdgeRef[],
  strategy: PropagationStrategy = 'minimum',
): PathConfidenceResult {
  if (edges.length === 0) {
    return {
      path,
      edges,
      confidence_score: 1.0,
      strategy,
      edge_scores: [],
      sources: [],
    };
  }

  const edgeScores = edges.map(e =>
    e.confidence_score ?? getConfidenceScore(e.confidence),
  );

  const sources = [...new Set(
    edges.map(e => e.confidence_source).filter(Boolean) as string[],
  )];

  let score: number;

  switch (strategy) {
    case 'minimum':
      score = Math.min(...edgeScores);
      break;

    case 'multiplicative':
      score = edgeScores.reduce((acc, s) => acc * s, 1.0);
      break;

    case 'average':
      score = edgeScores.reduce((acc, s) => acc + s, 0) / edgeScores.length;
      break;

    case 'consensus_boost': {
      // Start with minimum, then boost if multiple sources confirm
      const base = Math.min(...edgeScores);
      const uniqueSources = sources.length;
      const boost = uniqueSources > 1 ? 0.05 * (uniqueSources - 1) : 0;
      score = Math.min(1.0, base + boost);
      break;
    }

    default:
      score = Math.min(...edgeScores);
  }

  return {
    path,
    edges,
    confidence_score: Number(score.toFixed(4)),
    strategy,
    edge_scores: edgeScores,
    sources,
  };
}

/**
 * Compute confidence-aware reachability from an adjacency map.
 *
 * This is a SIDE-CAR computation — it does NOT replace
 * reachable_from_routes in the adjacency map. It produces a
 * parallel index that can be consumed by governance gates.
 *
 * @param adjacencyMap The existing entity adjacency map
 * @param strategy     Propagation strategy
 * @param registry     Capabilities registry (for coverage gap awareness)
 * @returns            Confidence-aware reachability index
 */
export function getConfidenceAwareReachability(
  adjacencyMap: Record<string, any>,
  strategy: PropagationStrategy = 'minimum',
  registry: AdapterCapabilityRegistry = new AdapterCapabilityRegistry(),
): ConfidenceAwareReachabilityEntry[] {
  const entries: ConfidenceAwareReachabilityEntry[] = [];

  // Determine low coverage zones that would invalidate reachability assertions
  const eventCoverage = getBestLevel('eventEdges', registry);
  const dataAccessCoverage = getBestLevel('dataAccessEdges', registry);
  const invocationCoverage = getBestLevel('invocationEdges', registry);
  const mutationCoverage = getBestLevel('mutationTopology', registry);
  
  // Extended blind spot map: covers ALL edge types that should
  // trigger isConclusive=false when the corresponding capability is 'none'.
  // Previously only covered 5 types; now covers 20+.
  const blindSpots: Record<string, boolean> = {
    // Event topology
    'emits': eventCoverage.level === 'none',
    'subscribes_to': eventCoverage.level === 'none',
    // Data access (raw)
    'reads_from': dataAccessCoverage.level === 'none',
    'writes_to': dataAccessCoverage.level === 'none',
    'consumes': dataAccessCoverage.level === 'none',
    // Invocation
    'invokes': invocationCoverage.level === 'none',
    'handler_invokes_service': invocationCoverage.level === 'none',
    'service_invokes_repository': invocationCoverage.level === 'none',
    'service_invokes_action': invocationCoverage.level === 'none',
    'service_dispatches_job': invocationCoverage.level === 'none',
    'service_emits_event': invocationCoverage.level === 'none',
    'listener_invokes_service': invocationCoverage.level === 'none',
    'job_invokes_service': invocationCoverage.level === 'none',
    'action_invokes_service': invocationCoverage.level === 'none',
    'repository_invokes_model': invocationCoverage.level === 'none',
    // Mutation types (abstract)
    'reads_state': mutationCoverage.level === 'none',
    'writes_state': mutationCoverage.level === 'none',
    'creates_state': mutationCoverage.level === 'none',
    'deletes_state': mutationCoverage.level === 'none',
    'async_state_change': mutationCoverage.level === 'none',
    'dispatches_state_change': mutationCoverage.level === 'none',
    'eventual_state_change': mutationCoverage.level === 'none',
    // Data access (concrete)
    'repository_read': dataAccessCoverage.level === 'none',
    'repository_write': dataAccessCoverage.level === 'none',
    'cache_read': dataAccessCoverage.level === 'none',
    'cache_write': dataAccessCoverage.level === 'none',
    'external_read': dataAccessCoverage.level === 'none',
    'external_write': dataAccessCoverage.level === 'none',
  };

  for (const [entityKey, node] of Object.entries(adjacencyMap)) {
    const reachableRoutes: string[] = node.reachable_from_routes || [];

    for (const routeKey of reachableRoutes) {
      // Build the full edge path: route → handler → entity dependencies
      const edges: EdgeRef[] = [];

      // Route → handler edge (runtime verified - from artisan route:list)
      edges.push({
        source: routeKey,
        target: entityKey,
        type: 'invokes',
        confidence: 'runtime_verified',
        confidence_score: CONFIDENCE_SCORE_MAP.runtime_verified,
        confidence_source: 'scan_routes.php',
      });

      // Collect ALL dependency edges from this entity for multi-hop scoring
      const edgeTypes = [
        'invokes', 'reads_from', 'writes_to', 'emits', 'subscribes_to',
        'reads_state', 'writes_state', 'creates_state', 'deletes_state',
        'repository_read', 'repository_write', 'cache_read', 'cache_write',
        'external_read', 'external_write', 'dispatches_state_change',
        'eventual_state_change', 'async_state_change'
      ];
      for (const edgeType of edgeTypes) {
        const targets: string[] = node[edgeType] || [];
        for (const target of targets) {
          edges.push({
            source: entityKey,
            target,
            type: edgeType,
            confidence: 'namespace_inferred',
            confidence_score: CONFIDENCE_SCORE_MAP.namespace_inferred,
            confidence_source: 'adjacency_builder',
          });
        }
      }

      // MULTI-HOP: Use ALL edges for path-level confidence computation
      // Previously this was [edges[0]] — only the direct route→handler edge.
      // Now the full dependency chain participates in confidence scoring.
      const pathResult = computePathConfidence(
        [routeKey, entityKey, ...edges.slice(1).map(e => e.target)],
        edges,
        strategy,
      );

      // Compute actual path length from the edge chain
      const actualPathLength = edges.length;

      // Evaluate path conclusiveness: if ANY edge type resides in a blind spot
      const isPathConclusive = !edges.some(e => blindSpots[e.type] === true);

      entries.push({
        entity: entityKey,
        entity_id: node.entity_id || '',
        reachable_from: routeKey,
        path_confidence: pathResult.confidence_score,
        path_length: actualPathLength,
        strategy,
        edge_scores: pathResult.edge_scores,
        confidence_sources: pathResult.sources,
        isConclusive: isPathConclusive,
      });
    }
  }

  // Sort for determinism
  entries.sort((a, b) => {
    const cmp = a.entity < b.entity ? -1 : a.entity > b.entity ? 1 : 0;
    if (cmp !== 0) return cmp;
    return a.reachable_from < b.reachable_from ? -1 : a.reachable_from > b.reachable_from ? 1 : 0;
  });

  return entries;
}
