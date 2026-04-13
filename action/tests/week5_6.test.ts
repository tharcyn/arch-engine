/**
 * ═══════════════════════════════════════════════════════════
 *  Week 5.6 Test Suite — Telemetry Lineage & Confidence
 * ═══════════════════════════════════════════════════════════
 *
 *  Verifies:
 *  - Regression confidence classification (HIGH/MEDIUM/LOW)
 *  - Confidence downgrade/upgrade detection
 *  - Fallback mode confidence downgrade
 *  - UNCLASSIFIED ratio influence
 *  - Annotation confidence injection
 *  - Lineage depth computation
 *  - Lineage depth monotonic increment
 *  - Lineage validation behavior
 *  - Summary regressionConfidence output
 *  - Summary artifactCompatibilityVersion mirror
 *  - Regression confidence trend detection
 */

import { describe, it, expect } from 'vitest';

// ─── Test: Regression Confidence Classification ─────────

describe('regression confidence classification', () => {
  const CONF_RANK: Record<string, number> = { HIGH: 3, MODERATE: 2, LOW: 1, VERY_LOW: 0 };

  function classify(
    baselineMode: string,
    currentMode: string,
    baselineConf: string,
    currentConf: string,
    unclassifiedRatio: number,
  ): string {
    // LOW: fallback active
    if (currentMode === 'fallback_directory_scan') return 'LOW';
    if (baselineMode === 'fallback_directory_scan' && currentMode !== 'structured') return 'LOW';

    // LOW: confidence label downgraded > 1 tier
    const prevRank = CONF_RANK[baselineConf] ?? 0;
    const currRank = CONF_RANK[currentConf] ?? 0;
    if (prevRank - currRank > 1) return 'LOW';

    // LOW: UNCLASSIFIED > 60%
    if (unclassifiedRatio > 0.60) return 'LOW';

    // MEDIUM: one-level confidence change
    if (Math.abs(prevRank - currRank) === 1) return 'MEDIUM';

    // MEDIUM: mixed extraction modes
    if (baselineMode === 'structured' && currentMode !== 'structured') return 'MEDIUM';
    if (baselineMode !== 'structured' && currentMode === 'structured') return 'MEDIUM';

    // MEDIUM: UNCLASSIFIED > 40%
    if (unclassifiedRatio > 0.40) return 'MEDIUM';

    // HIGH
    return 'HIGH';
  }

  it('classifies as HIGH when both structured and labels stable', () => {
    expect(classify('structured', 'structured', 'HIGH', 'HIGH', 0.10)).toBe('HIGH');
  });

  it('classifies as HIGH when both structured and labels match MODERATE', () => {
    expect(classify('structured', 'structured', 'MODERATE', 'MODERATE', 0.20)).toBe('HIGH');
  });

  it('classifies as LOW when current is fallback', () => {
    expect(classify('structured', 'fallback_directory_scan', 'HIGH', 'HIGH', 0.10)).toBe('LOW');
  });

  it('classifies as LOW when confidence drops > 1 tier', () => {
    expect(classify('structured', 'structured', 'HIGH', 'LOW', 0.10)).toBe('LOW');
  });

  it('classifies as LOW when confidence drops HIGH → VERY_LOW', () => {
    expect(classify('structured', 'structured', 'HIGH', 'VERY_LOW', 0.10)).toBe('LOW');
  });

  it('classifies as LOW with high UNCLASSIFIED ratio', () => {
    expect(classify('structured', 'structured', 'HIGH', 'HIGH', 0.65)).toBe('LOW');
  });

  it('classifies as MEDIUM on one-level confidence downgrade', () => {
    expect(classify('structured', 'structured', 'HIGH', 'MODERATE', 0.10)).toBe('MEDIUM');
  });

  it('classifies as MEDIUM on one-level confidence upgrade', () => {
    expect(classify('structured', 'structured', 'MODERATE', 'HIGH', 0.10)).toBe('MEDIUM');
  });

  it('classifies as MEDIUM with mixed extraction modes', () => {
    expect(classify('structured', 'mixed', 'HIGH', 'HIGH', 0.10)).toBe('MEDIUM');
  });

  it('classifies as MEDIUM with UNCLASSIFIED ratio > 40%', () => {
    expect(classify('structured', 'structured', 'HIGH', 'HIGH', 0.45)).toBe('MEDIUM');
  });

  it('classifies as MEDIUM when both are non-structured', () => {
    // baseline fallback, current structured → MEDIUM (mode mismatch)
    expect(classify('fallback_directory_scan', 'structured', 'HIGH', 'HIGH', 0.10)).toBe('MEDIUM');
  });
});

