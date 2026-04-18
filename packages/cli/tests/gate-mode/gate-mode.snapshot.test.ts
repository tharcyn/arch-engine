import { describe, test, expect, vi } from 'vitest';
import { gateEvaluateCommand } from '../../src/commands/gate/evaluate.js';

describe('Gate Evaluate Command', () => {
    test('outputs pass result when no fail-on provided', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const exitCode = await gateEvaluateCommand({ json: true });
        
        expect(exitCode).toBe(0);
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "bundleSignatureViolations": 0,
            "capabilityIntersectionFailures": 0,
            "datasetCompatibilityFailures": 0,
            "exitCode": 0,
            "findingsDetected": 0,
            "identityCollisionsUnresolved": 0,
            "lockfileDriftDetected": false,
            "passed": true,
            "registryTrustViolations": 0,
          }
        `);
        consoleSpy.mockRestore();
    });

    test('outputs failure result when fail-on condition matches', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const exitCode = await gateEvaluateCommand({ failOn: 'severity>=high', json: true });
        
        expect(exitCode).toBe(1);
        const output = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(output).toMatchInlineSnapshot(`
          {
            "bundleSignatureViolations": 0,
            "capabilityIntersectionFailures": 0,
            "datasetCompatibilityFailures": 0,
            "exitCode": 1,
            "findingsDetected": 5,
            "identityCollisionsUnresolved": 0,
            "lockfileDriftDetected": false,
            "passed": false,
            "registryTrustViolations": 0,
          }
        `);
        consoleSpy.mockRestore();
    });
});
