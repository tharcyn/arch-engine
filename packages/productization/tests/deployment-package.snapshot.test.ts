import { describe, test, expect, vi } from 'vitest';
import { productDeploymentModesCommand } from '../../cli/src/commands/productization/index.js';

describe('Deployment Package', () => {
    test('renders deterministic deployment package definitions', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await productDeploymentModesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "deployment-modes-listed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