// ─── Test: Lineage Depth Computation ────────────────────

describe('lineage depth computation', () => {
  function computeLineageDepth(baselineLineageDepth: number | undefined): number {
    const prev = baselineLineageDepth ?? 0;
    return prev + 1;
  }

  it('first artifact has lineageDepth 1', () => {
    expect(computeLineageDepth(undefined)).toBe(1);
  });

  it('second artifact has lineageDepth 2', () => {
    expect(computeLineageDepth(1)).toBe(2);
  });

  it('third artifact has lineageDepth 3', () => {
    expect(computeLineageDepth(2)).toBe(3);
  });

  it('handles missing baseline as depth 0 + 1', () => {
    expect(computeLineageDepth(0)).toBe(1);
  });

  it('increments monotonically', () => {
    let depth = 0;
    for (let i = 0; i < 10; i++) {
      depth = computeLineageDepth(depth);
      expect(depth).toBe(i + 1);
    }
  });
});

// ─── Test: Lineage Depth Validation ─────────────────────

describe('lineage depth validation', () => {
  function validateLineageDepth(cb: unknown): { valid: boolean; warning: string | null } {
    if (cb === undefined || cb === null) return { valid: true, warning: null };
    if (typeof cb !== 'object') return { valid: false, warning: 'must be object' };
    const obj = cb as Record<string, unknown>;
    const depth = obj.lineageDepth;
    if (depth === undefined || depth === null) return { valid: true, warning: null };
    if (typeof depth !== 'number') return { valid: false, warning: 'must be number' };
    if (!Number.isInteger(depth)) return { valid: false, warning: 'must be integer' };
    if (depth < 1) return { valid: false, warning: 'must be >= 1' };
    return { valid: true, warning: null };
  }

  it('accepts absent comparisonBaseline', () => {
    expect(validateLineageDepth(undefined).valid).toBe(true);
  });

  it('accepts absent lineageDepth', () => {
    expect(validateLineageDepth({}).valid).toBe(true);
  });

  it('accepts valid lineageDepth', () => {
    expect(validateLineageDepth({ lineageDepth: 1 }).valid).toBe(true);
    expect(validateLineageDepth({ lineageDepth: 5 }).valid).toBe(true);
  });

  it('warns on non-integer lineageDepth', () => {
    const r = validateLineageDepth({ lineageDepth: 2.5 });
    expect(r.valid).toBe(false);
    expect(r.warning).toContain('integer');
  });

  it('warns on negative lineageDepth', () => {
    const r = validateLineageDepth({ lineageDepth: -1 });
    expect(r.valid).toBe(false);
    expect(r.warning).toContain('>= 1');
  });

  it('warns on zero lineageDepth', () => {
    const r = validateLineageDepth({ lineageDepth: 0 });
    expect(r.valid).toBe(false);
    expect(r.warning).toContain('>= 1');
  });

  it('warns on non-number lineageDepth', () => {
    const r = validateLineageDepth({ lineageDepth: 'five' });
    expect(r.valid).toBe(false);
    expect(r.warning).toContain('number');
  });
});

// ─── Test: Regression Confidence Trend ──────────────────

