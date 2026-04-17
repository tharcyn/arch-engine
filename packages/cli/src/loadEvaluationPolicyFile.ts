import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateEvaluationPolicyFile, type FederationEvaluationPolicyFile } from '@arch-engine/core';

export interface LoadEvaluationPolicyFileOptions {
    readonly cwd?: string;
}

export function loadEvaluationPolicyFile(options?: LoadEvaluationPolicyFileOptions): FederationEvaluationPolicyFile | null {
    const cwd = options?.cwd ?? process.cwd();
    const policyPath = path.resolve(cwd, '.arch-engine/evaluation-policy.json');

    if (!fs.existsSync(policyPath)) {
        return null;
    }

    try {
        const rawContent = fs.readFileSync(policyPath, 'utf8');
        const parsed = JSON.parse(rawContent);
        return validateEvaluationPolicyFile(parsed);
    } catch (e: any) {
        throw new Error(`Failed to load evaluation policy from ${policyPath}: ${e.message}`);
    }
}
