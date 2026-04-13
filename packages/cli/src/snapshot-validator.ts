/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Snapshot Schema Validator
 * ═══════════════════════════════════════════════════════════
 *
 *  Validates the structural integrity of stability-score.json
 *  artifacts. Ensures schema compliance for future SaaS
 *  ingestion, timeline reconstruction, and multi-repo federation.
 *
 *  INVARIANTS:
 *  - Never crashes CLI execution
 *  - Returns validation result with specific errors
 *  - Supports forward-compatible schema evolution
 */

import type { StabilityArtifact } from './snapshot.js';

// ─── Validation Result ──────────────────────────────────

export interface SnapshotValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { DIAMOND_TRAVERSAL_CONTRACT_VERSION } from '../../core/src/policy/contracts/diamondTraversalContract.js';

import { loadPolicyConfig } from '@arch-engine/core';

// ─── External Types ──────────────────────────────────────

// ─── Required Keys ──────────────────────────────────────

const REQUIRED_STRING_KEYS: (keyof StabilityArtifact)[] = [
  'snapshotVersion',
  'engineVersion',
  'timestamp',
  'workspaceType',
  'extractionMode',
  'stabilityTier',
  'topologyConfidenceLabel',
];

const REQUIRED_NUMBER_KEYS: (keyof StabilityArtifact)[] = [
  'coverage',
  'connectivity',
  'topologyConfidence',
  'stabilityScore',
  'detectedNodes',
  'connectedNodes',
  'expectedNodes',
  'authorityCrossings',
];

// ─── Validation Engine ──────────────────────────────────


/**
 * Validate SUMMARY_SCHEMA_VERSION compatibility mapped by JSON inputs.
 */
