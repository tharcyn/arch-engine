import type { PolicyPackFinding } from './PolicyPackFinding.js';

export interface PolicyPackEvaluationResult {
    readonly status: 'success' | 'failure' | 'degraded' | 'skipped';
    readonly findings: readonly PolicyPackFinding[];
    readonly summaryMessage: string;
    readonly telemetryHints?: Record<string, string | number | boolean>;
}
