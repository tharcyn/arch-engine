import { describe, test, expect, vi } from 'vitest';
import { simulateFederationCommand } from '../../../cli/src/commands/simulate/index.js';

describe('Federation Prediction Simulation', () => {
    test('renders deterministic federation prediction', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await simulateFederationCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "datasetParticipationDrift": "none",
            "deduplicationBehaviorDrift": "none",
            "identityCollisionBehaviorDrift": "resolved",
            "provenanceUnionBehaviorDrift": "union-expanded",
            "providerParticipationDrift": "provider-added",
          }
        `);
        consoleSpy.mockRestore();
    });
});
