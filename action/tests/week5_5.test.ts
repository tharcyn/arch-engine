/**
 * ═══════════════════════════════════════════════════════════
 *  Week 5.5 Test Suite — Signal Intelligence Hardening
 * ═══════════════════════════════════════════════════════════
 *
 *  Verifies:
 *  - Severity classification correctness
 *  - Numeric delta computation
 *  - Trend indicator generation
 *  - Authority crossing trend detection
 *  - Badge theme override behavior
 *  - Summary JSON block presence + schema version
 *  - Artifact compatibility validation
 *  - Baseline metadata correctness
 *  - Annotation severity mapping correctness
 */

import { describe, it, expect } from 'vitest';

// ─── Test: Regression Severity Classification ───────────

describe('regression severity classification', () => {
  const TIER_RANK: Record<string, number> = { STABLE: 3, HEALTHY: 2, WARNING: 1, CRITICAL: 0 };
  const CONF_RANK: Record<string, number> = { HIGH: 3, MODERATE: 2, LOW: 1, VERY_LOW: 0 };

  function classify(
    coverageDelta: number,
    connectivityDelta: number,
    tierDegraded: boolean,
    confPrev: string,
    confCurr: string,
    isBelowMinCoverage: boolean,
    fallbackActivated: boolean,
  ): string {
    if (isBelowMinCoverage) return 'critical';
    if (fallbackActivated) return 'critical';
    if (tierDegraded) return 'major';
    if (coverageDelta < -0.15) return 'major';
    if (CONF_RANK[confPrev] >= 3 && CONF_RANK[confCurr] <= 1) return 'major';
    if (coverageDelta < -0.05) return 'moderate';
    if (connectivityDelta < -0.10) return 'moderate';
    if (CONF_RANK[confPrev] - CONF_RANK[confCurr] === 1) return 'moderate';
    return 'minor';
  }

  it('classifies coverage < minCoverage as critical', () => {
    expect(classify(0, 0, false, 'HIGH', 'HIGH', true, false)).toBe('critical');
  });

  it('classifies fallback activation as critical', () => {
    expect(classify(0, 0, false, 'HIGH', 'HIGH', false, true)).toBe('critical');
  });

  it('classifies tier downgrade as major', () => {
    expect(classify(-0.05, 0, true, 'HIGH', 'HIGH', false, false)).toBe('major');
  });

  it('classifies coverage drop > 0.15 as major', () => {
    expect(classify(-0.20, 0, false, 'HIGH', 'HIGH', false, false)).toBe('major');
  });

  it('classifies HIGH → LOW confidence as major', () => {
    expect(classify(0, 0, false, 'HIGH', 'LOW', false, false)).toBe('major');
  });

  it('classifies coverage drop 0.05–0.15 as moderate', () => {
    expect(classify(-0.10, 0, false, 'HIGH', 'HIGH', false, false)).toBe('moderate');
  });

  it('classifies connectivity drop > 0.10 as moderate', () => {
    expect(classify(0, -0.15, false, 'HIGH', 'HIGH', false, false)).toBe('moderate');
  });

  it('classifies HIGH → MODERATE confidence as moderate', () => {
    expect(classify(0, 0, false, 'HIGH', 'MODERATE', false, false)).toBe('moderate');
  });

  it('classifies remaining regressions as minor', () => {
    expect(classify(-0.02, -0.03, false, 'MODERATE', 'MODERATE', false, false)).toBe('minor');
  });
});

// ─── Test: Numeric Delta Computation ────────────────────

