import { CapabilityNegotiationMode, LoaderRuntimeCapabilities } from './validateManifestCapabilities.js';
import { PolicyStackEntry } from '../policy/types.js';

export const CAPABILITY_EXPLAINABILITY_GRAPH_VERSION = 'v1';

export interface CapabilityExplainabilityNode {
  policyId: string;
  resolvedVersion: string;
  requiredCapabilities: string[];
  transitiveRequiredCapabilities: string[];
  missingCapabilities: string[];
  incompatibleLayers: string[];
  incompatibleDomains: string[];
  negotiationMode: string;
  fallbackApplied: boolean;
  children: CapabilityExplainabilityNode[];
}

export function generateCapabilityExplainabilityGraph(
  entries: PolicyStackEntry[],
  currentEntry: PolicyStackEntry,
  runtimeConfig: LoaderRuntimeCapabilities,
  visited: Set<string> = new Set()
): CapabilityExplainabilityNode | null {
  const mode = runtimeConfig.negotiationMode || CapabilityNegotiationMode.STRICT;

  // The caller decides when to inject it, but structurally:
  const identityKey = currentEntry.policyNamespace + '/' + currentEntry.policyId;

  // No cycles
  if (visited.has(identityKey)) {
    return null;
  }
  visited.add(identityKey);

  const directReqs: string[] = []; // In a real system, we'd grab this from manifest. Here we grab from entry properties if available.
  // Actually, we don't have directReqs cleanly separated unless we assume it's transitiveRequiredCapabilities before aggregation.
  // Let's assume transitiveRequiredCapabilities holds what we need or empty.
  const transitiveReqs = [...(currentEntry.transitiveRequiredCapabilities || [])].sort((a,b) => a < b ? -1 : a > b ? 1 : 0);
  
  const sim = currentEntry.simulatedCapabilityCompatibility || {
    missingCapabilities: [],
    incompatibleLayers: [],
    incompatibleDomains: []
  };

  const children: CapabilityExplainabilityNode[] = [];
  
  if (currentEntry.config.extends) {
    const extendsArr = Array.isArray(currentEntry.config.extends) ? currentEntry.config.extends : [currentEntry.config.extends];
    const deps = extendsArr.map(ex => entries.find(x => x.policyId === ex)).filter(Boolean) as PolicyStackEntry[];
    deps.sort((a, b) => {
      const aKey = (a.policyNamespace || '') + a.policyId + (a.config.version || '');
      const bKey = (b.policyNamespace || '') + b.policyId + (b.config.version || '');
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });

    for (const dep of deps) {
      const childNode = generateCapabilityExplainabilityGraph(entries, dep, runtimeConfig, new Set(visited));
      if (childNode) {
        children.push(childNode);
      }
    }
  }

  const fallback = currentEntry.executionMetadata?.capabilityFallbackApplied ?? false;

  return {
    policyId: currentEntry.policyId,
    resolvedVersion: String(currentEntry.config.version || '1'),
    requiredCapabilities: directReqs,
    transitiveRequiredCapabilities: transitiveReqs,
    missingCapabilities: [...sim.missingCapabilities].sort((a,b) => a < b ? -1 : a > b ? 1 : 0),
    incompatibleLayers: [...sim.incompatibleLayers].sort((a,b) => a < b ? -1 : a > b ? 1 : 0),
    incompatibleDomains: [...sim.incompatibleDomains].sort((a,b) => a < b ? -1 : a > b ? 1 : 0),
    negotiationMode: mode,
    fallbackApplied: fallback,
    children
  };
}

export function attachCapabilityExplainabilityGraph(
  entries: PolicyStackEntry[],
  currentEntry: PolicyStackEntry,
  runtimeConfig: LoaderRuntimeCapabilities
): void {
  const mode = runtimeConfig.negotiationMode || CapabilityNegotiationMode.STRICT;
  if (mode === CapabilityNegotiationMode.SIMULATE || mode === CapabilityNegotiationMode.FALLBACK || mode === CapabilityNegotiationMode.WARN) {
    const graph = generateCapabilityExplainabilityGraph(entries, currentEntry, runtimeConfig);
    if (graph) {
      if (!currentEntry.executionMetadata) currentEntry.executionMetadata = {};
      currentEntry.executionMetadata.capabilityExplainabilityGraph = graph;
    }
  }
}
