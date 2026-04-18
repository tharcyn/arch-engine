import { describe, test, expect, vi } from 'vitest';
import { historyRegistryTrustCommand } from '../../../cli/src/commands/history/index.js';

describe('Registry History', () => {
    test('renders deterministic registry history', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await historyRegistryTrustCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "catalogMutationLineage": [
              "pack-added",
            ],
            "mirrorFallbackTransitions": [
              "active",
            ],
            "signatureValidationTransitions": [
              "strict",
            ],
            "trustTierPromotionTransitions": [
              "tier-2->tier-1",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