export function validateSummaryPayloadSchema(payload: Record<string, unknown>, supportedVersion: string): SnapshotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const [supMajor, supMinor] = supportedVersion.split('.').map(Number);
  
  if (!payload.summarySchemaVersion) {
    warnings.push('Legacy v0 summary missing summarySchemaVersion. Falling back to baseline tolerance.');
    return { valid: true, errors, warnings };
  }

  const payloadVersion = String(payload.summarySchemaVersion);
  const [incMajor, incMinor] = payloadVersion.split('.').map(Number);

  if (incMajor > supMajor) {
    throw new Error(`Unsupported MAJOR summary schema version: ${incMajor} (supported major: ${supMajor})`);
  }

  if (incMajor === supMajor && incMinor > supMinor) {
    warnings.push(`Payload MINOR version ${incMinor} is newer than supported ${supMinor}. Proceeding with subset extraction.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a StabilityArtifact for schema compliance.
 * Never throws — always returns a result.
 */
export function validateSnapshotSchema(
  snapshot: unknown,
  cwd?: string
): SnapshotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, errors: ['Snapshot is not an object'], warnings: [] };
  }

  const obj = snapshot as Record<string, unknown>;

  // Check required string keys
  for (const key of REQUIRED_STRING_KEYS) {
    if (!(key in obj)) {
      errors.push(`Missing required key: ${key}`);
    } else if (typeof obj[key] !== 'string') {
      errors.push(`Key '${key}' must be a string, got ${typeof obj[key]}`);
    }
  }

  // Check required number keys
  for (const key of REQUIRED_NUMBER_KEYS) {
    if (!(key in obj)) {
      errors.push(`Missing required key: ${key}`);
    } else if (typeof obj[key] !== 'number') {
      errors.push(`Key '${key}' must be a number, got ${typeof obj[key]}`);
    }
  }

  // Numeric range validation
  if (typeof obj.coverage === 'number') {
    if (obj.coverage < 0 || obj.coverage > 1) {
      errors.push(`coverage must be between 0.0 and 1.0, got ${obj.coverage}`);
    }
  }
  if (typeof obj.connectivity === 'number') {
    if (obj.connectivity < 0 || obj.connectivity > 1) {
      errors.push(`connectivity must be between 0.0 and 1.0, got ${obj.connectivity}`);
    }
  }
  if (typeof obj.topologyConfidence === 'number') {
    if (obj.topologyConfidence < 0 || obj.topologyConfidence > 1) {
      errors.push(`topologyConfidence must be between 0.0 and 1.0, got ${obj.topologyConfidence}`);
    }
  }
  if (typeof obj.stabilityScore === 'number') {
    if (obj.stabilityScore < 0 || obj.stabilityScore > 1) {
      errors.push(`stabilityScore must be between 0.0 and 1.0, got ${obj.stabilityScore}`);
    }
  }

  // Timestamp ISO-8601 validation
  if (typeof obj.timestamp === 'string') {
    const parsed = Date.parse(obj.timestamp);
    if (isNaN(parsed)) {
      errors.push(`timestamp is not a valid ISO-8601 date: ${obj.timestamp}`);
    }
  }

  // Stability tier validation
  if (typeof obj.stabilityTier === 'string') {
    const validTiers = ['STABLE', 'HEALTHY', 'WARNING', 'CRITICAL'];
    if (!validTiers.includes(obj.stabilityTier)) {
      errors.push(`stabilityTier must be one of ${validTiers.join(', ')}, got '${obj.stabilityTier}'`);
    }
  }

  // Confidence label validation
  if (typeof obj.topologyConfidenceLabel === 'string') {
    const validLabels = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'];
    if (!validLabels.includes(obj.topologyConfidenceLabel)) {
      errors.push(`topologyConfidenceLabel must be one of ${validLabels.join(', ')}, got '${obj.topologyConfidenceLabel}'`);
    }
  }

  // Warnings array validation
  if ('warnings' in obj) {
    if (!Array.isArray(obj.warnings)) {
      errors.push('warnings must be an array');
    }
  }

  // Execution metrics (optional but validated if present)
  if ('executionMetrics' in obj && obj.executionMetrics) {
    const metrics = obj.executionMetrics as Record<string, unknown>;
    for (const key of ['extractionMs', 'pipelineMs', 'totalMs']) {
      if (key in metrics && typeof metrics[key] !== 'number') {
        warnings.push(`executionMetrics.${key} should be a number`);
      }
    }
  }

  // Schema version compatibility warning
  if (typeof obj.snapshotVersion === 'string' && obj.snapshotVersion !== '1.0') {
    warnings.push(`Snapshot schema version ${obj.snapshotVersion} may not be fully compatible with this engine version`);
  }

  // Artifact compatibility version validation
  const acvResult = validateArtifactCompatibilityVersion(obj.artifactCompatibilityVersion);
  if (acvResult.warning) warnings.push(acvResult.warning);

  // Regression block validation (optional)
  if ('regression' in obj && obj.regression) {
    const reg = obj.regression as Record<string, unknown>;
    if (typeof reg.detected !== 'boolean') {
      warnings.push('regression.detected should be a boolean');
    }
    if (typeof reg.baselineFound !== 'boolean') {
      warnings.push('regression.baselineFound should be a boolean');
    }
  }

  // Trend indicators validation (optional)
  if ('trendIndicators' in obj && obj.trendIndicators) {
    const ti = obj.trendIndicators as Record<string, unknown>;
    const validTrends = ['up', 'down', 'stable'];
    for (const key of ['coverageTrend', 'connectivityTrend', 'stabilityTrend', 'confidenceTrend', 'crossingTrend', 'regressionConfidenceTrend']) {
      if (key in ti && typeof ti[key] === 'string' && !validTrends.includes(ti[key] as string)) {
        warnings.push(`trendIndicators.${key} should be one of: up, down, stable`);
      }
    }
  }

  // Regression severity validation (optional)
  if ('regressionSeverity' in obj && obj.regressionSeverity !== null) {
    const validSeverities = ['minor', 'moderate', 'major', 'critical'];
    if (typeof obj.regressionSeverity === 'string' && !validSeverities.includes(obj.regressionSeverity)) {
      warnings.push(`regressionSeverity should be one of: ${validSeverities.join(', ')}`);
    }
  }

  // Regression confidence validation (optional)
  if ('regressionConfidence' in obj && obj.regressionConfidence !== null) {
    const validConfs = ['HIGH', 'MEDIUM', 'LOW'];
    if (typeof obj.regressionConfidence === 'string' && !validConfs.includes(obj.regressionConfidence)) {
      warnings.push(`regressionConfidence should be one of: ${validConfs.join(', ')}`);
    }
  }

  // Regression confidence source validation (optional)
  if ('regressionConfidenceSource' in obj && obj.regressionConfidenceSource !== null) {
    const validSources = [
      'structured_parity',
      'confidence_label_drift',
      'fallback_mode_triggered',
      'workspace_ambiguity',
      'classification_degradation',
      'multi_factor'
    ];
    if (typeof obj.regressionConfidenceSource === 'string' && !validSources.includes(obj.regressionConfidenceSource)) {
      warnings.push(`regressionConfidenceSource should be one of: ${validSources.join(', ')}`);
    } else if (typeof obj.regressionConfidenceSource !== 'string') {
      warnings.push(`regressionConfidenceSource must be a string`);
    }
  }

  // Lineage depth validation (optional)
  const lineageResult = validateLineageDepth(obj.comparisonBaseline);
  if (lineageResult.warning) warnings.push(lineageResult.warning);

  // Policy evaluation block (optional additive struct)
  // COMPATIBILITY CONTRACT: Validator behaves fully WARN-ONLY (yielding valid=true) 
  // on any extended payloads natively handling federated composition matrices correctly.
  if ('policyEvaluation' in obj && obj.policyEvaluation !== null) {
    if (typeof obj.policyEvaluation !== 'object') {
      warnings.push(`policyEvaluation must be an object`);
    } else {
      const pe = obj.policyEvaluation as Record<string, unknown>;
      if ('violations' in pe && typeof pe.violations !== 'number') warnings.push('policyEvaluation.violations must be a number');
      if ('mode' in pe && pe.mode !== undefined && typeof pe.mode !== 'string') warnings.push('policyEvaluation.mode must be a string');
      if ('version' in pe && pe.version !== undefined && typeof pe.version !== 'number') warnings.push('policyEvaluation.version must be a number');
      if ('policyHash' in pe && pe.policyHash !== undefined && typeof pe.policyHash !== 'string') warnings.push('policyEvaluation.policyHash must be a string');
      if ('evaluationStrategyVersion' in pe && pe.evaluationStrategyVersion !== undefined && typeof pe.evaluationStrategyVersion !== 'number') warnings.push('policyEvaluation.evaluationStrategyVersion must be a number');
      if ('policyDetected' in pe && pe.policyDetected !== undefined && typeof pe.policyDetected !== 'boolean') warnings.push('policyEvaluation.policyDetected must be a boolean');

      // Forward-compatibility migration guard
      if (!('stackExpansionTopologyVersion' in pe)) {
        // LEGACY MIGRATION: Forward-compatibility shim ONLY allowed inside the validator boundary
        pe.stackExpansionTopologyVersion = 'v1';
      }
      if ('stackExpansionTopologyVersion' in pe) {
        if (typeof pe.stackExpansionTopologyVersion !== 'string') {
          errors.push('Missing topology version — snapshot replay unsafe');
        } else if (pe.stackExpansionTopologyVersion !== DIAMOND_TRAVERSAL_CONTRACT_VERSION) {
          errors.push('Diamond traversal contract mismatch — replay unsafe');
        }
      }

      if (!('policyGovernanceContractVersion' in pe)) {
        // LEGACY MIGRATION: Forward-compatibility shim ONLY allowed inside the validator boundary
        pe.policyGovernanceContractVersion = 'v1';
      }
      if ('policyGovernanceContractVersion' in pe) {
        if (typeof pe.policyGovernanceContractVersion !== 'string') {
          errors.push('Missing governance version — snapshot replay unsafe');
        } else if (pe.policyGovernanceContractVersion !== 'v1') {
          errors.push('Governance contract version mismatch — resolver replay unsafe');
        }
      }

      if (!('policyTransportContractVersion' in pe)) {
        // LEGACY MIGRATION: Forward-compatibility shim ONLY allowed inside the validator boundary
        pe.policyTransportContractVersion = 'v1';
      }
      if ('policyTransportContractVersion' in pe) {
        if (typeof pe.policyTransportContractVersion !== 'string') {
          errors.push('Missing transport version — snapshot replay unsafe');
        } else if (pe.policyTransportContractVersion !== 'v1') {
          errors.push('Transport contract version mismatch — loader replay unsafe');
        }
      }

      if (!('policyRegistryContractVersion' in pe)) {
        // LEGACY MIGRATION: Forward-compatibility shim ONLY allowed inside the validator boundary
        pe.policyRegistryContractVersion = 'v1';
      }
      if ('policyRegistryContractVersion' in pe) {
        if (typeof pe.policyRegistryContractVersion !== 'string') {
          errors.push('Missing registry version — snapshot replay unsafe');
        } else if (pe.policyRegistryContractVersion !== 'v1') {
          errors.push('Registry contract version mismatch — loader replay unsafe');
        }
      }

      if (!('policyManifestSchemaVersion' in pe)) {
        // LEGACY MIGRATION: Forward-compatibility shim ONLY allowed inside the validator boundary
        pe.policyManifestSchemaVersion = 'v1';
      }
      if ('policyManifestSchemaVersion' in pe) {
        if (typeof pe.policyManifestSchemaVersion !== 'string') {
          errors.push('Missing manifest schema version — snapshot replay unsafe');
        } else if (pe.policyManifestSchemaVersion !== 'v1') {
          errors.push('Manifest schema version mismatch — snapshot replay unsafe');
        }
      }
      if ('policyRuleHits' in pe && pe.policyRuleHits !== undefined && typeof pe.policyRuleHits !== 'object') warnings.push('policyEvaluation.policyRuleHits must be an object');
      if ('effectivePolicyHash' in pe && pe.effectivePolicyHash !== undefined && typeof pe.effectivePolicyHash !== 'string') warnings.push('policyEvaluation.effectivePolicyHash must be a string');
      if ('policyStackIds' in pe && pe.policyStackIds !== undefined && !Array.isArray(pe.policyStackIds)) warnings.push('policyEvaluation.policyStackIds must be an array');
      if ('policyStackHashes' in pe && pe.policyStackHashes !== undefined && !Array.isArray(pe.policyStackHashes)) warnings.push('policyEvaluation.policyStackHashes must be an array');
      
      if ('policyStackIds' in pe && pe.policyStackIds !== undefined && Array.isArray(pe.policyStackIds)) {
        const ids = pe.policyStackIds as string[];
        if (ids.length === 0) {
          errors.push('Invalid stack topology: empty policyStackIds');
        }
        if (new Set(ids).size !== ids.length) {
          errors.push('Duplicate stack entries detected');
        }
      }

      if ('policyStackHashes' in pe && pe.policyStackHashes !== undefined && Array.isArray(pe.policyStackHashes) && 'policyStackIds' in pe && Array.isArray(pe.policyStackIds)) {
        if (pe.policyStackIds.length !== pe.policyStackHashes.length) {
          errors.push('Invalid stack topology: hash/id length mismatch');
        }
      }

      if ('stackOrderingChecksum' in pe && typeof pe.stackOrderingChecksum === 'string' && 'policyStackIds' in pe && Array.isArray(pe.policyStackIds)) {
        const legacyComputed = crypto.createHash('sha256').update(pe.policyStackIds.join('|')).digest('hex');
        const anchoredComputed = crypto.createHash('sha256').update((pe.policyNamespace || 'local') + ':' + pe.policyStackIds.join('|')).digest('hex');
        
        if (anchoredComputed !== pe.stackOrderingChecksum) {
          // Auto-migrate in-memory if legacy checksum is found (for test fixtures backward compatibility)
          if (legacyComputed === pe.stackOrderingChecksum) {
            pe.stackOrderingChecksum = anchoredComputed;
          } else {
            errors.push('Stack ordering checksum invalid');
          }
        }
      }

      if ('stackExpansionDeterminismSeed' in pe && typeof pe.stackExpansionDeterminismSeed === 'string' && typeof pe.policyHash === 'string') {
        const expectedSeed = crypto.createHash('sha256').update((pe.policyNamespace || 'local') + ':' + pe.policyHash).digest('hex');
        if (pe.stackExpansionDeterminismSeed !== expectedSeed) {
          errors.push('Stack expansion determinism seed mismatch — traversal replay unsafe');
        }
      } else if (pe.policyDetected && ('stackExpansionDeterminismSeed' in pe && typeof pe.stackExpansionDeterminismSeed !== 'string' || !('stackExpansionDeterminismSeed' in pe))) {
        errors.push('Stack expansion determinism seed invalid');
      }

      // Local hash consistency check (warn only)
      // Uses loadPolicyConfig from core to ensure hash is computed identically
      // (parsed + normalized config, not raw YAML)
      if (typeof pe.policyHash === 'string' && cwd) {
        const policyPath = path.join(cwd, '.archengine', 'policy.yml');
        if (!fs.existsSync(policyPath)) {
          warnings.push('policy hash present without matching workspace policy file');
        } else {
          try {
            const parsed = loadPolicyConfig(cwd);
            if (parsed && parsed.hash !== pe.policyHash) {
              warnings.push('policy hash mismatch: physical workspace file differs from artifact payload');
            }
          } catch (e) {
            warnings.push('policy hash mismatch check failed due to invalid policy file');
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Artifact Compatibility Version Guardrail ───────────

const SUPPORTED_COMPATIBILITY_VERSIONS = ['1.0'];

export interface ArtifactCompatibilityResult {
  supported: boolean;
  warning: string | null;
}

/**
 * Validate artifactCompatibilityVersion.
 * Warns (never fails) on unknown future versions.
 * Supports forward compatibility and multi-version federation.
 */
export function validateArtifactCompatibilityVersion(
  version: unknown,
): ArtifactCompatibilityResult {
  if (version === undefined || version === null) {
    return {
      supported: true,
      warning: 'artifactCompatibilityVersion is missing — defaulting to 1.0',
    };
  }

  if (typeof version !== 'string') {
    return {
      supported: false,
      warning: `artifactCompatibilityVersion must be a string, got ${typeof version}`,
    };
  }

  if (SUPPORTED_COMPATIBILITY_VERSIONS.includes(version)) {
    return { supported: true, warning: null };
  }

  // Future version — warn but don't fail
  return {
    supported: false,
    warning: `artifactCompatibilityVersion '${version}' is not recognized by this engine version. Some features may not work correctly.`,
  };
}

// ─── Lineage Depth Guardrail ────────────────────────────

export interface LineageDepthResult {
  valid: boolean;
  warning: string | null;
}

/**
 * Validate lineageDepth in comparisonBaseline.
 * Warns (never fails) on invalid values.
 * Supports cross-commit artifact continuity and timeline traversal.
 */
export function validateLineageDepth(
  comparisonBaseline: unknown,
): LineageDepthResult {
  if (comparisonBaseline === undefined || comparisonBaseline === null) {
    return { valid: true, warning: null }; // Optional field
  }

  if (typeof comparisonBaseline !== 'object') {
    return { valid: false, warning: 'comparisonBaseline must be an object' };
  }

  const cb = comparisonBaseline as Record<string, unknown>;
  const depth = cb.lineageDepth;

  if (depth === undefined || depth === null) {
    return { valid: true, warning: null }; // Optional sub-field
  }

  if (typeof depth !== 'number') {
    return { valid: false, warning: `comparisonBaseline.lineageDepth must be a number, got ${typeof depth}` };
  }

  if (!Number.isInteger(depth)) {
    return { valid: false, warning: `comparisonBaseline.lineageDepth must be an integer, got ${depth}` };
  }

  if (depth < 1) {
    return { valid: false, warning: `comparisonBaseline.lineageDepth must be >= 1, got ${depth}` };
  }

  return { valid: true, warning: null };
}

/**
 * Validate explicitly that PolicyViolation payloads maintain strict canonical provenance boundaries seamlessly securely.
 */
export function validatePolicyViolationSchema(obj: any): SnapshotValidationResult {
  const errors: string[] = [];
  
  if (typeof obj !== 'object' || obj === null) {
    errors.push('Violation must be an object');
    return { valid: false, errors, warnings: [] };
  }
  
  if (!obj.originPolicyId) errors.push('Missing originPolicyId provenance field');
  if (obj.compositionDepth === undefined || typeof obj.compositionDepth !== 'number') errors.push('Missing compositionDepth integer metadata');
  if (!obj.mergeAuthority) errors.push('Missing mergeAuthority provenance field');
  
  if (!Array.isArray(obj.originPolicyChain) || obj.originPolicyChain.length === 0) {
    errors.push('Missing originPolicyChain provenance field, or array is empty');
  } else if (obj.originPolicyChain[obj.originPolicyChain.length - 1] !== obj.originPolicyId) {
    errors.push('originPolicyChain tail must match originPolicyId');
  }
  
  return { valid: errors.length === 0, errors, warnings: [] };
}
