import { describe, test, expect, vi } from 'vitest';
import { annotateGithubCommand } from '../../src/commands/annotate/index.js';

describe('GitHub Annotation', () => {
    test('renders deterministic github annotation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await annotateGithubCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "capabilities": [
              "Blocked by missing capability: \${capability.missingCapability} (Provider: \${capability.blockingProvider}, Dataset: \${capability.blockingDatasetSchema})",
            ],
            "datasets": [],
            "findings": [
              "Finding [\${finding.findingId}]: \${finding.severity} from \${finding.originatingRule} in \${finding.originatingPack} (\${finding.capabilityUsed})",
            ],
            "identities": [],
            "merges": [],
            "platform": "github",
            "regressions": [
              "⚠️ Governance regression detected:\${regression.driftDescription}",
            ],
            "summary": "GitHub PR Summary",
          }
        `);
        consoleSpy.mockRestore();
    });
});
