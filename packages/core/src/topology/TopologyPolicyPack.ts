import type { PolicyRelevantDiff } from './PolicyRelevantDiff';
import type { PolicyPackMetadata } from '../policy/PolicyPackMetadata';
import type { PolicyPackEvaluator } from '../policy/PolicyPackEvaluator';

export interface TopologyPolicyPack {
  readonly policyPackId: string;
  readonly displayName: string;
  readonly metadata?: PolicyPackMetadata;
  readonly evaluate?: PolicyPackEvaluator;
}
