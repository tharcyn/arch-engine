import type { PolicyRelevantDiff } from '../topology/PolicyRelevantDiff';
import type { TopologyGraph } from '../topology/TopologyGraph';

// PolicyExecutionContext defines the canonical execution surface
// used by all governance packs (built-in and workspace-defined)
// ensuring stable evaluation inputs across registry and plugin layers
export interface PolicyExecutionContext {
  readonly policyRelevantDiff: PolicyRelevantDiff;
  readonly topologyGraph: TopologyGraph;
  
  // Phase 9F/10B Extended Fields for Capability Verification
  readonly capabilityManifest?: Readonly<Record<string, boolean>>;
  readonly mutationClassRegistry?: Readonly<Record<string, unknown>>;
  readonly authorityScopeRegistry?: Readonly<Record<string, unknown>>;
  readonly surfaceConfidenceRegistry?: Readonly<Record<string, unknown>>;
  readonly trustBoundaryRules?: Readonly<Record<string, unknown>>;
  readonly engineRuntimeMetadata?: Readonly<Record<string, unknown>>;
  readonly policyPackMetadata?: Readonly<Record<string, unknown>>;
  readonly executionPlanMetadata?: Readonly<Record<string, unknown>>;
}

export type ExecutionContextStructuralHash = string;

import { createHash } from 'crypto';

function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    if (obj[k] !== undefined) {
      parts.push(`${k}:${stableStringify(obj[k])}`);
    }
  }
  return `{${parts.join(',')}}`;
}

export function computeExecutionContextHash(context: PolicyExecutionContext): ExecutionContextStructuralHash {
  // dataset identity can be extracted from topologyGraph hash or engineRuntimeMetadata
  const datasetIdentity = context.topologyGraph?.graphSurfaceHash || '';
  const capabilityManifestStr = stableStringify(context.capabilityManifest);
  const packCompatStr = stableStringify(context.policyPackMetadata);
  const engineMetadataStr = stableStringify(context.engineRuntimeMetadata);
  // evaluation mode could be in executionPlanMetadata
  const evalMode = (context.executionPlanMetadata as any)?.evaluationMode || '';

  const payload = [
    datasetIdentity,
    capabilityManifestStr,
    packCompatStr,
    evalMode,
    engineMetadataStr
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}