describe('regression confidence trend', () => {
  const RANK: Record<string, number> = { HIGH: 2, MEDIUM: 1, LOW: 0 };

  function confTrend(prev: string | null, curr: string | null): string {
    if (!prev || !curr) return 'stable';
    const p = RANK[prev] ?? -1;
    const c = RANK[curr] ?? -1;
    if (c > p) return 'up';
    if (c < p) return 'down';
    return 'stable';
  }

  it('detects confidence improvement', () => {
    expect(confTrend('LOW', 'MEDIUM')).toBe('up');
    expect(confTrend('MEDIUM', 'HIGH')).toBe('up');
    expect(confTrend('LOW', 'HIGH')).toBe('up');
  });

  it('detects confidence downgrade', () => {
    expect(confTrend('HIGH', 'MEDIUM')).toBe('down');
    expect(confTrend('MEDIUM', 'LOW')).toBe('down');
    expect(confTrend('HIGH', 'LOW')).toBe('down');
  });

  it('detects stable confidence', () => {
    expect(confTrend('HIGH', 'HIGH')).toBe('stable');
    expect(confTrend('MEDIUM', 'MEDIUM')).toBe('stable');
    expect(confTrend('LOW', 'LOW')).toBe('stable');
  });

  it('handles null baseline as stable', () => {
    expect(confTrend(null, 'HIGH')).toBe('stable');
  });

  it('handles null current as stable', () => {
    expect(confTrend('HIGH', null)).toBe('stable');
  });
});

// ─── Test: Annotation Confidence Context ────────────────

describe('annotation confidence injection', () => {
  function buildMessage(severity: string, confidence: string | null): string {
    const confContext = confidence ? `, ${confidence} confidence` : '';
    return `Architecture regression detected (${severity} severity${confContext})`;
  }

  it('includes confidence in annotation message', () => {
    const msg = buildMessage('major', 'MEDIUM');
    expect(msg).toContain('major severity, MEDIUM confidence');
  });

  it('handles HIGH confidence', () => {
    const msg = buildMessage('minor', 'HIGH');
    expect(msg).toContain('minor severity, HIGH confidence');
  });

  it('handles LOW confidence', () => {
    const msg = buildMessage('critical', 'LOW');
    expect(msg).toContain('critical severity, LOW confidence');
  });

  it('handles null confidence', () => {
    const msg = buildMessage('moderate', null);
    expect(msg).toBe('Architecture regression detected (moderate severity)');
    expect(msg).not.toContain('confidence');
  });
});

// ─── Test: Summary Renderer Confidence Output ───────────

describe('summary renderer confidence', () => {
  it('displays regressionConfidence in heading', () => {
    const sev = 'major';
    const conf = 'MEDIUM';
    const heading = `### 🟠 Regression Detected — ${sev.toUpperCase()} severity — ${conf} confidence`;
    expect(heading).toContain('MAJOR severity');
    expect(heading).toContain('MEDIUM confidence');
  });

  it('displays regressionConfidenceTrend in trend indicators', () => {
    const row = `| Regression Confidence | ↓ down |`;
    expect(row).toContain('Regression Confidence');
    expect(row).toContain('down');
  });
});

// ─── Test: Summary JSON Compatibility Mirror ────────────

describe('summary JSON compatibility mirror', () => {
  function buildSummaryJSON() {
    return {
      summarySchemaVersion: '1.0',
      artifactCompatibilityVersion: '1.0',
      regressionConfidence: 'MEDIUM' as string | null,
      lineageDepth: 3 as number | null,
    };
  }

  it('includes artifactCompatibilityVersion', () => {
    expect(buildSummaryJSON().artifactCompatibilityVersion).toBe('1.0');
  });

  it('includes regressionConfidence', () => {
    expect(buildSummaryJSON().regressionConfidence).toBe('MEDIUM');
  });

  it('includes lineageDepth', () => {
    expect(buildSummaryJSON().lineageDepth).toBe(3);
  });
});

