/**
 * ═══════════════════════════════════════════════════════════
 *  Strict Capability Enforcement — Phase 2.6
 * ═══════════════════════════════════════════════════════════
 *
 *  Upgrades the passive capability negotiation layer with
 *  enforcement semantics. When strict mode is enabled,
 *  missing required capabilities can downgrade or block
 *  gate execution.
 *
 *  Default: strictMode = false (passive mode, backward compatible)
 *
 *  Forward-portable to: @arch-engine/core/enforcement
 */

import type {
  CapabilityMap,
  CoverageLevel,
} from './capability-registry';

import {
  AdapterCapabilityRegistry,
} from './capability-registry';

import type { EdgeConfidenceLevel } from '../confidence/edge-confidence';

// ─── Capability Requirement Level ───────────────────────

export type CapabilityRequirementLevel =
  | 'optional'     // Gate runs regardless; gap is informational only
  | 'recommended'  // Gate runs but emits advisory warning
  | 'required'     // Gate runs in degraded mode (reduced severity)
  | 'blocking';    // Gate is skipped entirely if capability missing

// ─── Pack Capability Declaration ────────────────────────

export interface PackCapabilityDeclaration {
  /** Pack identifier */
  pack_id: string;

  /** Pack human name */
  pack_name: string;

  /** Required capabilities with enforcement levels */
  requiredCapabilities: Array<{
    capability: keyof CapabilityMap;
    minimumLevel: CoverageLevel;
    requirementLevel: CapabilityRequirementLevel;
  }>;

  /** Optional capabilities (informational gaps only) */
  optionalCapabilities: Array<{
    capability: keyof CapabilityMap;
    minimumLevel: CoverageLevel;
  }>;

  /** Minimum edge confidence level for this pack's gates to operate at full severity */
  confidenceRequirements: {
    minimumEdgeConfidence: EdgeConfidenceLevel;
    minimumPathConfidence: number;
  };
}

// ─── Built-In Pack Declarations ─────────────────────────

export const PACK_DECLARATIONS: PackCapabilityDeclaration[] = [
  {
    pack_id: 'authority',
    pack_name: 'Authority Ownership Pack',
    requiredCapabilities: [
      { capability: 'authorityMetadata', minimumLevel: 'full', requirementLevel: 'required' },
      { capability: 'invocationEdges', minimumLevel: 'partial', requirementLevel: 'recommended' },
    ],
    optionalCapabilities: [
      { capability: 'dataAccessEdges', minimumLevel: 'partial' },
    ],
    confidenceRequirements: {
      minimumEdgeConfidence: 'namespace_inferred',
      minimumPathConfidence: 0.60,
    },
  },
  {
    pack_id: 'rest-contract',
    pack_name: 'REST Contract Pack',
    requiredCapabilities: [
      { capability: 'surfaceTopology', minimumLevel: 'full', requirementLevel: 'blocking' },
      { capability: 'contractSurface', minimumLevel: 'full', requirementLevel: 'blocking' },
    ],
    optionalCapabilities: [
      { capability: 'frontendTopology', minimumLevel: 'partial' },
    ],
    confidenceRequirements: {
      minimumEdgeConfidence: 'runtime_verified',
      minimumPathConfidence: 0.75,
    },
  },
  {
    pack_id: 'journey',
    pack_name: 'Journey Lifecycle Pack',
    requiredCapabilities: [
      { capability: 'surfaceTopology', minimumLevel: 'partial', requirementLevel: 'required' },
      { capability: 'invocationEdges', minimumLevel: 'partial', requirementLevel: 'recommended' },
    ],
    optionalCapabilities: [],
    confidenceRequirements: {
      minimumEdgeConfidence: 'heuristic',
      minimumPathConfidence: 0.50,
    },
  },
];

// ─── Enforcement Config ─────────────────────────────────

export interface CapabilityEnforcementConfig {
  /** Master switch: false = passive warnings only */
  strictMode: boolean;

  /** Additional pack declarations (merged with built-ins) */
  additionalPacks?: PackCapabilityDeclaration[];
}

export const DEFAULT_ENFORCEMENT_CONFIG: CapabilityEnforcementConfig = {
  strictMode: false,
};

// ─── Enforcement Result ─────────────────────────────────

export type GateExecutionDecision =
  | 'execute_full'     // Gate runs at full severity
  | 'execute_degraded' // Gate runs but severity is reduced
  | 'execute_advisory' // Gate runs but results are advisory only
  | 'skip_blocked';    // Gate is skipped entirely

