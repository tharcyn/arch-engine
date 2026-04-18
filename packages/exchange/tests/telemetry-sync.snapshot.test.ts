import { describe, test, expect, vi } from 'vitest';
import { exchangeTelemetrySyncCommand } from '../../cli/src/commands/exchange/index.js';

describe('Telemetry Sync', () => {
    test('renders deterministic telemetry sync', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await exchangeTelemetrySyncCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "telemetry-synced",
          }
        `);
        consoleSpy.mockRestore();
    });
});
