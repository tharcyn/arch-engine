import { describe, test, expect } from 'vitest';
import { inspectOverlayResolutionDecision } from '../../src/transport/federationDiagnostics.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Freeze Evidence: Diagnostic Sovereignty - No Numeric Score Leakage', () => {
    test('dynamic diagnostic outputs must not leak numeric arithmetic coefficients', () => {
        const diagnostics = inspectOverlayResolutionDecision(
            'seam', [], 'AUTHORITY_FIRST', [], [], false, true, false, false, null, {}, []
        );

        // Ensure diagnostic structure natively prevents number types on its top level representation 
        // to block scalar precedence logic leakage
        Object.values(diagnostics).forEach(value => {
            expect(typeof value).not.toBe('number');
        });
    });

    test('cli facade correctly maps to identically constrained internal diagnostic structures', () => {
        const facadePath = path.resolve(__dirname, '../../src/cli/diagnosticsFacade.ts');
        const facadeSource = fs.readFileSync(facadePath, 'utf8');

        // Check that facade statically proxies inspectOverlayResolutionDecision
        // without mapping or interpolating arithmetic expressions
        expect(facadeSource).toContain('inspectOverlayResolutionDecision(');
        expect(facadeSource).not.toMatch(/score|weight|rank(?!\w)/i);
    });
});
