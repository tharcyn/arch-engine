import { describe, test, expect, vi } from 'vitest';
import { federationDoctorCommand } from '../../src/commands/federationDoctor.js';

describe('Federation Doctor CLI Output', () => {
    test('JSON output matches strict schema snapshot', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        
        const exitCode = await federationDoctorCommand({ json: true });
        
        expect(exitCode).toBe(0);
        expect(logSpy).toHaveBeenCalledTimes(1);
        
        const outputJSON = JSON.parse(logSpy.mock.calls[0][0]);
        
        expect(outputJSON).toMatchInlineSnapshot(`
          {
            "capabilityMatrixStatus": "deterministic",
            "diagnostics": [],
            "federationCompatibilityStatus": "ready",
            "identityResolutionStatus": "contract-stable",
            "ingestionRouterStatus": "active",
            "provenanceMergeStatus": "provenance-aware",
          }
        `);
        
        logSpy.mockRestore();
    });
});