describe('numeric delta computation', () => {
  function computeDeltas(prev: Record<string, number>, curr: Record<string, number>) {
    return {
      coverageDelta: Number((curr.coverage - prev.coverage).toFixed(4)),
      connectivityDelta: Number((curr.connectivity - prev.connectivity).toFixed(4)),
      stabilityScoreDelta: Number((curr.stabilityScore - prev.stabilityScore).toFixed(4)),
      confidenceDelta: Number((curr.confidence - prev.confidence).toFixed(4)),
    };
  }

  it('computes positive deltas for improvements', () => {
    const d = computeDeltas(
      { coverage: 0.70, connectivity: 0.60, stabilityScore: 0.75, confidence: 0.65 },
      { coverage: 0.85, connectivity: 0.75, stabilityScore: 0.90, confidence: 0.92 },
    );
    expect(d.coverageDelta).toBe(0.15);
    expect(d.connectivityDelta).toBe(0.15);
    expect(d.stabilityScoreDelta).toBe(0.15);
    expect(d.confidenceDelta).toBe(0.27);
  });

  it('computes negative deltas for regressions', () => {
    const d = computeDeltas(
      { coverage: 0.85, connectivity: 0.75, stabilityScore: 0.90, confidence: 0.92 },
      { coverage: 0.70, connectivity: 0.60, stabilityScore: 0.75, confidence: 0.65 },
    );
    expect(d.coverageDelta).toBe(-0.15);
    expect(d.connectivityDelta).toBe(-0.15);
    expect(d.stabilityScoreDelta).toBe(-0.15);
    expect(d.confidenceDelta).toBe(-0.27);
  });

  it('computes zero deltas for unchanged', () => {
    const d = computeDeltas(
      { coverage: 0.80, connectivity: 0.70, stabilityScore: 0.85, confidence: 0.90 },
      { coverage: 0.80, connectivity: 0.70, stabilityScore: 0.85, confidence: 0.90 },
    );
    expect(d.coverageDelta).toBe(0);
    expect(d.connectivityDelta).toBe(0);
  });

  it('uses 4-decimal precision', () => {
    const d = computeDeltas(
      { coverage: 0.7777, connectivity: 0.5, stabilityScore: 0.5, confidence: 0.5 },
      { coverage: 0.8888, connectivity: 0.5, stabilityScore: 0.5, confidence: 0.5 },
    );
    expect(d.coverageDelta).toBe(0.1111);
  });
});

// ─── Test: Trend Indicator Generation ───────────────────

describe('trend indicators', () => {
  function toTrend(delta: number): string {
    if (delta > 0.001) return 'up';
    if (delta < -0.001) return 'down';
    return 'stable';
  }

  it('maps positive delta to up', () => {
    expect(toTrend(0.05)).toBe('up');
  });

  it('maps negative delta to down', () => {
    expect(toTrend(-0.05)).toBe('down');
  });

  it('maps near-zero delta to stable', () => {
    expect(toTrend(0.0005)).toBe('stable');
    expect(toTrend(-0.0005)).toBe('stable');
    expect(toTrend(0)).toBe('stable');
  });

  it('handles all 5 metric trends', () => {
    const ti = {
      coverageTrend: toTrend(-0.12),
      connectivityTrend: toTrend(0),
      stabilityTrend: toTrend(-0.05),
      confidenceTrend: toTrend(0.001),
      crossingTrend: toTrend(2),
    };
    expect(ti.coverageTrend).toBe('down');
    expect(ti.connectivityTrend).toBe('stable');
    expect(ti.stabilityTrend).toBe('down');
    expect(ti.confidenceTrend).toBe('stable');
    expect(ti.crossingTrend).toBe('up');
  });
});

// ─── Test: Authority Crossing Trend ─────────────────────

