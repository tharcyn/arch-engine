import { describe, test, expect, vi } from 'vitest';
import { annotateGitlabCommand } from '../../src/commands/annotate/index.js';

describe('GitLab Annotation', () => {
    test('renders deterministic gitlab annotation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await annotateGitlabCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "capabilities": [],
            "datasets": [],
            "findings": [
              "Finding [\${finding.findingId}]: \${finding.severity} from \${finding.originatingRule} in \${finding.originatingPack} (\${finding.capabilityUsed})",
            ],
            "identities": [],
            "merges": [],
            "platform": "gitlab",
            "regressions": [],
            "summary": "GitLab MR Summary",
          }
        `);
        consoleSpy.mockRestore();
    });
});
