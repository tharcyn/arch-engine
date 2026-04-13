/**
 * ═══════════════════════════════════════════════════════════
 *  CI Configuration Preset Profiles
 * ═══════════════════════════════════════════════════════════
 *
 *  Pre-configured enforcement profiles for different
 *  adoption stages. Simplifies enterprise onboarding.
 *
 *  Profiles:
 *  - adoption:  permissive, zero friction
 *  - standard:  balanced enforcement
 *  - strict:    enterprise-grade gating
 */

// ─── Types ──────────────────────────────────────────────

export type ConfigPreset = 'adoption' | 'standard' | 'strict';

export interface ResolvedConfig {
  minCoverage: number;
  failOnWarnings: boolean;
  failOnFallbackMode: boolean;
  failOnRegression: boolean;
}

// ─── Preset Definitions ─────────────────────────────────

const PRESETS: Record<ConfigPreset, ResolvedConfig> = {
  adoption: {
    minCoverage: 0.30,
    failOnWarnings: false,
    failOnFallbackMode: false,
    failOnRegression: false,
  },
  standard: {
    minCoverage: 0.50,
    failOnWarnings: false,
    failOnFallbackMode: true,
    failOnRegression: false,
  },
  strict: {
    minCoverage: 0.70,
    failOnWarnings: true,
    failOnFallbackMode: true,
    failOnRegression: true,
  },
};

// ─── Public API ─────────────────────────────────────────

/**
 * Resolve configuration from inputs + optional preset.
 * Explicit inputs always override preset defaults.
 */
export function resolveConfig(inputs: {
  mode?: string;
  minCoverage?: string;
  failOnWarnings?: string;
  failOnFallbackMode?: string;
  failOnRegression?: string;
}): ResolvedConfig {
  // Start from preset defaults or adoption baseline
  const presetName = (inputs.mode ?? 'adoption') as ConfigPreset;
  const preset = PRESETS[presetName] ?? PRESETS.adoption;

  // Override with explicit inputs
  return {
    minCoverage: inputs.minCoverage ? parseFloat(inputs.minCoverage) : preset.minCoverage,
    failOnWarnings: inputs.failOnWarnings === 'true' ? true : inputs.failOnWarnings === 'false' ? false : preset.failOnWarnings,
    failOnFallbackMode: inputs.failOnFallbackMode === 'true' ? true : inputs.failOnFallbackMode === 'false' ? false : preset.failOnFallbackMode,
    failOnRegression: inputs.failOnRegression === 'true' ? true : inputs.failOnRegression === 'false' ? false : preset.failOnRegression,
  };
}

/**
 * Get preset description for annotation output.
 */
export function getPresetDescription(name: string): string {
  switch (name) {
    case 'adoption': return 'Adoption mode — permissive enforcement for onboarding';
    case 'standard': return 'Standard mode — balanced enforcement with fallback gating';
    case 'strict': return 'Strict mode — enterprise-grade gating with regression detection';
    default: return `Custom configuration (no preset)`;
  }
}