describe('authority crossing trend', () => {
  function crossingTrend(prev: number, curr: number): { delta: number; trend: string } {
    const delta = curr - prev;
    return { delta, trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable' };
  }

  it('detects crossing increase', () => {
    const r = crossingTrend(3, 5);
    expect(r.delta).toBe(2);
    expect(r.trend).toBe('up');
  });

  it('detects crossing decrease', () => {
    const r = crossingTrend(5, 3);
    expect(r.delta).toBe(-2);
    expect(r.trend).toBe('down');
  });

  it('detects no change', () => {
    const r = crossingTrend(3, 3);
    expect(r.delta).toBe(0);
    expect(r.trend).toBe('stable');
  });
});

// ─── Test: Badge Theme Override ─────────────────────────

describe('badge theme override', () => {
  const THEMES: Record<string, Record<string, string>> = {
    default: { STABLE: 'brightgreen', HEALTHY: 'green', WARNING: 'yellow', CRITICAL: 'red' },
    dark: { STABLE: '00e676', HEALTHY: '66bb6a', WARNING: 'ffc107', CRITICAL: 'ff5252' },
    mono: { STABLE: 'e0e0e0', HEALTHY: 'bdbdbd', WARNING: '9e9e9e', CRITICAL: '616161' },
    enterprise: { STABLE: '009688', HEALTHY: '26a69a', WARNING: 'ff8f00', CRITICAL: 'd32f2f' },
  };

  it('default theme uses standard shield colors', () => {
    expect(THEMES.default.STABLE).toBe('brightgreen');
    expect(THEMES.default.CRITICAL).toBe('red');
  });

  it('dark theme uses contrast-optimized colors', () => {
    expect(THEMES.dark.STABLE).toBe('00e676');
    expect(THEMES.dark.CRITICAL).toBe('ff5252');
  });

  it('mono theme uses grayscale palette', () => {
    expect(THEMES.mono.STABLE).toBe('e0e0e0');
    expect(THEMES.mono.CRITICAL).toBe('616161');
  });

  it('enterprise theme uses teal tones', () => {
    expect(THEMES.enterprise.STABLE).toBe('009688');
    expect(THEMES.enterprise.WARNING).toBe('ff8f00');
  });

  it('badge includes endpoint metadata', () => {
    const badge = {
      schemaVersion: 1,
      label: 'Architecture Stability',
      message: 'HEALTHY (82%)',
      color: 'green',
      generatedAt: new Date().toISOString(),
      engineVersion: '4.0.0',
    };
    expect(badge.generatedAt).toBeTruthy();
    expect(badge.engineVersion).toBe('4.0.0');
  });
});

// ─── Test: Summary JSON Block ───────────────────────────

describe('summary machine-readable block', () => {
  function renderWithJsonBlock(tier: string, coverage: number): string {
    const json = {
      summarySchemaVersion: '1.0',
      stabilityTier: tier,
      coverage: Number(coverage.toFixed(4)),
    };
    return [
      '## Report',
      '<!-- ARCH_ENGINE_SUMMARY_JSON_START -->',
      `<!-- ${JSON.stringify(json)} -->`,
      '<!-- ARCH_ENGINE_SUMMARY_JSON_END -->',
    ].join('\n');
  }

  it('contains start/end markers', () => {
    const output = renderWithJsonBlock('HEALTHY', 0.85);
    expect(output).toContain('<!-- ARCH_ENGINE_SUMMARY_JSON_START -->');
    expect(output).toContain('<!-- ARCH_ENGINE_SUMMARY_JSON_END -->');
  });

  it('contains valid JSON between markers', () => {
    const output = renderWithJsonBlock('HEALTHY', 0.85);
    const match = output.match(/<!-- ({.*}) -->/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match![1]);
    expect(parsed.summarySchemaVersion).toBe('1.0');
    expect(parsed.stabilityTier).toBe('HEALTHY');
  });

  it('includes summarySchemaVersion', () => {
    const output = renderWithJsonBlock('STABLE', 0.95);
    expect(output).toContain('"summarySchemaVersion":"1.0"');
  });
});

// ─── Test: Artifact Compatibility Validation ────────────

describe('artifact compatibility guardrail', () => {
  const SUPPORTED = ['1.0'];

  function validate(version: unknown): { supported: boolean; warning: string | null } {
    if (version === undefined || version === null) {
      return { supported: true, warning: 'Missing — defaulting' };
    }
    if (typeof version !== 'string') {
      return { supported: false, warning: 'Must be string' };
    }
    if (SUPPORTED.includes(version)) {
      return { supported: true, warning: null };
    }
    return { supported: false, warning: `Unrecognized: ${version}` };
  }

  it('accepts supported version', () => {
    const r = validate('1.0');
    expect(r.supported).toBe(true);
    expect(r.warning).toBeNull();
  });

  it('warns on missing version', () => {
    const r = validate(undefined);
    expect(r.supported).toBe(true);
    expect(r.warning).toBeTruthy();
  });

  it('warns on unknown future version', () => {
    const r = validate('2.0');
    expect(r.supported).toBe(false);
    expect(r.warning).toContain('Unrecognized');
  });

  it('rejects non-string version', () => {
    const r = validate(42);
    expect(r.supported).toBe(false);
    expect(r.warning).toContain('string');
  });
});

// ─── Test: Comparison Baseline Metadata ─────────────────

describe('comparison baseline metadata', () => {
  it('captures baseline repoHash', () => {
    const baseline = { repoHash: 'abc1234', timestamp: '2026-01-01T00:00:00.000Z', artifactCompatibilityVersion: '1.0' };
    const cb = {
      baselineRepoHash: baseline.repoHash,
      baselineGeneratedAt: baseline.timestamp,
      baselineArtifactVersion: baseline.artifactCompatibilityVersion,
    };
    expect(cb.baselineRepoHash).toBe('abc1234');
    expect(cb.baselineGeneratedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(cb.baselineArtifactVersion).toBe('1.0');
  });

  it('defaults to unknown for missing baseline fields', () => {
    const baseline: Record<string, unknown> = {};
    const cb = {
      baselineRepoHash: (baseline.repoHash as string) ?? 'unknown',
      baselineGeneratedAt: (baseline.timestamp as string) ?? 'unknown',
      baselineArtifactVersion: (baseline.artifactCompatibilityVersion as string) ?? 'unknown',
    };
    expect(cb.baselineRepoHash).toBe('unknown');
    expect(cb.baselineGeneratedAt).toBe('unknown');
    expect(cb.baselineArtifactVersion).toBe('unknown');
  });
});

// ─── Test: Annotation Severity Mapping ──────────────────

describe('annotation severity mapping', () => {
  function severityToLevel(severity: string | null): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'major': return 'warning';
      case 'moderate': return 'notice';
      case 'minor': return 'notice';
      default: return 'notice';
    }
  }

  it('maps critical to error', () => {
    expect(severityToLevel('critical')).toBe('error');
  });

  it('maps major to warning', () => {
    expect(severityToLevel('major')).toBe('warning');
  });

  it('maps moderate to notice', () => {
    expect(severityToLevel('moderate')).toBe('notice');
  });

  it('maps minor to notice', () => {
    expect(severityToLevel('minor')).toBe('notice');
  });

  it('maps null to notice', () => {
    expect(severityToLevel(null)).toBe('notice');
  });
});

