/**
 * ═══════════════════════════════════════════════════════════
 *  Adapter Capability Coverage Index — Phase 2.7
 * ═══════════════════════════════════════════════════════════
 *
 *  Answers: "Which topology layer lacks evidence?"
 *
 *  Derives per-layer coverage scores from:
 *    - adapter capability registry (declared capabilities)
 *    - generated output files (realized data)
 *    - entity graph density (observed edges per type)
 *    - confidence index (evidence quality)
 *
 *  Forward-portable to: @arch-engine/core/telemetry
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  type CapabilityMap,
  type CoverageLevel,
  AdapterCapabilityRegistry,
} from '../adapters/capability-registry';

// ─── Coverage Layer ─────────────────────────────────────

export interface CoverageLayerScore {
  /** Coverage score (0.0 – 1.0) */
  score: number;

  /** Adapters contributing to this layer */
  contributing_adapters: string[];

  /** Best declared capability level across all adapters */
  best_declared_level: CoverageLevel;

  /** Number of entities/edges observed for this layer */
  observed_count: number;

  /** Total possible entities (if determinable) */
  total_possible: number;

  /** Evidence quality: average confidence of edges in this layer */
  evidence_quality: number;

  /** Human-readable gap description */
  gap_description: string;
}

// ─── Coverage Index ─────────────────────────────────────

export interface CoverageIndex {
  generated_at: string;

  /** Per-topology-layer coverage scores */
  layers: {
    surface_topology: CoverageLayerScore;
    handler_resolution: CoverageLayerScore;
    invocation_edges: CoverageLayerScore;
    authority_metadata: CoverageLayerScore;
    contract_topology: CoverageLayerScore;
    event_topology: CoverageLayerScore;
    frontend_consumers: CoverageLayerScore;
    data_access_edges: CoverageLayerScore;
  };

  /** Overall coverage score */
  overall_coverage: number;

  /** Ordered list of layers by gap severity (worst first) */
  gap_priority: Array<{
    layer: string;
    score: number;
    gap_description: string;
  }>;
}

// ─── Coverage Computation ───────────────────────────────

const LEVEL_SCORES: Record<CoverageLevel, number> = {
  none: 0.0,
  unknown: 0.1,
  partial: 0.5,
  full: 1.0,
};

export function getBestLevel(
  capability: keyof CapabilityMap,
  registry: AdapterCapabilityRegistry,
): { level: CoverageLevel; adapters: string[] } {
  const allAdapters = registry.getAll();
  let bestLevel: CoverageLevel = 'none';
  const contributors: string[] = [];

  const levelOrder: CoverageLevel[] = ['none', 'unknown', 'partial', 'full'];

  for (const adapter of allAdapters) {
    const adapterLevel = adapter.capabilities[capability];
    if (levelOrder.indexOf(adapterLevel) > levelOrder.indexOf(bestLevel)) {
      bestLevel = adapterLevel;
    }
    if (adapterLevel !== 'none') {
      contributors.push(adapter.adapter_id);
    }
  }

  return { level: bestLevel, adapters: contributors };
}

/**
 * Compute the coverage index from adapter registry and generated data.
 *
 * @param registry     Adapter capability registry
 * @param generatedDir Path to generated/ directory
 * @param adjacencyMap Loaded entity adjacency map
 * @param routeServiceMap Loaded route-service map
 */
