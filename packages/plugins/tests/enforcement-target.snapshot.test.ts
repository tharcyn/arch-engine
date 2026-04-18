import { describe, test, expect, vi } from 'vitest';
import { enforceDeployCommand, enforceKubernetesCommand } from '../../cli/src/commands/enforce/index.js';

describe('Enforcement Target', () => {
    test('renders deterministic deployment enforcement target', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await enforceDeployCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "deployment-allowed",
          }
        `);
        consoleSpy.mockRestore();
    });

    test('renders deterministic kubernetes admission enforcement', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await enforceKubernetesCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "admission-allowed",
          }
        `);
        consoleSpy.mockRestore();
    });
});
