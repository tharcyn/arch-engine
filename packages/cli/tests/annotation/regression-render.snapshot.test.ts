import { describe, test, expect } from 'vitest';
import { AnnotationRenderer } from '../../src/annotation/index.js';

describe('Regression Renderer', () => {
    test('renders deterministic regression comment', () => {
        const output = AnnotationRenderer.renderRegressionAnnotation({
            driftType: 'DRIFT_SEVERITY',
            driftDescription: 'Severity increased'
        });
        expect(output).toMatchInlineSnapshot(`"⚠️ Governance regression detected:\${regression.driftDescription}"`);
    });
});
