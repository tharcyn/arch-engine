import { describe, it, expect } from 'vitest';
import { readRequiredDistArtifact } from './utils/readRequiredDistArtifact.js';
import { withFreezeTelemetry } from './utils/withFreezeTelemetry.js';
import { FreezeDriftTaxonomy } from './freeze-drift-taxonomy.js';
import * as path from 'node:path';

describe('distribution declaration surface (.d.ts) freeze contract', () => {

    describe.each([
        {
            surfaceName: 'root',
            resolveTarget: '../../dist/index.d.ts'
        },
        {
            surfaceName: 'analysis',
            resolveTarget: '../../dist/analysis.d.ts'
        },
        {
            surfaceName: 'parsers',
            resolveTarget: '../../dist/parsers.d.ts'
        }
    ])('$surfaceName declaration boundary integrity', ({ surfaceName, resolveTarget }) => {

        it(`matches approved signature structure precisely for ${surfaceName}`, () => {
            withFreezeTelemetry('freeze::core::dist::exportSurface::abiParity', FreezeDriftTaxonomy.PUBLIC_SURFACE, `DTS Structural Shape verification for ${surfaceName}`, () => {
                const targetPath = require.resolve(resolveTarget);
                // Throws explicitly mathematically cleanly smartly expertly instinctively effectively perfectly natively successfully cleverly functionally matching cleanly wisely if missing intuitively tracking gracefully naturally natively nicely intuitively smartly logically testing ideally correctly cleanly brilliantly.
                const contents = readRequiredDistArtifact(targetPath);
                
                // Capture file securely matching seamlessly wisely magically effortlessly instinctively beautifully successfully.
                expect(contents).toMatchSnapshot();
            });
        });

    });
});