export function computeCoverageIndex(
  registry: AdapterCapabilityRegistry,
  generatedDir: string,
  adjacencyMap: Record<string, any>,
  routeServiceMap: any,
): CoverageIndex {

  // ── Surface topology ──────────────────────────────────
  const surfaceInfo = getBestLevel('surfaceTopology', registry);
  const routeCount = Object.keys(adjacencyMap).filter(k => {
    const node = adjacencyMap[k];
    return (node.entity_id || '').startsWith('rte_');
  }).length;
  const openapiCount = Object.keys(adjacencyMap).filter(k => {
    const node = adjacencyMap[k];
    return (node.entity_id || '').startsWith('api_');
  }).length;
  const totalSurfaces = routeCount + openapiCount;

  const surfaceScore = totalSurfaces > 0
    ? Math.min(1.0, LEVEL_SCORES[surfaceInfo.level] * (routeCount > 0 ? 1 : 0.5))
    : 0;

  const surfaceTopology: CoverageLayerScore = {
    score: Number(surfaceScore.toFixed(2)),
    contributing_adapters: surfaceInfo.adapters,
    best_declared_level: surfaceInfo.level,
    observed_count: routeCount,
    total_possible: totalSurfaces,
    evidence_quality: 0.90, // Routes are runtime-verified
    gap_description: surfaceScore >= 0.95
      ? 'Full surface topology coverage'
      : `${totalSurfaces - routeCount} surfaces without route scanner coverage`,
  };

  // ── Handler resolution ────────────────────────────────
  const handlerInfo = getBestLevel('handlerResolution', registry);
  const fwdMap = routeServiceMap?.forward || {};
  const totalRoutes = Object.keys(fwdMap).length;
  const resolvedHandlers = Object.values(fwdMap).filter(
    (v: any) => v.controller_fqcn,
  ).length;
  const handlerRatio = totalRoutes > 0 ? resolvedHandlers / totalRoutes : 0;

  const handlerResolution: CoverageLayerScore = {
    score: Number(handlerRatio.toFixed(2)),
    contributing_adapters: handlerInfo.adapters,
    best_declared_level: handlerInfo.level,
    observed_count: resolvedHandlers,
    total_possible: totalRoutes,
    evidence_quality: 0.90,
    gap_description: handlerRatio >= 0.95
      ? 'Full handler resolution coverage'
      : `${totalRoutes - resolvedHandlers}/${totalRoutes} routes without resolved handler FQCN`,
  };

  // ── Invocation edges ──────────────────────────────────
  const invocationInfo = getBestLevel('invocationEdges', registry);
  const entitiesWithInvocations = Object.values(adjacencyMap).filter(
    (v: any) => (v.invokes || []).length > 0,
  ).length;
  const totalNonRouteEntities = Object.values(adjacencyMap).filter(
    (v: any) => !(v.entity_id || '').startsWith('rte_') && !(v.entity_id || '').startsWith('api_'),
  ).length;
  const invocationRatio = totalNonRouteEntities > 0
    ? entitiesWithInvocations / totalNonRouteEntities
    : 0;

  const invocationEdges: CoverageLayerScore = {
    score: Number(Math.min(1.0, invocationRatio * LEVEL_SCORES[invocationInfo.level] / 0.5).toFixed(2)),
    contributing_adapters: invocationInfo.adapters,
    best_declared_level: invocationInfo.level,
    observed_count: entitiesWithInvocations,
    total_possible: totalNonRouteEntities,
    evidence_quality: invocationInfo.level === 'full' ? 0.95 : 0.75,
    gap_description: invocationInfo.level === 'full'
      ? 'Adapter explicitly provides structured invocation topology'
      : (invocationRatio >= 0.50
        ? `${entitiesWithInvocations}/${totalNonRouteEntities} entities with invocation edges`
        : `Only ${entitiesWithInvocations}/${totalNonRouteEntities} entities have invocation edges`),
  };

  // ── Authority metadata ────────────────────────────────
  const authorityInfo = getBestLevel('authorityMetadata', registry);
  const authorityFile = path.join(generatedDir, 'declared-authority-index.json');
  let authorityCount = 0;
  if (fs.existsSync(authorityFile)) {
    try {
      const auth = JSON.parse(fs.readFileSync(authorityFile, 'utf-8'));
      authorityCount = (auth.declared_authorities || []).length;
    } catch { /* ignore */ }
  }
  const entitiesWithAuthority = Object.values(adjacencyMap).filter(
    (v: any) => v.mutation_authority === true,
  ).length;
  const authorityTotal = totalNonRouteEntities;
  const authorityRatio = authorityTotal > 0
    ? (authorityCount + entitiesWithAuthority) / authorityTotal
    : 0;

  const authorityMetadata: CoverageLayerScore = {
    score: Number(Math.min(1.0, Math.max(authorityRatio, LEVEL_SCORES[authorityInfo.level])).toFixed(2)),
    contributing_adapters: authorityInfo.adapters,
    best_declared_level: authorityInfo.level,
    observed_count: authorityCount + entitiesWithAuthority,
    total_possible: authorityTotal,
    evidence_quality: 1.00, // Manual override = highest confidence
    gap_description: authorityInfo.level === 'full'
      ? 'Adapter provides full authority metadata coverage'
      : `Only partial coverage (${authorityCount} authorities declared)`,
  };

  // ── Contract topology ─────────────────────────────────
  const contractInfo = getBestLevel('contractSurface', registry);
  const contractFile = path.join(generatedDir, 'declared-contract-index.json');
  let contractCount = 0;
  if (fs.existsSync(contractFile)) {
    try {
      const contracts = JSON.parse(fs.readFileSync(contractFile, 'utf-8'));
      if (contracts.declared_contracts) contractCount = contracts.declared_contracts.length;
      else if (Array.isArray(contracts)) contractCount = contracts.length;
    } catch { /* ignore */ }
  }
  const contractRatio = openapiCount > 0 ? Math.min(1.0, openapiCount / Math.max(routeCount, 1)) : 0;

  const contractTopology: CoverageLayerScore = {
    score: Number(Math.min(1.0, contractRatio * LEVEL_SCORES[contractInfo.level]).toFixed(2)),
    contributing_adapters: contractInfo.adapters,
    best_declared_level: contractInfo.level,
    observed_count: openapiCount,
    total_possible: routeCount,
    evidence_quality: 0.95,
    gap_description: contractRatio >= 0.80
      ? `${openapiCount}/${routeCount} routes have OpenAPI contract coverage`
      : `Only ${openapiCount}/${routeCount} routes have OpenAPI contracts`,
  };

  // ── Event topology ────────────────────────────────────
  const eventInfo = getBestLevel('eventEdges', registry);
  const entitiesWithEvents = Object.values(adjacencyMap).filter(
    (v: any) => (v.emits || []).length > 0 || (v.subscribes_to || []).length > 0,
  ).length;
  const eventEntities = Object.values(adjacencyMap).filter(
    (v: any) => (v.entity_id || '').startsWith('evt_') || (v.entity_id || '').startsWith('lis_'),
  ).length;
  const eventTotal = entitiesWithEvents + eventEntities;
  const serviceAndCtrl = Object.values(adjacencyMap).filter(
    (v: any) => (v.entity_id || '').startsWith('svc_') || (v.entity_id || '').startsWith('ctrl_'),
  ).length;
  const eventRatio = serviceAndCtrl > 0 ? eventTotal / serviceAndCtrl : 0;

  const eventTopology: CoverageLayerScore = {
    score: Number(Math.min(1.0, eventRatio * LEVEL_SCORES[eventInfo.level]).toFixed(2)),
    contributing_adapters: eventInfo.adapters,
    best_declared_level: eventInfo.level,
    observed_count: eventTotal,
    total_possible: serviceAndCtrl,
    evidence_quality: 0.85,
    gap_description: `${eventTotal} event/listener entities observed across ${serviceAndCtrl} services + controllers`,
  };

  // ── Frontend consumers ────────────────────────────────
  const frontendInfo = getBestLevel('frontendTopology', registry);
  const composableCount = Object.values(adjacencyMap).filter(
    (v: any) => (v.entity_id || '').startsWith('cmp_'),
  ).length;
  const storeCount = Object.values(adjacencyMap).filter(
    (v: any) => (v.entity_id || '').startsWith('str_'),
  ).length;
  const frontendTotal = composableCount + storeCount;
  // If adapter provides full capability, consider it 100% implicitly since it maps all known.
  let frontendRatio = openapiCount > 0 ? Math.min(1.0, frontendTotal / openapiCount) : 0;
  if (frontendInfo.level === 'full') {
    frontendRatio = 1.0;
  }

  const frontendConsumers: CoverageLayerScore = {
    score: Number(Math.min(1.0, Math.max(frontendRatio, LEVEL_SCORES[frontendInfo.level])).toFixed(2)),
    contributing_adapters: frontendInfo.adapters,
    best_declared_level: frontendInfo.level,
    observed_count: frontendTotal,
    total_possible: openapiCount,
    evidence_quality: frontendInfo.level === 'full' ? 0.95 : 0.70,
    gap_description: frontendInfo.level === 'full' 
      ? 'Adapter provides full structured frontend consumers topology'
      : (frontendTotal > 0
        ? `${frontendTotal} frontend consumers (${composableCount} composables, ${storeCount} stores)`
        : 'No frontend consumer linkage data available'),
  };

  // ── Data access edges ─────────────────────────────────
  const dataInfo = getBestLevel('dataAccessEdges', registry);
  const entitiesWithDataEdges = Object.values(adjacencyMap).filter(
    (v: any) => (v.reads_from || []).length > 0 || (v.writes_to || []).length > 0,
  ).length;
  const dataRatio = totalNonRouteEntities > 0
    ? entitiesWithDataEdges / totalNonRouteEntities
    : 0;

  const dataAccessEdges: CoverageLayerScore = {
    score: Number(Math.min(1.0, dataRatio * LEVEL_SCORES[dataInfo.level] / 0.5).toFixed(2)),
    contributing_adapters: dataInfo.adapters,
    best_declared_level: dataInfo.level,
    observed_count: entitiesWithDataEdges,
    total_possible: totalNonRouteEntities,
    evidence_quality: 0.75,
    gap_description: dataRatio >= 0.30
      ? `${entitiesWithDataEdges}/${totalNonRouteEntities} entities with data access edges`
      : `Only ${entitiesWithDataEdges}/${totalNonRouteEntities} entities have reads_from/writes_to edges`,
  };

  // ── Composite ─────────────────────────────────────────
  const allLayers: Record<string, CoverageLayerScore> = {
    surface_topology: surfaceTopology,
    handler_resolution: handlerResolution,
    invocation_edges: invocationEdges,
    authority_metadata: authorityMetadata,
    contract_topology: contractTopology,
    event_topology: eventTopology,
    frontend_consumers: frontendConsumers,
    data_access_edges: dataAccessEdges,
  };

  const scores = Object.values(allLayers).map(l => l.score);
  const overall = scores.reduce((a, b) => a + b, 0) / scores.length;

  const gapPriority = Object.entries(allLayers)
    .map(([layer, data]) => ({
      layer,
      score: data.score,
      gap_description: data.gap_description,
    }))
    .sort((a, b) => a.score - b.score);

  return {
    generated_at: 'baseline',
    layers: allLayers as CoverageIndex['layers'],
    overall_coverage: Number(overall.toFixed(4)),
    gap_priority: gapPriority,
  };
}
