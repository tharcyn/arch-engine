/**
 * ═══════════════════════════════════════════════════════════
 *  Stability Regression Detection Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  Week 5.6: Telemetry lineage & regression confidence.
 *
 *  Compares current stability-score.json against a previous
 *  baseline to detect architecture regressions with:
 *  - Severity classification (minor/moderate/major/critical)
 *  - Regression confidence (HIGH/MEDIUM/LOW)
 *  - Signed numeric deltas (4-decimal precision)
 *  - Trend indicators (up/down/stable) incl. regressionConfidenceTrend
 *  - Authority crossing trend detection
 *  - Baseline timeline metadata with lineageDepth
 *
 *  INVARIANTS:
 *  - Never fails execution unless fail-on-regression is true
 *  - Reports deltas as signed values
 *  - All numeric deltas use 4-decimal precision
 *  - Trend indicators derived deterministically from deltas
 *  - lineageDepth increments monotonically (baseline.lineageDepth + 1)
 *  - regressionConfidence always accompanies regressionSeverity
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Types ──────────────────────────────────────────────

type StabilityTier = 'STABLE' | 'HEALTHY' | 'WARNING' | 'CRITICAL';
type ConfidenceLabel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
export type RegressionSeverity = 'minor' | 'moderate' | 'major' | 'critical' | null;
export type RegressionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | null;
export type RegressionConfidenceSource =
  | 'structured_parity'
  | 'confidence_label_drift'
  | 'fallback_mode_triggered'
  | 'workspace_ambiguity'
  | 'classification_degradation'
  | 'multi_factor'
  | null;
export type TrendDirection = 'up' | 'down' | 'stable';

const TIER_RANK: Record<StabilityTier, number> = {
  STABLE: 3, HEALTHY: 2, WARNING: 1, CRITICAL: 0,
};

const CONFIDENCE_RANK: Record<ConfidenceLabel, number> = {
  HIGH: 3, MODERATE: 2, LOW: 1, VERY_LOW: 0,
};

// ─── Delta Types ────────────────────────────────────────

export interface RegressionDelta {
  field: string;
  previous: number | string;
  current: number | string;
  direction: 'improved' | 'degraded' | 'unchanged';
}

export interface NumericDeltas {
  coverageDelta: number;
  connectivityDelta: number;
  stabilityScoreDelta: number;
  confidenceDelta: number;
  authorityCrossingDelta: number;
}

export interface TrendIndicators {
  coverageTrend: TrendDirection;
  connectivityTrend: TrendDirection;
  stabilityTrend: TrendDirection;
  confidenceTrend: TrendDirection;
  crossingTrend: TrendDirection;
  crossingTrend: TrendDirection;
  regressionConfidenceTrend: TrendDirection;
  confidenceSourceTrend?: RegressionConfidenceSource | string;
}

export interface ComparisonBaseline {
  baselineRepoHash: string;
  baselineGeneratedAt: string;
  baselineArtifactVersion: string;
  lineageDepth: number;
}

// ─── Result ─────────────────────────────────────────────

export interface RegressionResult {
  regressed: boolean;
  severity: RegressionSeverity;
  severity: RegressionSeverity;
  regressionConfidence: RegressionConfidence;
  regressionConfidenceSource: RegressionConfidenceSource;
  deltas: RegressionDelta[];
  numericDeltas: NumericDeltas | null;
  trendIndicators: TrendIndicators | null;
  comparisonBaseline: ComparisonBaseline | null;
  authorityCrossingDelta: number | null;
  crossingTrend: TrendDirection | null;
  summary: string;
  baselineFound: boolean;
}

// ─── Baseline Schema ────────────────────────────────────

interface BaselineSnapshot {
  coverage?: number;
  connectivity?: number;
  stabilityScore?: number;
  stabilityTier?: StabilityTier;
  topologyConfidence?: number;
  topologyConfidenceLabel?: ConfidenceLabel;
  detectedNodes?: number;
  connectedNodes?: number;
  authorityCrossings?: number;
  extractionMode?: string;
  // Timeline metadata
  repoHash?: string;
  timestamp?: string;
  artifactCompatibilityVersion?: string;
  snapshotVersion?: string;
  // Lineage
  comparisonBaseline?: { lineageDepth?: number };
  // Domain
  // Domain
  regressionConfidence?: RegressionConfidence;
  regressionConfidenceSource?: RegressionConfidenceSource;
}

// ─── Current Metrics Input ──────────────────────────────

export interface CurrentMetrics {
  coverage: number;
  connectivity: number;
  stabilityScore: number;
  stabilityTier: StabilityTier;
  topologyConfidence: number;
  topologyConfidenceLabel: ConfidenceLabel;
  detectedNodes: number;
  connectedNodes: number;
  authorityCrossings: number;
  extractionMode: string;
  minCoverage: number;
  // Domain integrity context for confidence classification
  // Domain integrity context for confidence classification
  unclassifiedRatio?: number;
  warnings?: string[];
}

// ─── Public API ─────────────────────────────────────────

/**
 * Detect architecture regressions with severity classification,
 * regression confidence, numeric deltas, trend indicators,
 * and timeline metadata with lineage depth.
 */
