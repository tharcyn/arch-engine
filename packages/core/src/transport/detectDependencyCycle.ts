import { PolicyStackEntry } from '../policy/types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const DEPENDENCY_CYCLE_CONTRACT_VERSION = 'v1';

export function detectDependencyCycle(
  entries: PolicyStackEntry[],
  currentEntry: PolicyStackEntry,
  visited: Set<string> = new Set(),
  path: string[] = []
): void {
  // Sort children deterministically by namespace, policyId, version
  const sortedEntries = [...entries].sort((a, b) => {
    const aKey = [a.policyNamespace || '', a.policyId, a.config.version || 0].join(':');
    const bKey = [b.policyNamespace || '', b.policyId, b.config.version || 0].join(':');
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });

  const uri = `policy://${currentEntry.policyNamespace}/${currentEntry.policyId}@${currentEntry.config.version || '1'}`;
  path.push(uri);

  if (visited.has(uri)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.POLICY_DEPENDENCY_CYCLE_DETECTED,
      message: `Dependency cycle detected at ${uri}`,
      stage: 'dependencyResolution',
      contractVersion: DEPENDENCY_CYCLE_CONTRACT_VERSION,
      cyclePath: path,
      loaderStageMetadata: {
        contractVersion: DEPENDENCY_CYCLE_CONTRACT_VERSION,
        namespace: currentEntry.policyNamespace,
        validationStage: 'detectDependencyCycle'
      }
    });
  }

  visited.add(uri);

  const dependencies = currentEntry.config.extends;
  if (Array.isArray(dependencies)) {
    for (const depId of dependencies) {
      // Find the resolved dependency by ID in the entries array
      // In a real implementation this would traverse the actual tree
      const dep = sortedEntries.find(e => e.policyId === depId);
      if (dep) {
        detectDependencyCycle(sortedEntries, dep, new Set(visited), [...path]);
      }
    }
  }
}
