import { describe, test, expect, vi } from 'vitest';
import { semanticTranslateCapabilityCommand } from '../../cli/src/commands/semantic/index.js';

describe('Capability Ontology', () => {
    test('renders deterministic capability ontology', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await semanticTranslateCapabilityCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "status": "capability-translated",
          }
        `);
        consoleSpy.mockRestore();
    });
});
