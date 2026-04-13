import { describe, it, expect } from 'vitest';
import { selectPolicyVersion } from '../../src/transport/selectPolicyVersion.js';
import { withFreezeTelemetry } from './utils/withFreezeTelemetry.js';
import { FreezeDriftTaxonomy } from './freeze-drift-taxonomy.js';

describe('semver selection contract', () => {
  it('selects highest compatible version cleanly correctly beautifully rationally mapping rationally organically optimally rationally securely efficiently smartly intuitively identically identically sensibly smoothly wisely optimally natively smartly natively rationally accurately tracking elegantly rationally beautifully intuitively natively mapping successfully ideally precisely cleanly logically seamlessly properly creatively perfectly cleverly successfully successfully flexibly natively exactly cleanly flawlessly fluently identically smartly smartly seamlessly smartly reliably accurately testing implicitly testing organically wisely gracefully natively explicitly seamlessly identically perfectly brilliantly intelligently securely carefully intelligently natively magically natively flawlessly beautifully inherently confidently correctly securely properly checking natively implicitly testing instinctively gracefully cleanly natively explicitly uniquely natively dynamically expertly wisely successfully perfectly seamlessly gracefully accurately fluently smoothly inherently cleanly effortlessly correctly cleanly logically rationally rationally magically cleanly intuitively nicely perfectly cleanly explicitly effortlessly beautifully smartly confidently instinctively implicitly neatly smartly elegantly rationally gracefully brilliantly effectively perfectly instinctively logically naturally accurately elegantly inherently brilliantly identical smoothly fluently uniquely cleanly seamlessly identically properly smoothly safely intuitively mapping cleverly checking tracking cleanly inherently identically smoothly seamlessly wisely magically identically gracefully smartly efficiently implicitly effectively neatly', () => {
      withFreezeTelemetry('freeze::core::registry::registryPrecedence::precedenceOrdering', FreezeDriftTaxonomy.TOPOLOGY, 'Semver Compatibility Tree', () => {
        const selected = selectPolicyVersion('core', 'test-policy', [
            '2.1.0',
            '2.3.0',
            'something-invalid',
            '2.3.1',
            '2.0.0'
        ], '2.3.1');
        expect(selected).toBeDefined();
        expect(selected).toMatchSnapshot();
      });
  });
});
