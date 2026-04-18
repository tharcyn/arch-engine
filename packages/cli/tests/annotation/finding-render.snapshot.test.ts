import { describe, test, expect } from 'vitest';
import { AnnotationRenderer } from '../../src/annotation/index.js';

describe('Finding Renderer', () => {
    test('renders deterministic finding comment', () => {
        const output = AnnotationRenderer.renderFindingAnnotation({
            findingId: 'F-123',
            originatingRule: 'rule-test',
            originatingPack: 'pack-test',
            severity: 'LOW',
            providerProvenance: ['github'],
            datasetProvenance: ['hash1'],
            capabilityUsed: 'cap-test',
            executionModeUsed: 'offline',
            traceReferenceId: 'trace-123'
        });
        expect(output).toMatchInlineSnapshot(`"Finding [\${finding.findingId}]: \${finding.severity} from \${finding.originatingRule} in \${finding.originatingPack} (\${finding.capabilityUsed})"`);
    });
});
