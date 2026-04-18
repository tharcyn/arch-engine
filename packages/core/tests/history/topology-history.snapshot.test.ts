import { describe, test, expect, vi } from 'vitest';
import { historyTimelineCommand } from '../../../cli/src/commands/history/index.js';

describe('Topology History', () => {
    test('renders deterministic topology history timeline', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await historyTimelineCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "authorityBoundaryTransitions": [
              "auth-b",
            ],
            "edgeMutations": [
              "service-a->service-b",
            ],
            "nodeIntroductions": [
              "service-b",
            ],
            "nodeRemovals": [
              "service-legacy",
            ],
            "providerParticipationShifts": [
              "provider-x",
            ],
          }
        `);
        consoleSpy.mockRestore();
    });
});
