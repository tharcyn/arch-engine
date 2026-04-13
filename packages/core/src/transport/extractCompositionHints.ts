import { HydratedPolicyManifest } from './types.js';
import { PolicyStackEntry } from '../policy/types.js';

export const COMPOSITION_HINT_SURFACE_VERSION = 'v1';

export interface CompositionHints {
  preferredTier?: string;
  mergeStrategy?: string;
  conflictPolicy?: string;
  overrideIntent?: string;
  priorityWeight?: number;
  executionModeHint?: string;
}

/**
 * Phase 4.9: Valid value constraints for composition hint fields.
 * Prevents planner-hint injection via malicious manifests.
 */
const VALID_PREFERRED_TIERS = ['governance', 'security', 'routing', 'observability', 'identity'];
const VALID_MERGE_STRATEGIES = ['additive', 'replace', 'deep-merge', 'union'];
const VALID_CONFLICT_POLICIES = ['force', 'defer', 'error', 'warn', 'preferHigherTier', 'preferLowerTier'];
const VALID_OVERRIDE_INTENTS = ['supplement', 'replace', 'extend', 'restrict'];
const VALID_EXECUTION_MODE_HINTS = ['enforce', 'advisory', 'simulate', 'dry-run'];
const PRIORITY_WEIGHT_MIN = -100;
const PRIORITY_WEIGHT_MAX = 100;

/**
 * Phase 4.9: Runtime schema guard for composition hints.
 * Validates types and constrains values to known-safe enumerations.
 * Returns sanitized hints or null if nothing valid.
 */
export function validateCompositionHints(raw: any): CompositionHints | null {
  if (!raw || typeof raw !== 'object') return null;

  const validated: CompositionHints = {};
  let hasValid = false;

  if (typeof raw.preferredTier === 'string' && VALID_PREFERRED_TIERS.includes(raw.preferredTier)) {
    validated.preferredTier = raw.preferredTier;
    hasValid = true;
  }
  if (typeof raw.mergeStrategy === 'string' && VALID_MERGE_STRATEGIES.includes(raw.mergeStrategy)) {
    validated.mergeStrategy = raw.mergeStrategy;
    hasValid = true;
  }
  if (typeof raw.conflictPolicy === 'string' && VALID_CONFLICT_POLICIES.includes(raw.conflictPolicy)) {
    validated.conflictPolicy = raw.conflictPolicy;
    hasValid = true;
  }
  if (typeof raw.overrideIntent === 'string' && VALID_OVERRIDE_INTENTS.includes(raw.overrideIntent)) {
    validated.overrideIntent = raw.overrideIntent;
    hasValid = true;
  }
  if (typeof raw.priorityWeight === 'number' && Number.isFinite(raw.priorityWeight)) {
    validated.priorityWeight = Math.max(PRIORITY_WEIGHT_MIN, Math.min(PRIORITY_WEIGHT_MAX, raw.priorityWeight));
    hasValid = true;
  }
  if (typeof raw.executionModeHint === 'string' && VALID_EXECUTION_MODE_HINTS.includes(raw.executionModeHint)) {
    validated.executionModeHint = raw.executionModeHint;
    hasValid = true;
  }

  return hasValid ? validated : null;
}

export function extractCompositionHints(manifest: HydratedPolicyManifest): CompositionHints | null {
  const hintsObj = manifest.manifestMetadata?.compositionHints;
  if (!hintsObj || typeof hintsObj !== 'object') return null;

  // Phase 4.9: Validate through schema guard instead of raw passthrough
  return validateCompositionHints(hintsObj);
}

export function applyCompositionHints(
  entry: PolicyStackEntry, 
  manifest: HydratedPolicyManifest
): void {
  const hints = extractCompositionHints(manifest);
  if (hints) {
    if (!entry.executionMetadata) entry.executionMetadata = {};
    entry.executionMetadata.compositionHints = hints;
  }
}
