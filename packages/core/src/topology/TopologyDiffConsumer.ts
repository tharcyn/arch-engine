import type { PolicyRelevantDiff } from './PolicyRelevantDiff';

export interface TopologyDiffConsumer {
  readonly consumerId: string;
  readonly displayName: string;
  consume(
    diff: PolicyRelevantDiff
  ): PolicyRelevantDiff;
}
