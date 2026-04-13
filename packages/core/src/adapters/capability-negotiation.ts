/**
 * ═══════════════════════════════════════════════════════════
 *  Capability Negotiation Layer — Stage 7A Identity Freeze
 * ═══════════════════════════════════════════════════════════
 *
 *  Passive mode: detects missing topology coverage and emits
 *  warnings. Does NOT disable gates — only annotates.
 *
 *  Each governance gate declares its required adapter
 *  capabilities. The negotiation layer cross-references
 *  against the capability registry and flags gaps.
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

// ─── Gate Capability Requirements ───────────────────────

export interface GateCapabilityRequirement {
  /** Gate identifier */
  gate_id: string;

  /** Gate human name */
  gate_name: string;

  /** Required adapter capabilities (capability key → minimum level) */
  required_capabilities: Partial<
    Record<keyof CapabilityMap, CoverageLevel>
  >;
}

// ─── Built-In Gate Requirements ─────────────────────────

export const GATE_REQUIREMENTS: GateCapabilityRequirement[] = [
  {
    gate_id: 'invariant_protection',
    gate_name: 'Invariant Protection',
    required_capabilities: {
      authorityMetadata: 'full',
    },
  },
  {
    gate_id: 'authority_boundary',
    gate_name: 'Authority Boundary',
    required_capabilities: {
      surfaceTopology: 'full',
      handlerResolution: 'full',
      invocationEdges: 'full',
      dataAccessEdges: 'partial',
      authorityMetadata: 'full',
    },
  },
  {
    gate_id: 'contract_parity',
    gate_name: 'Contract Parity',
    required_capabilities: {
      surfaceTopology: 'full',
      contractSurface: 'full',
    },
  },
  {
    gate_id: 'naming_grammar',
    gate_name: 'Naming Grammar',
    required_capabilities: {
      contractSurface: 'full',
    },
  },
  {
    gate_id: 'naked_path',
    gate_name: 'Naked Path Validator',
    required_capabilities: {
      contractSurface: 'full',
    },
  },
  {
    gate_id: 'journey_regression',
    gate_name: 'Journey Coverage Regression',
    required_capabilities: {
      surfaceTopology: 'partial',
      invocationEdges: 'partial',
    },
  },
  {
    gate_id: 'blast_radius',
    gate_name: 'Blast-Radius Safety',
    required_capabilities: {
      authorityMetadata: 'full',
    },
  },
  {
    gate_id: 'frontend_linkage',
    gate_name: 'Frontend Contract Linkage',
    required_capabilities: {
      frontendTopology: 'partial',
      contractSurface: 'full',
    },
  },
];

// ─── Negotiation Warning ────────────────────────────────

export interface CapabilityWarning {
  gate_id: string;
  gate_name: string;
  missing_capability: string;
  required_level: CoverageLevel;
  best_available_level: CoverageLevel;
  providing_adapters: string[];
  message: string;
}

// ─── Negotiation Result ─────────────────────────────────

export interface NegotiationResult {
  /** All warnings generated */
  warnings: CapabilityWarning[];

  /** Gates with full capability coverage */
  fully_covered_gates: string[];

  /** Gates with partial or missing coverage */
  degraded_gates: string[];

  /** Summary for governance report annotation */
  summary: {
    total_gates: number;
    fully_covered: number;
    degraded: number;
    missing_capabilities: string[];
  };
}

// ─── Negotiation Engine ─────────────────────────────────

/**
 * Run capability negotiation: cross-reference gate requirements
 * against adapter registry.
 *
 * @param registry        Adapter capability registry
 * @param gateRequirements Gate capability requirements (defaults to built-in)
 * @returns               Negotiation result with warnings
 */
export function negotiateCapabilities(
  registry: AdapterCapabilityRegistry,
  gateRequirements: GateCapabilityRequirement[] = GATE_REQUIREMENTS,
): NegotiationResult {
  const warnings: CapabilityWarning[] = [];
  const fullyCovered: string[] = [];
  const degraded: string[] = [];
  const missingCapabilities: Set<string> = new Set();

  const levelOrder: CoverageLevel[] = ['none', 'unknown', 'partial', 'full'];

  for (const req of gateRequirements) {
    let gateFullyCovered = true;

    for (const [capKey, requiredLevel] of Object.entries(req.required_capabilities)) {
      const capability = capKey as keyof CapabilityMap;
      const providers = registry.getProvidersOf(capability, requiredLevel!);

      if (providers.length === 0) {
        // Find best available
        let bestLevel: CoverageLevel = 'none';
        const allAdapters = registry.getAll();
        const providingNames: string[] = [];

        for (const adapter of allAdapters) {
          const adapterLevel = adapter.capabilities[capability];
          if (levelOrder.indexOf(adapterLevel) > levelOrder.indexOf(bestLevel)) {
            bestLevel = adapterLevel;
          }
          if (adapterLevel !== 'none') {
            providingNames.push(adapter.adapter_id);
          }
        }

        gateFullyCovered = false;
        missingCapabilities.add(capKey);

        warnings.push({
          gate_id: req.gate_id,
          gate_name: req.gate_name,
          missing_capability: capKey,
          required_level: requiredLevel!,
          best_available_level: bestLevel,
          providing_adapters: providingNames,
          message: `WARNING: ${req.gate_name} gate executed without ${requiredLevel} ${capKey} adapter. Best available: ${bestLevel}.`,
        });
      }
    }

    if (gateFullyCovered) {
      fullyCovered.push(req.gate_id);
    } else {
      degraded.push(req.gate_id);
    }
  }

  return {
    warnings,
    fully_covered_gates: fullyCovered,
    degraded_gates: degraded,
    summary: {
      total_gates: gateRequirements.length,
      fully_covered: fullyCovered.length,
      degraded: degraded.length,
      missing_capabilities: Array.from(missingCapabilities).sort(),
    },
  };
}