export function detectRegressions(
  cwd: string,
  current: CurrentMetrics,
): RegressionResult {
  const baseline = loadBaseline(cwd);

  if (!baseline) {
    return {
      regressed: false,
      severity: null,
      regressionConfidence: null,
      regressionConfidenceSource: null,
      deltas: [],
      numericDeltas: null,
      trendIndicators: null,
      comparisonBaseline: null,
      authorityCrossingDelta: null,
      crossingTrend: null,
      summary: 'No baseline found — first run, no regression detection possible.',
      baselineFound: false,
    };
  }

  const deltas: RegressionDelta[] = [];

  // Numeric comparisons
  compareNumeric(deltas, 'coverage', baseline.coverage, current.coverage);
  compareNumeric(deltas, 'connectivity', baseline.connectivity, current.connectivity);
  compareNumeric(deltas, 'stabilityScore', baseline.stabilityScore, current.stabilityScore);
  compareNumeric(deltas, 'topologyConfidence', baseline.topologyConfidence, current.topologyConfidence);

  // Tier downgrade
  if (baseline.stabilityTier && current.stabilityTier) {
    const prevRank = TIER_RANK[baseline.stabilityTier] ?? -1;
    const currRank = TIER_RANK[current.stabilityTier] ?? -1;
    deltas.push({
      field: 'stabilityTier',
      previous: baseline.stabilityTier,
      current: current.stabilityTier,
      direction: currRank < prevRank ? 'degraded' : currRank > prevRank ? 'improved' : 'unchanged',
    });
  }

  // Confidence downgrade
  if (baseline.topologyConfidenceLabel && current.topologyConfidenceLabel) {
    const prevRank = CONFIDENCE_RANK[baseline.topologyConfidenceLabel] ?? -1;
    const currRank = CONFIDENCE_RANK[current.topologyConfidenceLabel] ?? -1;
    deltas.push({
      field: 'topologyConfidenceLabel',
      previous: baseline.topologyConfidenceLabel,
      current: current.topologyConfidenceLabel,
      direction: currRank < prevRank ? 'degraded' : currRank > prevRank ? 'improved' : 'unchanged',
    });
  }

  // Authority crossing delta
  let crossingDeltaValue: number | null = null;
  let crossingTrend: TrendDirection | null = null;
  if (typeof baseline.authorityCrossings === 'number') {
    crossingDeltaValue = current.authorityCrossings - baseline.authorityCrossings;
    crossingTrend = crossingDeltaValue > 0 ? 'up' : crossingDeltaValue < 0 ? 'down' : 'stable';
    deltas.push({
      field: 'authorityCrossings',
      previous: baseline.authorityCrossings,
      current: current.authorityCrossings,
      direction: crossingDeltaValue > 0 ? 'degraded' : crossingDeltaValue < 0 ? 'improved' : 'unchanged',
    });
  }

  // Compute signed numeric deltas (4-decimal precision)
  const numericDeltas = computeNumericDeltas(baseline, current);

  // Classify severity
  const degraded = deltas.filter(d => d.direction === 'degraded');
  const regressed = degraded.length > 0;
  const severity = regressed
    ? classifyRegressionSeverity(baseline, current, numericDeltas, degraded)
    : null;

  // Classify regression confidence
  const regressionConfidence = regressed
    ? classifyRegressionConfidence(baseline, current)
    : null;

  const regressionConfidenceSource = regressed
    ? classifyRegressionConfidenceSource(baseline, current)
    : null;

  // Compute lineage depth
  const prevLineageDepth = baseline.comparisonBaseline?.lineageDepth ?? 0;
  const lineageDepth = prevLineageDepth + 1;

  // Derive trend indicators (including regressionConfidenceTrend & confidenceSourceTrend)
  const regressionConfidenceTrend = deriveRegressionConfidenceTrend(
    baseline.regressionConfidence ?? null,
    regressionConfidence,
  );
  const confidenceSourceTrend = baseline.regressionConfidenceSource ? regressionConfidenceSource : undefined;
  const trendIndicators = deriveTrendIndicators(numericDeltas, crossingDeltaValue, regressionConfidenceTrend, confidenceSourceTrend);

  // Build timeline metadata with lineage depth
  const comparisonBaseline: ComparisonBaseline = {
    baselineRepoHash: baseline.repoHash ?? 'unknown',
    baselineGeneratedAt: baseline.timestamp ?? 'unknown',
    baselineArtifactVersion: baseline.artifactCompatibilityVersion ?? baseline.snapshotVersion ?? 'unknown',
    lineageDepth,
  };

  let summary: string;
  if (!regressed) {
    summary = 'No architecture regressions detected.';
  } else {
    const confSuffix = regressionConfidence ? `, ${regressionConfidence} confidence` : '';
    const parts = degraded.map(d => `${d.field}: ${d.previous} → ${d.current}`);
    summary = `${severity?.toUpperCase()}${confSuffix} — ${degraded.length} regression(s): ${parts.join('; ')}`;
  }

  return {
    regressed,
    severity,
    regressionConfidence,
    regressionConfidenceSource,
    deltas,
    numericDeltas,
    trendIndicators,
    comparisonBaseline,
    authorityCrossingDelta: crossingDeltaValue,
    crossingTrend,
    summary,
    baselineFound: true,
  };
}

