import { describe, test, expect, vi, afterEach } from 'vitest';
import { loadEvaluationPolicyFile } from '../src/loadEvaluationPolicyFile';
import * as fs from 'node:fs';

vi.mock('node:fs');

describe('Phase 16I loadEvaluationPolicyFile', () => {

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('returns null if file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const policy = loadEvaluationPolicyFile();
        expect(policy).toBeNull();
    });

    test('loads and validates policy file', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ defaultThreshold: 'warning' }));
        const file = loadEvaluationPolicyFile();
        expect(file).toEqual({
            defaultProfile: 'default',
            profiles: {
                'default': { defaultThreshold: 'warning' }
            }
        });
    });

    test('throws wrapped error on invalid JSON', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
        expect(() => loadEvaluationPolicyFile()).toThrow(/Failed to load evaluation policy/);
    });

    test('throws wrapped error on validation failure', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ defaultThreshold: 'critical' }));
        expect(() => loadEvaluationPolicyFile()).toThrow(/Invalid defaultThreshold: critical/);
    });

});