export interface PackEnforcementResult {
  pack_id: string;
  pack_name: string;
  decision: GateExecutionDecision;
  missing_capabilities: Array<{
    capability: string;
    requirementLevel: CapabilityRequirementLevel;
    requiredLevel: CoverageLevel;
    availableLevel: CoverageLevel;
  }>;
  warnings: string[];
  meets_confidence_requirements: boolean;
}

export interface CapabilityEnforcementResult {
  strict_mode: boolean;
  packs: PackEnforcementResult[];
  summary: {
    total_packs: number;
    execute_full: number;
    execute_degraded: number;
    execute_advisory: number;
    skip_blocked: number;
  };
}

// ─── Enforcement Engine ─────────────────────────────────

/**
 * Evaluate capability enforcement for all registered packs.
 *
 * @param registry  Adapter capability registry
 * @param config    Enforcement configuration
 * @returns         Enforcement result per pack
 */
export function enforceCapabilities(
  registry: AdapterCapabilityRegistry,
  config: CapabilityEnforcementConfig = DEFAULT_ENFORCEMENT_CONFIG,
): CapabilityEnforcementResult {
  const allPacks = [
    ...PACK_DECLARATIONS,
    ...(config.additionalPacks || []),
  ];

  const levelOrder: CoverageLevel[] = ['none', 'unknown', 'partial', 'full'];
  const results: PackEnforcementResult[] = [];

  for (const pack of allPacks) {
    const missing: PackEnforcementResult['missing_capabilities'] = [];
    const warnings: string[] = [];
    let highestMissingLevel: CapabilityRequirementLevel = 'optional';

    const reqLevelOrder: CapabilityRequirementLevel[] = ['optional', 'recommended', 'required', 'blocking'];

    for (const req of pack.requiredCapabilities) {
      const providers = registry.getProvidersOf(req.capability, req.minimumLevel);

      if (providers.length === 0) {
        // Find best available level
        let bestLevel: CoverageLevel = 'none';
        for (const adapter of registry.getAll()) {
          const level = adapter.capabilities[req.capability];
          if (levelOrder.indexOf(level) > levelOrder.indexOf(bestLevel)) {
            bestLevel = level;
          }
        }

        missing.push({
          capability: req.capability,
          requirementLevel: req.requirementLevel,
          requiredLevel: req.minimumLevel,
          availableLevel: bestLevel,
        });

        if (reqLevelOrder.indexOf(req.requirementLevel) > reqLevelOrder.indexOf(highestMissingLevel)) {
          highestMissingLevel = req.requirementLevel;
        }

        warnings.push(
          `${pack.pack_name}: missing ${req.requirementLevel} capability '${req.capability}' (need: ${req.minimumLevel}, have: ${bestLevel})`,
        );
      }
    }

    // Determine execution decision
    let decision: GateExecutionDecision = 'execute_full';

    if (missing.length > 0 && config.strictMode) {
      switch (highestMissingLevel) {
        case 'blocking':
          decision = 'skip_blocked';
          break;
        case 'required':
          decision = 'execute_degraded';
          break;
        case 'recommended':
          decision = 'execute_advisory';
          break;
        default:
          decision = 'execute_full';
      }
    } else if (missing.length > 0) {
      // Passive mode: always execute full, just emit warnings
      decision = 'execute_full';
    }

    results.push({
      pack_id: pack.pack_id,
      pack_name: pack.pack_name,
      decision,
      missing_capabilities: missing,
      warnings,
      meets_confidence_requirements: true, // evaluated by confidence engine separately
    });
  }

  const summary = {
    total_packs: results.length,
    execute_full: results.filter(r => r.decision === 'execute_full').length,
    execute_degraded: results.filter(r => r.decision === 'execute_degraded').length,
    execute_advisory: results.filter(r => r.decision === 'execute_advisory').length,
    skip_blocked: results.filter(r => r.decision === 'skip_blocked').length,
  };

  return { strict_mode: config.strictMode, packs: results, summary };
}

/**
 * Check if a specific pack is executable given current capabilities.
 */
export function isPackExecutable(
  packId: string,
  registry: AdapterCapabilityRegistry,
  config: CapabilityEnforcementConfig = DEFAULT_ENFORCEMENT_CONFIG,
): { executable: boolean; decision: GateExecutionDecision; warnings: string[] } {
  const result = enforceCapabilities(registry, config);
  const pack = result.packs.find(p => p.pack_id === packId);

  if (!pack) {
    return { executable: true, decision: 'execute_full', warnings: [`Pack '${packId}' not found in declarations`] };
  }

  return {
    executable: pack.decision !== 'skip_blocked',
    decision: pack.decision,
    warnings: pack.warnings,
  };
}