// ─── Severity Classification ────────────────────────────

/**
 * Classify regression severity based on the nature and magnitude
 * of degraded fields.
 */
export function classifyRegressionSeverity(
  baseline: BaselineSnapshot,
  current: CurrentMetrics,
  deltas: NumericDeltas,
  degradedFields: RegressionDelta[],
): RegressionSeverity {
  // CRITICAL: coverage below minCoverage or fallback mode activation
  if (current.minCoverage > 0 && current.coverage < current.minCoverage) {
    return 'critical';
  }
  if (
    baseline.extractionMode === 'structured' &&
    current.extractionMode === 'fallback_directory_scan'
  ) {
    return 'critical';
  }

  // MAJOR: tier downgrade, coverage drop > 0.15, confidence HIGH → LOW/VERY_LOW
  const tierDegraded = degradedFields.some(d => d.field === 'stabilityTier');
  if (tierDegraded) return 'major';

  if (deltas.coverageDelta < -0.15) return 'major';

  const confDegraded = degradedFields.find(d => d.field === 'topologyConfidenceLabel');
  if (confDegraded) {
    const prevRank = CONFIDENCE_RANK[confDegraded.previous as ConfidenceLabel] ?? 0;
    const currRank = CONFIDENCE_RANK[confDegraded.current as ConfidenceLabel] ?? 0;
    if (prevRank >= 3 && currRank <= 1) return 'major'; // HIGH → LOW or VERY_LOW
  }

  // MODERATE: coverage drop 0.05–0.15, confidence drop by 1, connectivity drop > 0.10
  if (deltas.coverageDelta < -0.05) return 'moderate';
  if (deltas.connectivityDelta < -0.10) return 'moderate';
  if (confDegraded) {
    const prevRank = CONFIDENCE_RANK[confDegraded.previous as ConfidenceLabel] ?? 0;
    const currRank = CONFIDENCE_RANK[confDegraded.current as ConfidenceLabel] ?? 0;
    if (prevRank - currRank === 1) return 'moderate';
  }

  // MINOR: domain integrity, crossings increase, everything else
  return 'minor';
}

