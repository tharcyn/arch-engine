import { describe, test, expect, vi } from 'vitest';
import { agentMaintainAssuranceCommand } from '../../cli/src/commands/agent/index.js';

describe('Approval Packet Refresh', () => {
    test('renders deterministic approval packet refresh structure', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await agentMaintainAssuranceCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "assurance-maintained",
          }
        `);
        consoleSpy.mockRestore();
    });
});
