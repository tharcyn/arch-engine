import type { TopologyDiffConsumer } from './TopologyDiffConsumer';
import type { PolicyRelevantDiff } from './PolicyRelevantDiff';

export class DiffConsumerRunner {
  private readonly consumers: readonly TopologyDiffConsumer[];

  constructor(consumers: readonly TopologyDiffConsumer[]) {
    const ids = new Set<string>();
    for (const c of consumers) {
      if (ids.has(c.consumerId)) {
        throw new Error(`Duplicate consumerId detected: ${c.consumerId}`);
      }
      ids.add(c.consumerId);
    }
    this.consumers = Object.freeze([...consumers]);
  }

  run(diff: PolicyRelevantDiff): readonly PolicyRelevantDiff[] {
    const results: PolicyRelevantDiff[] = [];
    for (const consumer of this.consumers) {
      results.push(consumer.consume(diff));
    }
    return Object.freeze(results);
  }
}