// ─── Regression Confidence Source Classification ────────

/**
 * Classify why regression confidence is what it is (provenance).
 */
export function classifyRegressionConfidenceSource(
  baseline: BaselineSnapshot,
  current: CurrentMetrics,
): RegressionConfidenceSource {
  const causes: RegressionConfidenceSource[] = [];

  // fallback_mode_triggered
  const baseMode = baseline.extractionMode ?? 'unknown';
  const currMode = current.extractionMode;
  if (baseMode === 'structured' && (currMode === 'fallback_directory_scan' || currMode === 'mixed_workspace_detection')) {
    causes.push('fallback_mode_triggered');
  } else if (currMode === 'fallback_directory_scan') {
    causes.push('fallback_mode_triggered');
  }

  // confidence_label_drift
  const baseConf = baseline.topologyConfidenceLabel;
  const currConf = current.topologyConfidenceLabel;
  if (baseConf && currConf && baseConf !== currConf) {
    causes.push('confidence_label_drift');
  }

  // classification_degradation
  const unclassifiedRatioTriggered = typeof current.unclassifiedRatio === 'number' && current.unclassifiedRatio > 0.30;
  const classificationWarning = current.warnings?.some(w =>
    w.toLowerCase().includes('domain integrity') || w.toLowerCase().includes('classification')
  );
  if (unclassifiedRatioTriggered || classificationWarning) {
    causes.push('classification_degradation');
  }

  // workspace_ambiguity
  const ambiguityWarning = current.warnings?.some(w =>
    w.toLowerCase().includes('ambigu') || w.toLowerCase().includes('multiple workspace')
  );
  if (ambiguityWarning) {
    causes.push('workspace_ambiguity');
  }

  if (causes.length === 0) return 'structured_parity';
  if (causes.length === 1) return causes[0];
  return 'multi_factor';
}

// ─── Regression Confidence Classification ───────────────

/**
 * Classify how confident we are in the regression signal itself.
 *
 * HIGH: both baseline and current use structured extraction, confidence
 *       labels unchanged, deltas internally consistent.
 * MEDIUM: one-level confidence label change, or mixed extraction modes,
 *         or domain classification degradation present.
 * LOW: fallback extraction active, confidence label downgraded >1 tier,
 *      UNCLASSIFIED ratio increase >20%, or workspace detection ambiguity.
 */
export function classifyRegressionConfidence(
  baseline: BaselineSnapshot,
  current: CurrentMetrics,
): RegressionConfidence {
  const baselineMode = baseline.extractionMode ?? 'unknown';
  const currentMode = current.extractionMode;

  // LOW: fallback active on either side
  if (currentMode === 'fallback_directory_scan') return 'LOW';
  if (baselineMode === 'fallback_directory_scan' && currentMode !== 'structured') return 'LOW';

  // LOW: confidence label downgraded > 1 tier
  const baselineConf = baseline.topologyConfidenceLabel;
  const currentConf = current.topologyConfidenceLabel;
  if (baselineConf && currentConf) {
    const prevRank = CONFIDENCE_RANK[baselineConf] ?? 0;
    const currRank = CONFIDENCE_RANK[currentConf] ?? 0;
    if (prevRank - currRank > 1) return 'LOW';
  }

  // LOW: UNCLASSIFIED ratio increase > 20%
  if (typeof current.unclassifiedRatio === 'number' && current.unclassifiedRatio > 0.60) {
    return 'LOW';
  }

  // MEDIUM: one-level confidence change
  if (baselineConf && currentConf) {
    const prevRank = CONFIDENCE_RANK[baselineConf] ?? 0;
    const currRank = CONFIDENCE_RANK[currentConf] ?? 0;
    if (Math.abs(prevRank - currRank) === 1) return 'MEDIUM';
  }

  // MEDIUM: mixed extraction modes
  if (baselineMode === 'structured' && currentMode !== 'structured') return 'MEDIUM';
  if (baselineMode !== 'structured' && currentMode === 'structured') return 'MEDIUM';

  // MEDIUM: UNCLASSIFIED ratio > 40%
  if (typeof current.unclassifiedRatio === 'number' && current.unclassifiedRatio > 0.40) {
    return 'MEDIUM';
  }

  // HIGH: both structured, confidence labels stable, clean extraction
  return 'HIGH';
}