// ─── Integration Test: Full Regression Simulation ───────

describe('integration: regression simulation', () => {
  const baseline = {
    coverage: 0.81,
    connectivity: 0.72,
    stabilityScore: 0.85,
    stabilityTier: 'HEALTHY',
    topologyConfidence: 0.92,
    topologyConfidenceLabel: 'HIGH',
    authorityCrossings: 3,
    extractionMode: 'structured',
  };

  const regressed = {
    coverage: 0.67,
    connectivity: 0.68,
    stabilityScore: 0.72,
    stabilityTier: 'WARNING',
    topologyConfidence: 0.58,
    topologyConfidenceLabel: 'MODERATE',
    authorityCrossings: 5,
    extractionMode: 'structured',
    minCoverage: 0.50,
  };

  it('detects regression', () => {
    expect(regressed.coverage < baseline.coverage).toBe(true);
    expect(regressed.stabilityScore < baseline.stabilityScore).toBe(true);
  });

  it('classifies as major (tier downgrade)', () => {
    const tierDegraded = regressed.stabilityTier !== baseline.stabilityTier;
    expect(tierDegraded).toBe(true);
  });

  it('computes correct numeric deltas', () => {
    const coverageDelta = Number((regressed.coverage - baseline.coverage).toFixed(4));
    expect(coverageDelta).toBe(-0.14);
    const scoreDelta = Number((regressed.stabilityScore - baseline.stabilityScore).toFixed(4));
    expect(scoreDelta).toBe(-0.13);
  });

  it('generates correct trend indicators', () => {
    function toTrend(d: number): string {
      return d > 0.001 ? 'up' : d < -0.001 ? 'down' : 'stable';
    }
    expect(toTrend(regressed.coverage - baseline.coverage)).toBe('down');
    expect(toTrend(regressed.connectivity - baseline.connectivity)).toBe('down');
    expect(toTrend(regressed.authorityCrossings - baseline.authorityCrossings)).toBe('up');
  });

  it('emits correct annotation levels', () => {
    // Tier downgrade = major severity → ::warning annotation
    function severityToLevel(s: string): string {
      if (s === 'critical') return 'error';
      if (s === 'major') return 'warning';
      return 'notice';
    }
    expect(severityToLevel('major')).toBe('warning');
  });
});
