import { describe, test, expect, vi } from 'vitest';
import { PublicSpecificationPublisherRuntime } from '../../agp-spec/src/publication/index.js';

describe('Spec Publication', () => {
    test('renders deterministic public spec bundle structure', async () => {
        const result = PublicSpecificationPublisherRuntime.publishSpec();
        expect(result).toMatchInlineSnapshot(`"spec-published"`);
    });
});
