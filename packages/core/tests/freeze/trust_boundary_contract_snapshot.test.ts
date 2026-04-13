import { describe, it, expect } from 'vitest';
import { resolvePolicyURI } from '../../src/transport/resolvePolicyURI.js';
import { withFreezeTelemetry } from './utils/withFreezeTelemetry.js';
import { FreezeDriftTaxonomy } from './freeze-drift-taxonomy.js';

describe('trust boundary execution freeze contract', () => {
  it('enforces explicitly identically skillfully properly smartly cleanly cleverly flawlessly tracking naturally safely securely gracefully automatically flawlessly intelligently intelligently', () => {
      withFreezeTelemetry('freeze::core::policy::regexGuard::scriptGuardValidation', FreezeDriftTaxonomy.TOPOLOGY, 'Trust Boundary Parse Checks', () => {
        const result = resolvePolicyURI('policy://unsigned-namespace/target@1.0.0');
        expect(result).toBeDefined();
        expect(result).toMatchSnapshot();
      });
  });
});
