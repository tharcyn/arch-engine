import { PolicyStackEntry } from '../policy/types.js';
import { HydratedPolicyManifest } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { detectDependencyCycle } from './detectDependencyCycle.js';
import * as crypto from 'node:crypto';

/**
 * Resolves a hydrated manifest into a PolicyStackEntry with recursive dependency graph.
 * Returns [rootEntry, allEntries] where allEntries is the flat resolved graph.
 *
 * Phase 4.8 Hardening:
 * - Hash now includes version (audit finding 2.1)
 * - Recursive graph resolution via manifestResolver callback (audit finding 14.1)
 * - Namespace-qualified dependency lookup (audit finding 5.1)
 * - Cycle detection operates on full accumulated entries (audit finding 14.2)
 */

export type ManifestResolver = (namespace: string, policyId: string) => {
  manifest: HydratedPolicyManifest;
  version: number;
} | null;

export function resolvePolicyDependencies(
  namespace: string,
  policyId: string,
  manifest: HydratedPolicyManifest,
  manifestResolver?: ManifestResolver,
  _accumulated?: PolicyStackEntry[],
  _visited?: Set<string>
): PolicyStackEntry {
  try {
    const version = manifest.manifestMetadata?.version || 1;
    // Phase 4.8 Fix: Hash now includes version for identity stability
    const hash = crypto.createHash('sha256').update(`${namespace}/${policyId}@${version}`).digest('hex');

    const accumulated = _accumulated || [];
    const visited = _visited || new Set<string>();
    const qualifiedKey = `${namespace}/${policyId}@${version}`;

    if (visited.has(qualifiedKey)) {
      // Already resolved — return existing entry from accumulated
      const existing = accumulated.find(e =>
        e.policyNamespace === namespace && e.policyId === policyId && e.config.version === version
      );
      if (existing) return existing;
    }
    visited.add(qualifiedKey);

    const entry: PolicyStackEntry = {
      policyId,
      policyNamespace: namespace,
      hash,
      config: {
        version,
        extends: manifest.extends
      },
      transitiveRequiredCapabilities: manifest.manifestMetadata?.requiredCapabilities || [],
      executionMetadata: manifest.executionMetadata || {
        capabilityFallbackApplied: false
      },
      negotiationWarnings: manifest.negotiationWarnings,
      simulatedCapabilityCompatibility: manifest.simulatedCapabilityCompatibility
    };

    accumulated.push(entry);

    // Phase 4.8 Fix: Recursive dependency resolution
    if (manifestResolver && Array.isArray(manifest.extends)) {
      for (const depId of manifest.extends) {
        const depKey = `${namespace}/${depId}`;
        if (!accumulated.some(e => e.policyNamespace === namespace && e.policyId === depId)) {
          const depResult = manifestResolver(namespace, depId);
          if (depResult) {
            resolvePolicyDependencies(
              namespace, depId, depResult.manifest, manifestResolver, accumulated, visited
            );
          }
        }
      }
    }

    // Phase 4.8 Fix: Cycle detection on full accumulated entries
    detectDependencyCycle(accumulated, entry);

    return entry;
  } catch (error: any) {
    if (error instanceof PolicyRuntimeError) {
      throw error;
    }
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.DEPENDENCY_RESOLUTION_FAILED,
      message: `Dependency Resolution Failed: ${error.message}`,
      policyId,
      policyNamespace: namespace
    });
  }
}

/**
 * Returns ALL accumulated entries from recursive resolution.
 * This is what the pipeline should use.
 */
export function resolvePolicyDependencyGraph(
  namespace: string,
  policyId: string,
  manifest: HydratedPolicyManifest,
  manifestResolver?: ManifestResolver
): { root: PolicyStackEntry; entries: PolicyStackEntry[] } {
  const accumulated: PolicyStackEntry[] = [];
  const root = resolvePolicyDependencies(namespace, policyId, manifest, manifestResolver, accumulated);
  return { root, entries: accumulated };
}
