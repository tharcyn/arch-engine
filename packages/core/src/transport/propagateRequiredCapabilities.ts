import { PolicyStackEntry } from '../policy/types.js';
import { LoaderRuntimeCapabilities } from './validateManifestCapabilities.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const TRANSITIVE_CAPABILITY_PROJECTION_VERSION = 'v1';

/**
 * Phase 4.8 Hardening:
 * - Namespace-qualified dependency lookup (audit finding M5/5.1)
 * - Accepts full entries array from recursive resolution (audit finding 5.3)
 * - Deterministic sorting with stable version-inclusive keys
 */
export function propagateRequiredCapabilities(
  entries: PolicyStackEntry[],
  currentEntry: PolicyStackEntry,
  runtimeCapabilities: LoaderRuntimeCapabilities,
  visited: Set<string> = new Set()
): string[] {
  const uri = `policy://${currentEntry.policyNamespace}/${currentEntry.policyId}@${currentEntry.config.version || 1}`;

  // Protect against infinite recursion if cycle detection hasn't fully aborted it
  if (visited.has(uri)) {
    return [];
  }
  visited.add(uri);

  const capabilities = new Set<string>();

  const directCaps = currentEntry.transitiveRequiredCapabilities || [];
  directCaps.forEach(c => capabilities.add(c));

  // Sort entries deterministically
  const sortedEntries = [...entries].sort((a, b) => {
    const aKey = [a.policyNamespace || '', a.policyId, a.config.version || 0].join(':');
    const bKey = [b.policyNamespace || '', b.policyId, b.config.version || 0].join(':');
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });

  const dependencies = currentEntry.config.extends;
  if (Array.isArray(dependencies)) {
    for (const depId of dependencies) {
      // Phase 4.8 Fix: Namespace-qualified lookup (audit finding M5/5.1)
      // First try namespace-qualified match, then fallback to policyId-only for backward compat
      const dep = sortedEntries.find(e =>
        e.policyNamespace === currentEntry.policyNamespace && e.policyId === depId
      ) || sortedEntries.find(e => e.policyId === depId);
      if (dep) {
        const depCaps = propagateRequiredCapabilities(sortedEntries, dep, runtimeCapabilities, new Set(visited));
        depCaps.forEach(c => capabilities.add(c));
      }
    }
  }

  const closure = Array.from(capabilities).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  // Validate closure against runtime
  const provided = runtimeCapabilities.providedCapabilities || [];
  const missingCaps = closure.filter(c => !provided.includes(c));

  if (missingCaps.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.TRANSITIVE_CAPABILITY_INCOMPATIBLE,
      message: `Transitive Capability Incompatible for ${currentEntry.policyId}`,
      stage: 'dependencyResolution',
      contractVersion: TRANSITIVE_CAPABILITY_PROJECTION_VERSION,
      missingCapabilities: missingCaps,
      policyNamespace: currentEntry.policyNamespace,
      policyId: currentEntry.policyId,
      dependencySource: uri
    });
  }

  currentEntry.transitiveRequiredCapabilities = closure;

  return closure;
}
