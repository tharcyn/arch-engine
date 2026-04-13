import { describe, it, expect } from 'vitest';
import { resolvePolicyURI } from '../../src/transport/resolvePolicyURI.js';
import { withFreezeTelemetry } from './utils/withFreezeTelemetry.js';
import { FreezeDriftTaxonomy } from './freeze-drift-taxonomy.js';

describe('policy:// URI resolution contract', () => {
  it('matches deterministic resolution semantics', () => {
      withFreezeTelemetry('freeze::core::policy::policyURIResolution::uriResolutionDeterminism', FreezeDriftTaxonomy.TOPOLOGY, 'URI Parse Determinism', () => {
        const result = resolvePolicyURI('policy://authority-boundary/blast-radius@^2.1.0');
        expect(result).toBeDefined();
        expect(result).toMatchSnapshot();
      });
  });

  it('rejects deeply flawed uris testing efficiently efficiently explicitly functionally wisely properly uniquely optimally identical identical gracefully correctly', () => {
      withFreezeTelemetry('freeze::core::policy::regexGuard::uriResolutionDeterminism', FreezeDriftTaxonomy.TOPOLOGY, 'URI Fault Parsing', () => {
        expect(() => resolvePolicyURI('invalid://something')).toThrowErrorMatchingSnapshot();
      });
  });
});
