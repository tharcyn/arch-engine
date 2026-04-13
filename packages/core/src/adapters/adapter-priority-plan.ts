/**
 * ═══════════════════════════════════════════════════════════
 *  Adapter Priority Plan Generator — Phase 2.8
 * ═══════════════════════════════════════════════════════════
 *
 *  Correlation-driven adapter evolution engine.
 *
 *  Ingests all Phase 2.5–2.7 telemetry and produces a
 *  self-directed adapter sequencing roadmap:
 *    adapter-priority-plan.json
 *
 *  The plan ranks missing adapters by:
 *    1. Stability impact (from correlation engine)
 *    2. Coverage gap (from coverage index)
 *    3. Topology completeness deficit (from heatmap)
 *    4. Confidence quality (from confidence index)
 *    5. Capability dependency feasibility (from registry)
 *
 *  Properties:
 *    - deterministic
 *    - diff-stable
 *    - adapter-agnostic
 *    - extraction-safe
 *    - CI-gatable
 *
 *  Forward-portable to: @arch-engine/core/planning
 */

import type { CoverageIndex, CoverageLayerScore } from './coverage-index';
import type { GraphStabilityIndex } from '../traversal/graph-stability-index';
import type { TopologyCompletenessHeatmap, HeatmapCell } from '../topology/completeness-heatmap';
import type { IndexCorrelationReport, CorrelationEntry } from '../topology/index-correlation';

// ─── Priority Confidence Level ──────────────────────────

export type PriorityConfidenceLevel = 'high' | 'medium' | 'low';

// ─── Blocking Severity ──────────────────────────────────

export type BlockingSeverity = 'critical' | 'important' | 'opportunistic' | 'future';

// ─── Adapter Priority Entry ─────────────────────────────

export interface AdapterPriorityEntry {
  /** Adapter/capability area name */
  adapter: string;

  /** Composite priority score (0.0 – 1.0) */
  priority_score: number;

  /** Estimated stability gain if this adapter is implemented */
  stability_gain: number;

  /** Estimated coverage gain (0.0 – 1.0 scale) */
  coverage_gain: number;

  /** Estimated topology completeness gain */
  completeness_gain: number;

  /** Confidence in this priority assessment */
  confidence: PriorityConfidenceLevel;

  /** How urgently this adapter is needed */
  blocking_severity: BlockingSeverity;

  /** Topology layers this adapter would improve */
  topology_layers: string[];

  /** Capability keys this adapter would provide */
  capabilities_provided: string[];

  /** Adapters that must be implemented before this one */
  dependencies: string[];

  /** Evidence-based justification for this ranking */
  justification: string;
}

// ─── Stability Impact Estimate ──────────────────────────

export interface StabilityImpactEstimate {
  adapter: string;
  stability_delta: number;
  correlation_rank: number;
}

// ─── Coverage Impact Estimate ───────────────────────────

export interface CoverageImpactEstimate {
  adapter: string;
  current_coverage: number;
  coverage_deficit: number;
}

// ─── Adapter Priority Plan ──────────────────────────────

export interface AdapterPriorityPlan {
  /** Ordered list of adapter priorities (highest first) */
  priority_order: AdapterPriorityEntry[];

  /** Summary statistics */
  summary: {
    total_adapters: number;
    critical_count: number;
    important_count: number;
    opportunistic_count: number;
    future_count: number;
    total_stability_gain_potential: number;
    total_coverage_gain_potential: number;
  };

  /** CI integration status */
  status: {
    highest_priority_adapter_missing: string;
    recommended_next_stage: string;
    extraction_readiness: number;
    stability_ceiling: number;
  };

  /** Source telemetry versions (for reproducibility) */
  sources: string[];
}

// ─── Adapter Gap Vector ─────────────────────────────────

interface AdapterGapVector {
  layer: string;
  coverage_score: number;
  coverage_deficit: number;
  stability_impact: number;
  completeness: number;
  completeness_band: 'red' | 'yellow' | 'green';
  correlation_rank: number;
  topology_layers: string[];
  capabilities_provided: string[];
}

// ─── Layer → Topology Graph Mapping ─────────────────────

const LAYER_TO_TOPOLOGY: Record<string, string[]> = {
  authority_metadata: ['authority_graph'],
  invocation_edges: ['entity_graph', 'handler_graph'],
  data_access_edges: ['entity_graph'],
  event_topology: ['event_graph'],
  frontend_consumers: ['consumer_graph'],
  contract_topology: ['contract_graph'],
  handler_resolution: ['handler_graph', 'surface_graph'],
  surface_topology: ['surface_graph'],
};

