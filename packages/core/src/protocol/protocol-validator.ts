/**
 * ═══════════════════════════════════════════════════════════
 *  Reasoning Protocol V1 Validator
 * ═══════════════════════════════════════════════════════════
 *
 *  Validates ImpactSimulator output against the V1 schema.
 *
 *  Forward-portable to: @arch-engine/core/protocol
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ReasoningProtocolV1 } from './reasoning-protocol-v1';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a protocol object structurally against V1 requirements.
 * Note: A full AJV JSON schema validator should be used in the final @arch-engine package,
 * but this lightweight structural check ensures engine compatibility in the interim.
 *
 * @param output Object to validate
 */
export function validateReasoningOutput(output: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof output !== 'object' || output === null) {
    return { valid: false, errors: ['Output is not a valid object'] };
  }

  const result = output as any;

  if (result.protocol_version !== '1.0.0') {
    errors.push(`Expected protocol_version '1.0.0', got '${result.protocol_version}'`);
  }

  if (!result.impact || typeof result.impact !== 'object') {
    errors.push('Missing required object: impact');
  } else {
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(result.impact.structural_radius)) {
      errors.push(`Invalid impact.structural_radius: ${result.impact.structural_radius}`);
    }
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(result.impact.mutation_radius)) {
      errors.push(`Invalid impact.mutation_radius: ${result.impact.mutation_radius}`);
    }
    if (typeof result.impact.authority_risk_score !== 'number') {
      errors.push('impact.authority_risk_score must be a number');
    }
    if (typeof result.impact.conclusive_status !== 'boolean') {
      errors.push('impact.conclusive_status must be a boolean');
    }
  }

  if (!result.confidence_summary || typeof result.confidence_summary !== 'object') {
    errors.push('Missing required object: confidence_summary');
  } else {
    ['avg_path_confidence', 'min_path_confidence', 'total_paths_evaluated'].forEach(k => {
      if (typeof result.confidence_summary[k] !== 'number') {
        errors.push(`confidence_summary.${k} must be a number`);
      }
    });
  }

  if (!['PASS', 'WARNING', 'BLOCK'].includes(result.enforcement_decision)) {
    errors.push(`Invalid enforcement_decision: ${result.enforcement_decision}`);
  }

  if (!Array.isArray(result.missing_capability_layers)) {
    errors.push('missing_capability_layers must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
