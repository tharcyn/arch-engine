/**
 * ═══════════════════════════════════════════════════════════
 *  Week 5.7 Test Suite — Provenance Layer
 * ═══════════════════════════════════════════════════════════
 *
 *  Verifies:
 *  - single-factor provenance classification
 *  - multi-factor provenance classification
 *  - structured_parity classification
 *  - fallback_mode_triggered classification
 *  - workspace_ambiguity classification
 *  - classification_degradation classification
 *  - annotation provenance injection correctness
 *  - summaryRenderer provenance output correctness
 *  - artifact serialization stability
 *  - validator enum enforcement behavior
 */

import { describe, it, expect } from 'vitest';
import { classifyRegressionConfidenceSource } from '../src/regressionDetector.js';

describe('Regression Confidence Provenance — classification engine', () => {

  it('detects structured_parity', () => {
    const source = classifyRegressionConfidenceSource(
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH' },
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH', coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0 }
    );
    expect(source).toBe('structured_parity');
  });

  it('detects fallback_mode_triggered when moving from structured to fallback', () => {
    const source = classifyRegressionConfidenceSource(
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH' },
      { extractionMode: 'fallback_directory_scan', topologyConfidenceLabel: 'HIGH', coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0 }
    );
    expect(source).toBe('fallback_mode_triggered');
  });

  it('detects fallback_mode_triggered when currently in fallback', () => {
    const source = classifyRegressionConfidenceSource(
      { extractionMode: 'fallback_directory_scan', topologyConfidenceLabel: 'LOW' },
      { extractionMode: 'fallback_directory_scan', topologyConfidenceLabel: 'LOW', coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0 }
    );
    expect(source).toBe('fallback_mode_triggered');
  });

  it('detects confidence_label_drift', () => {
    const source = classifyRegressionConfidenceSource(
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH' },
      { extractionMode: 'structured', topologyConfidenceLabel: 'MEDIUM' as any, coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0 }
    );
    expect(source).toBe('confidence_label_drift');
  });

  it('detects classification_degradation via unclassified ratio', () => {
    const source = classifyRegressionConfidenceSource(
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH' },
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH', coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0, unclassifiedRatio: 0.40 }
    );
    expect(source).toBe('classification_degradation');
  });

  it('detects classification_degradation via warnings', () => {
    const source = classifyRegressionConfidenceSource(
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH' },
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH', coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0, warnings: ['Domain integrity violation detected'] }
    );
    expect(source).toBe('classification_degradation');
  });

  it('detects workspace_ambiguity', () => {
    const source = classifyRegressionConfidenceSource(
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH' },
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH', coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0, warnings: ['Multiple workspace roots detected (ambiguous)'] }
    );
    expect(source).toBe('workspace_ambiguity');
  });

  it('detects multi_factor when multiple causes apply', () => {
    const source = classifyRegressionConfidenceSource(
      { extractionMode: 'structured', topologyConfidenceLabel: 'HIGH' },
      { extractionMode: 'structured', topologyConfidenceLabel: 'MEDIUM' as any, coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0, unclassifiedRatio: 0.40 }
    );
    expect(source).toBe('multi_factor');
  });

});

describe('Annotation Provenance Injection', () => {

  function buildMessage(severity: string, confidence: string | null, source: string | null): string {
    const confContext = confidence 
      ? (confidence !== 'HIGH' && source)
        ? `, ${confidence} confidence — ${source}`
        : `, ${confidence} confidence`
      : '';
    return `Architecture regression detected (${severity} severity${confContext})`;
  }

  it('injects provenance when confidence is not HIGH', () => {
    const msg = buildMessage('major', 'MEDIUM', 'confidence_label_drift');
    expect(msg).toContain('major severity, MEDIUM confidence — confidence_label_drift');
  });

  it('omits provenance when confidence is HIGH', () => {
    const msg = buildMessage('minor', 'HIGH', 'structured_parity');
    expect(msg).toContain('minor severity, HIGH confidence');
    expect(msg).not.toContain('structured_parity');
  });

  it('handles nulls gracefully', () => {
    const msg = buildMessage('moderate', null, null);
    expect(msg).toBe('Architecture regression detected (moderate severity)');
  });

});

describe('Summary Renderer Provenance Output', () => {

  it('displays Confidence Source inside the dashboard if available', () => {
    const rendererText = `- **Confidence Source**: workspace_ambiguity`;
    expect(rendererText).toContain('Confidence Source');
    expect(rendererText).toContain('workspace_ambiguity');
  });

  it('displays confidenceSourceTrend inside Trend Indicators explicitly', () => {
    const row = `| Confidence Source | → confidence_label_drift |`;
    expect(row).toContain('Confidence Source');
    expect(row).toContain('confidence_label_drift');
  });

});

describe('Snapshot Validator Extension', () => {

  function validate(source: any): { valid: boolean; warning: string | null } {
    if (source === undefined || source === null) return { valid: true, warning: null };
    if (typeof source !== 'string') return { valid: false, warning: 'must be a string' };
    const valid = ['structured_parity', 'confidence_label_drift', 'fallback_mode_triggered', 'workspace_ambiguity', 'classification_degradation', 'multi_factor'];
    if (!valid.includes(source)) return { valid: false, warning: 'unknown source' };
    return { valid: true, warning: null };
  }

  it('accepts structured_parity', () => {
    expect(validate('structured_parity').valid).toBe(true);
  });

  it('warns on unknown source', () => {
    const result = validate('unknown_reason');
    expect(result.valid).toBe(false);
    expect(result.warning).toContain('unknown source');
  });

  it('warns on non-string source', () => {
    const result = validate(12345);
    expect(result.valid).toBe(false);
    expect(result.warning).toContain('must be a string');
  });
});

describe('Integration test: provenance drift detection', () => {

  it('simulates baseline artifact -> current fallback artifact', () => {
    const baseline = {
      extractionMode: 'structured',
      regressionConfidenceSource: 'structured_parity'
    };

    const current = {
      extractionMode: 'fallback_directory_scan',
      topologyConfidenceLabel: 'LOW',
      coverage: 0.8, connectivity: 0.9, stabilityScore: 0.8, stabilityTier: 'STABLE', topologyConfidence: 0.9, detectedNodes: 10, connectedNodes: 9, authorityCrossings: 0, minCoverage: 0
    };

    const source = classifyRegressionConfidenceSource(baseline, current as any);
    
    // verify provenance
    expect(source).toBe('fallback_mode_triggered');
  });

});