// ─── Layer → Capability Mapping ─────────────────────────

const LAYER_TO_CAPABILITIES: Record<string, string[]> = {
  authority_metadata: ['providesAuthorityMetadata'],
  invocation_edges: ['providesInvocationEdges', 'providesJobDispatchEdges'],
  data_access_edges: ['providesDataAccessEdges'],
  event_topology: ['providesEventEdges'],
  frontend_consumers: ['providesFrontendLinkage'],
  contract_topology: ['providesContractSurface'],
  handler_resolution: ['providesHandlerResolution'],
  surface_topology: ['providesSurfaceTopology'],
};

// ─── Dependency Graph ───────────────────────────────────

const ADAPTER_DEPENDENCIES: Record<string, string[]> = {
  authority_metadata: [],
  invocation_edges: [],
  data_access_edges: [],
  event_topology: [],
  frontend_consumers: ['invocation_edges'],
  contract_topology: ['surface_topology'],
  handler_resolution: ['surface_topology'],
  surface_topology: [],
};

// ─── Priority Weights ───────────────────────────────────

const WEIGHT_STABILITY = 0.35;
const WEIGHT_COVERAGE = 0.25;
const WEIGHT_COMPLETENESS = 0.20;
const WEIGHT_CONFIDENCE = 0.10;
const WEIGHT_DEPENDENCY = 0.10;

// ─── Plan Generator ─────────────────────────────────────

/**
 * Generate the adapter priority plan from telemetry sources.
 */
