import { describe, test, expect, vi } from 'vitest';
import { platformValidateConnectorsCommand } from '../../cli/src/commands/platform/index.js';

describe('Connector Binding', () => {
    test('renders deterministic connector compatibility', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await platformValidateConnectorsCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "connectors-validated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
