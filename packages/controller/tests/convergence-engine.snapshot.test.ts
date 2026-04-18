import { describe, test, expect, vi } from 'vitest';
import { PolicyConvergenceEngine } from '../src/index.js';

describe('Convergence Engine', () => {
    test('renders deterministic convergence output', async () => {
        expect(PolicyConvergenceEngine.runPolicyConvergenceLoop()).toMatchInlineSnapshot(`"convergence-achieved"`);
    });
});