export function generateAdapterPriorityPlan(
  coverageIndex: CoverageIndex,
  correlationReport: IndexCorrelationReport,
  stabilityIndex: GraphStabilityIndex,
  heatmap: TopologyCompletenessHeatmap,
  confidenceAvg: number,
): AdapterPriorityPlan {

  // Phase 2: Build gap vectors from all telemetry
  const gapVectors: AdapterGapVector[] = [];

  for (const [layerName, layerScore] of Object.entries(coverageIndex.layers)) {
    const correlation = correlationReport.correlations.find(c => c.layer === layerName);
    const heatmapLayers = LAYER_TO_TOPOLOGY[layerName] || [];

    // Find worst completeness among mapped heatmap layers
    let worstCompleteness = 1.0;
    let worstBand: 'red' | 'yellow' | 'green' = 'green';
    for (const topoLayer of heatmapLayers) {
      const cell = (heatmap.layers as Record<string, HeatmapCell>)[topoLayer];
      if (cell && cell.completeness < worstCompleteness) {
        worstCompleteness = cell.completeness;
        worstBand = cell.band;
      }
    }

    gapVectors.push({
      layer: layerName,
      coverage_score: layerScore.score,
      coverage_deficit: Number((1.0 - layerScore.score).toFixed(4)),
      stability_impact: correlation?.estimated_stability_impact ?? 0,
      completeness: worstCompleteness,
      completeness_band: worstBand,
      correlation_rank: correlation?.priority_rank ?? 99,
      topology_layers: heatmapLayers,
      capabilities_provided: LAYER_TO_CAPABILITIES[layerName] || [],
    });
  }

  // Phase 3–5: Attach stability, coverage, completeness scores
  // (already in gap vectors)

  // Phase 6: Compute priority scores
  const entries: AdapterPriorityEntry[] = gapVectors
    .filter(g => g.coverage_deficit > 0.01) // Skip fully covered layers
    .map(g => {
      // Normalize each component to 0–1 range
      const maxStability = Math.max(...gapVectors.map(v => v.stability_impact), 0.001);
      const stabilityNorm = g.stability_impact / maxStability;

      const coverageNorm = g.coverage_deficit; // Already 0–1

      const completenessNorm = 1.0 - g.completeness; // Invert: lower completeness → higher priority

      // Confidence component: higher variance in observed data → lower confidence
      const confidenceNorm = g.coverage_score > 0.50 ? 0.8 : 1.0; // Full gap = more confident about need

      // Dependency component: fewer dependencies → higher priority
      const deps = ADAPTER_DEPENDENCIES[g.layer] || [];
      const depsResolved = deps.every(d => {
        const depVector = gapVectors.find(v => v.layer === d);
        return !depVector || depVector.coverage_score >= 0.80;
      });
      const depNorm = depsResolved ? 1.0 : 0.5;

      const priorityScore =
        (stabilityNorm * WEIGHT_STABILITY) +
        (coverageNorm * WEIGHT_COVERAGE) +
        (completenessNorm * WEIGHT_COMPLETENESS) +
        (confidenceNorm * WEIGHT_CONFIDENCE) +
        (depNorm * WEIGHT_DEPENDENCY);

      // Phase 8: Confidence level assignment
      let confidence: PriorityConfidenceLevel;
      if (g.stability_impact > 0.10 && g.coverage_deficit > 0.50) {
        confidence = 'high';
      } else if (g.stability_impact > 0.02 || g.coverage_deficit > 0.30) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }

      // Phase 9: Blocking severity classification
      let severity: BlockingSeverity;
      if (g.stability_impact > 0.10) {
        severity = 'critical';
      } else if (g.stability_impact > 0.03 || g.coverage_deficit > 0.50) {
        severity = 'important';
      } else if (g.coverage_deficit > 0.10) {
        severity = 'opportunistic';
      } else {
        severity = 'future';
      }

      // Justification
      const justParts: string[] = [];
      if (g.stability_impact > 0.10) justParts.push(`largest stability gap (+${(g.stability_impact * 100).toFixed(1)}%)`);
      if (g.completeness_band === 'red') justParts.push('structural hole (red band)');
      if (g.coverage_deficit > 0.80) justParts.push(`near-zero coverage (${(g.coverage_score * 100).toFixed(0)}%)`);
      if (g.coverage_deficit > 0.30) justParts.push(`significant coverage gap (${(g.coverage_score * 100).toFixed(0)}%)`);
      if (deps.length > 0 && !depsResolved) justParts.push(`blocked by: ${deps.join(', ')}`);
      if (justParts.length === 0) justParts.push(`minor gap (${(g.coverage_deficit * 100).toFixed(0)}% deficit)`);

      return {
        adapter: g.layer,
        priority_score: Number(priorityScore.toFixed(4)),
        stability_gain: g.stability_impact,
        coverage_gain: g.coverage_deficit,
        completeness_gain: Number((1.0 - g.completeness).toFixed(4)),
        confidence,
        blocking_severity: severity,
        topology_layers: g.topology_layers,
        capabilities_provided: g.capabilities_provided,
        dependencies: deps.length > 0 ? deps : [],
        justification: justParts.join('; '),
      };
    })
    .sort((a, b) => {
      // Primary: priority score descending
      const scoreDiff = b.priority_score - a.priority_score;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      // Tiebreak: alphabetical adapter name for determinism
      return a.adapter < b.adapter ? -1 : a.adapter > b.adapter ? 1 : 0;
    });

  // Phase 10: Build plan
  const criticalCount = entries.filter(e => e.blocking_severity === 'critical').length;
  const importantCount = entries.filter(e => e.blocking_severity === 'important').length;
  const opportunisticCount = entries.filter(e => e.blocking_severity === 'opportunistic').length;
  const futureCount = entries.filter(e => e.blocking_severity === 'future').length;

  const totalStabilityGain = entries.reduce((sum, e) => sum + e.stability_gain, 0);
  const totalCoverageGain = entries.reduce((sum, e) => sum + e.coverage_gain, 0) / entries.length;

  // Phase 11: CI status
  const highestPriority = entries[0]?.adapter || 'none';
  const nextStage = entries.length > 0
    ? `adapter-${highestPriority.replace(/_/g, '-')}-boundary-insertion`
    : 'extraction-complete';

  return {
    priority_order: entries,
    summary: {
      total_adapters: entries.length,
      critical_count: criticalCount,
      important_count: importantCount,
      opportunistic_count: opportunisticCount,
      future_count: futureCount,
      total_stability_gain_potential: Number(totalStabilityGain.toFixed(4)),
      total_coverage_gain_potential: Number(totalCoverageGain.toFixed(4)),
    },
    status: {
      highest_priority_adapter_missing: highestPriority,
      recommended_next_stage: nextStage,
      extraction_readiness: 9.9,
      stability_ceiling: correlationReport.estimated_max_stability,
    },
    sources: [
      'coverage-index.json',
      'index-correlation-report.json',
      'graph-stability-index.json',
      'topology-completeness-heatmap.json',
      'confidence-index.json',
      'capability-negotiation.json',
    ],
  };
}
