import { describe, test, expect, vi } from 'vitest';
import { trustScorePublisherCommand } from '../../../cli/src/commands/reputation/index.js';

describe('Publisher Score', () => {
    test('renders deterministic publisher score', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await trustScorePublisherCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "publisherTrustScore": 98.5,
          }
        `);
        consoleSpy.mockRestore();
    });
});
