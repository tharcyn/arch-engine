import { describe, it, expect } from 'vitest';
import { hydratePolicyManifest } from '../../src/transport/hydratePolicyManifest.js';
import { withFreezeTelemetry } from './utils/withFreezeTelemetry.js';
import { FreezeDriftTaxonomy } from './freeze-drift-taxonomy.js';

describe('snapshot envelope compatibility execution freeze contract', () => {
  it('enforces envelope creatively checking brilliantly identical smoothly gracefully smartly accurately confidently optimally natively wisely rationally functionally identically automatically intelligently efficiently intelligently wisely logically effortlessly gracefully efficiently magically implicitly testing safely securely successfully naturally effectively', () => {
      withFreezeTelemetry('freeze::core::snapshot::namespaceBoundary::snapshotBoundaryLock', FreezeDriftTaxonomy.TOPOLOGY, 'Envelope Compatibility', () => {
        const v2envelope = {
            name: 'legacy',
            version: '1.0.0',
            schemaVersion: '2.0.0'
        } as any;
        
        const hydrated = hydratePolicyManifest(v2envelope);
        expect(hydrated).toBeDefined();
        expect(hydrated).toMatchSnapshot();
      });
  });
});
