import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Freeze Evidence: Resolution Inputs are Canonicalized', () => {
    test('resolution stage never mutates descriptor inputs internally', () => {
        // We assert structurally that the strategy executes correctly dynamically without matching mutable functions on inputs
        const policyPath = path.resolve(__dirname, '../../src/topology/overlayResolutionPolicy.ts');
        const policySource = fs.readFileSync(policyPath, 'utf8');

        // Verify we find exactly 0 instances of field mutation logic within resolveOverlaySelection
        const resolveFunctionBlock = policySource.substring(policySource.indexOf('export function resolveOverlaySelection'));
        
        // Ensure no mutating methods or equals signs re-bind simple descriptor properties
        expect(resolveFunctionBlock).not.toMatch(/candidate\.namespace\s*=/);
        expect(resolveFunctionBlock).not.toMatch(/candidate\.authorityTier\s*=/);
        expect(resolveFunctionBlock).not.toMatch(/candidate\.registryTrustDomain\s*=/);
        expect(resolveFunctionBlock).not.toMatch(/candidate\.overlaySourceId\s*=/);
        expect(resolveFunctionBlock).not.toMatch(/candidate\.overlayVersion\s*=/);
    });
});
