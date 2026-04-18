import { describe, test, expect, vi } from 'vitest';
import { scorecardCapabilityImpactCommand } from '../../cli/src/commands/scorecard/index.js';

describe('Capability Impact', () => {
    test('renders deterministic capability impact', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await scorecardCapabilityImpactCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "capability-impact-measured",
          }
        `);
        consoleSpy.mockRestore();
    });
});
