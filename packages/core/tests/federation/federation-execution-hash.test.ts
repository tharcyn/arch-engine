import { describe, test, expect } from 'vitest';
import { computeFederationExecutionHash } from '../../src/federation/computeFederationExecutionHash.js';

describe('Federation Execution Hash', () => {
    test('is deterministic regardless of array ordering', () => {
        const hash1 = computeFederationExecutionHash(['hash2', 'hash1'], ['capB', 'capA'], 'federated');
        const hash2 = computeFederationExecutionHash(['hash1', 'hash2'], ['capA', 'capB'], 'federated');

        expect(hash1).toEqual(hash2);
    });

    test('changes if capabilities change', () => {
        const hash1 = computeFederationExecutionHash(['hash1'], ['capA'], 'federated');
        const hash2 = computeFederationExecutionHash(['hash1'], ['capB'], 'federated');

        expect(hash1).not.toEqual(hash2);
    });

    test('changes if datasets change', () => {
        const hash1 = computeFederationExecutionHash(['hash1'], ['capA'], 'federated');
        const hash2 = computeFederationExecutionHash(['hash2'], ['capA'], 'federated');

        expect(hash1).not.toEqual(hash2);
    });
});