// ─── Regression Confidence Trend ────────────────────────

const REGRESSION_CONF_RANK: Record<string, number> = {
  HIGH: 2, MEDIUM: 1, LOW: 0,
};

function deriveRegressionConfidenceTrend(
  baselineConf: RegressionConfidence,
  currentConf: RegressionConfidence,
): TrendDirection {
  if (!baselineConf || !currentConf) return 'stable';
  const prevRank = REGRESSION_CONF_RANK[baselineConf] ?? -1;
  const currRank = REGRESSION_CONF_RANK[currentConf] ?? -1;
  if (currRank > prevRank) return 'up';
  if (currRank < prevRank) return 'down';
  return 'stable';
}

// ─── Numeric Deltas ─────────────────────────────────────

function computeNumericDeltas(
  baseline: BaselineSnapshot,
  current: CurrentMetrics,
): NumericDeltas {
  return {
    coverageDelta: round4(safeSubtract(current.coverage, baseline.coverage)),
    connectivityDelta: round4(safeSubtract(current.connectivity, baseline.connectivity)),
    stabilityScoreDelta: round4(safeSubtract(current.stabilityScore, baseline.stabilityScore)),
    confidenceDelta: round4(safeSubtract(current.topologyConfidence, baseline.topologyConfidence)),
    authorityCrossingDelta: (typeof baseline.authorityCrossings === 'number')
      ? current.authorityCrossings - baseline.authorityCrossings
      : 0,
  };
}

// ─── Trend Indicators ───────────────────────────────────

function deriveTrendIndicators(
  deltas: NumericDeltas,
  crossingDelta: number | null,
  regressionConfidenceTrend: TrendDirection,
  confidenceSourceTrend?: RegressionConfidenceSource | string,
): TrendIndicators {
  return {
    coverageTrend: numericToTrend(deltas.coverageDelta),
    connectivityTrend: numericToTrend(deltas.connectivityDelta),
    stabilityTrend: numericToTrend(deltas.stabilityScoreDelta),
    confidenceTrend: numericToTrend(deltas.confidenceDelta),
    crossingTrend: crossingDelta !== null
      ? (crossingDelta > 0 ? 'up' : crossingDelta < 0 ? 'down' : 'stable')
      : 'stable',
    regressionConfidenceTrend,
    ...(confidenceSourceTrend ? { confidenceSourceTrend } : {}),
  };
}

function numericToTrend(delta: number): TrendDirection {
  if (delta > 0.001) return 'up';
  if (delta < -0.001) return 'down';
  return 'stable';
}

// ─── Helpers ────────────────────────────────────────────

function loadBaseline(cwd: string): BaselineSnapshot | null {
  const artifactPath = path.join(cwd, '.arch-engine', 'stability-score.json');
  if (!fs.existsSync(artifactPath)) return null;

  try {
    const raw = fs.readFileSync(artifactPath, 'utf-8');
    return JSON.parse(raw) as BaselineSnapshot;
  } catch {
    return null;
  }
}

function compareNumeric(
  deltas: RegressionDelta[],
  field: string,
  previous: number | undefined,
  current: number,
): void {
  if (typeof previous !== 'number') return;
  const diff = current - previous;
  const direction = diff < -0.001 ? 'degraded' : diff > 0.001 ? 'improved' : 'unchanged';
  deltas.push({ field, previous, current, direction });
}

function safeSubtract(current: number, previous: number | undefined): number {
  if (typeof previous !== 'number') return 0;
  return current - previous;
}

function round4(n: number): number {
  return Number(n.toFixed(4));
}
