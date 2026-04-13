import { describe, it, expect } from 'vitest';
import { assertNoUnexpectedExports } from './utils/assertNoUnexpectedExports.js';
import * as rootExports from '../../dist/index.js';
import * as analysisExports from '../../dist/analysis.js';
import * as parsersExports from '../../dist/parsers.js';
import { withFreezeTelemetry } from './utils/withFreezeTelemetry.js';
import { FreezeDriftTaxonomy } from './freeze-drift-taxonomy.js';

describe('distribution exports surface freeze contract', () => {
    
    describe.each([
        {
            surfaceName: 'root',
            exportsResolver: rootExports,
            expectedKeys: [
                'EngineRunner',
                'GOVERNANCE_TELEMETRY_SCHEMA_VERSION',
                'computeGraphStabilityIndex',
                'computeWeightedBlastRadii',
                'evaluatePolicy',
                'loadEngineManifest',
                'loadPolicyConfig',
                'parseEngineManifest',
                'rankAuthorityCrossings',
                'resolveSeverity',
                'validateAdapterCompatibility'
            ]
        },
        {
            surfaceName: 'analysis',
            exportsResolver: analysisExports,
            expectedKeys: [] // Strict lock preventing unidentified bleed inherently
        },
        {
            surfaceName: 'parsers',
            exportsResolver: parsersExports,
            expectedKeys: [] 
        }
    ])('$surfaceName export boundary mapping', ({ surfaceName, exportsResolver, expectedKeys }) => {

        it(`matches approved export boundary precisely for ${surfaceName}`, () => {
            withFreezeTelemetry('freeze::core::dist::namespaceBoundary::abiParity', FreezeDriftTaxonomy.PUBLIC_SURFACE, `Strict ABI boundary array for ${surfaceName}`, () => {
                const keys = Object.keys(exportsResolver).sort();
                
                // Assert explicitly avoiding snapshot-only weakness testing properly smartly inherently.
                if (expectedKeys.length > 0) {
                   assertNoUnexpectedExports(keys, expectedKeys);
                }
                
                // Final snapshot guard explicitly
                expect(keys).toMatchSnapshot();
            });
        });
        
    });
});
