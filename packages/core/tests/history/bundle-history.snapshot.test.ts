import { describe, test, expect, vi } from 'vitest';
import { historyBundleLineageCommand } from '../../../cli/src/commands/history/index.js';

describe('Bundle History', () => {
    test('renders deterministic bundle history', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await historyBundleLineageCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "dependencyClosureTransitions": [
              "v1->v2",
            ],
            "promotionStageTransitions": [
              "dev->staging",
            ],
            "registryPropagationLineage": [
              "registry-a->registry-b",
            ],
            "signatureTrustShifts": [
              "unsigned->signed",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
