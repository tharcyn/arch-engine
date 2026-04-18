import { describe, test, expect, vi } from 'vitest';
import { federationExplainCommand } from '../../src/commands/federationExplain.js';
import * as core from '@arch-engine/core';

vi.mock('@arch-engine/core', () => ({
    runFederatedEvaluationPlan: vi.fn(() => ({
        providers: ['github', 'gitlab'],
        mergedFindings: [{
            code: 'TEST-1',
            severity: 'error',
            message: 'Violation',
            providerProvenance: ['github'],
            datasetProvenance: ['hash1']
        }],
        compatibilityDiagnostics: ['Missing capability X'],
        federationExecutionHash: 'explain-hash'
    }))
}));

describe('Federation Explain CLI Output', () => {
    test('JSON output matches strict schema snapshot', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        
        const exitCode = await federationExplainCommand({ providers: ['github', 'gitlab'], json: true });
        
        expect(exitCode).toBe(3); // 3 = capability intersection insufficient
        expect(logSpy).toHaveBeenCalledTimes(1);
        
        const outputJSON = JSON.parse(logSpy.mock.calls[0][0]);
        
        expect(outputJSON).toMatchInlineSnapshot(`
          {
            "capabilityConstraintsApplied": [
              "Missing capability X",
            ],
            "datasetContributionSummary": {},
            "deduplicatedFindingCount": 1,
            "diagnostics": [
              "Missing capability X",
            ],
            "federationExecutionHash": "explain-hash",
            "findingContributionSummary": {},
            "findings": [
              {
                "code": "TEST-1",
                "datasetProvenance": [
                  "hash1",
                ],
                "message": "Violation",
                "providerProvenance": [
                  "github",
                ],
                "severity": "error",
              },
            ],
            "mergedEdgeCount": 0,
            "mergedNodeCount": 0,
            "providerContributionSummary": {},
            "ruleExecutionEligibilityMatrix": {},
          }
        `);
        
        logSpy.mockRestore();
    });
});