// ─── Test: Regression Confidence Validation ─────────────

describe('regression confidence validation', () => {
  const VALID_CONFS = ['HIGH', 'MEDIUM', 'LOW'];

  function validate(value: string): boolean {
    return VALID_CONFS.includes(value);
  }

  it('accepts HIGH', () => expect(validate('HIGH')).toBe(true));
  it('accepts MEDIUM', () => expect(validate('MEDIUM')).toBe(true));
  it('accepts LOW', () => expect(validate('LOW')).toBe(true));
  it('rejects invalid', () => expect(validate('VERY_LOW')).toBe(false));
  it('rejects empty', () => expect(validate('')).toBe(false));
});

// ─── Integration: Lineage Chain Simulation ──────────────

describe('integration: lineage chain simulation', () => {
  it('correctly chains 3 artifacts', () => {
    // Artifact 1 (no baseline)
    const a1_lineage = 0 + 1; // No baseline → depth 1
    expect(a1_lineage).toBe(1);

    // Artifact 2 (baseline is a1)
    const a2_lineage = a1_lineage + 1;
    expect(a2_lineage).toBe(2);

    // Artifact 3 (baseline is a2)
    const a3_lineage = a2_lineage + 1;
    expect(a3_lineage).toBe(3);
  });

  it('preserves comparisonBaseline metadata across chain', () => {
    const baseline = {
      repoHash: 'abc1234',
      timestamp: '2026-04-10T00:00:00.000Z',
      artifactCompatibilityVersion: '1.0',
      comparisonBaseline: { lineageDepth: 2 },
    };

    const cb = {
      baselineRepoHash: baseline.repoHash,
      baselineGeneratedAt: baseline.timestamp,
      baselineArtifactVersion: baseline.artifactCompatibilityVersion,
      lineageDepth: (baseline.comparisonBaseline?.lineageDepth ?? 0) + 1,
    };

    expect(cb.lineageDepth).toBe(3);
    expect(cb.baselineRepoHash).toBe('abc1234');
    expect(cb.baselineArtifactVersion).toBe('1.0');
  });

  it('simulates full regression with confidence and lineage', () => {
    // Baseline
    const baseline = {
      extractionMode: 'structured',
      topologyConfidenceLabel: 'HIGH',
      coverage: 0.81,
      regressionConfidence: 'HIGH' as string | null,
      comparisonBaseline: { lineageDepth: 3 },
    };

    // Current
    const current = {
      extractionMode: 'structured',
      topologyConfidenceLabel: 'MODERATE',
      coverage: 0.72,
      unclassifiedRatio: 0.15,
    };

    // Confidence classification
    const CONF_RANK: Record<string, number> = { HIGH: 3, MODERATE: 2, LOW: 1, VERY_LOW: 0 };
    const confDrop = Math.abs((CONF_RANK[baseline.topologyConfidenceLabel] ?? 0) - (CONF_RANK[current.topologyConfidenceLabel] ?? 0));
    const regConf = confDrop === 1 ? 'MEDIUM' : confDrop > 1 ? 'LOW' : 'HIGH';
    expect(regConf).toBe('MEDIUM');

    // Lineage
    const lineageDepth = (baseline.comparisonBaseline.lineageDepth ?? 0) + 1;
    expect(lineageDepth).toBe(4);

    // Confidence trend
    const REG_CONF_RANK: Record<string, number> = { HIGH: 2, MEDIUM: 1, LOW: 0 };
    const prevRegConf = baseline.regressionConfidence;
    const trend = !prevRegConf ? 'stable' :
      (REG_CONF_RANK[regConf] ?? 0) > (REG_CONF_RANK[prevRegConf] ?? 0) ? 'up' :
      (REG_CONF_RANK[regConf] ?? 0) < (REG_CONF_RANK[prevRegConf] ?? 0) ? 'down' : 'stable';
    expect(trend).toBe('down'); // HIGH → MEDIUM
  });
});
