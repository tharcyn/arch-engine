import type { FederationEvaluationResult } from './runFederationEvaluationPlan.js';

export type FederationFindingRegistryLintIssueType =
    | 'CORE_PREFIX_IMPERSONATION'
    | 'TAXONOMY_REPAIRED_FINDING'
    | 'RESERVED_CODE_CATEGORY_MISMATCH'
    | 'SUSPICIOUS_CORE_LIKE_CODE';

export interface FederationFindingRegistryLintIssue {
    readonly issueType: FederationFindingRegistryLintIssueType;
    readonly code: string;
    readonly category: string;
    readonly packName?: string;
    readonly summaryMessage: string;
    readonly severity: 'warning' | 'error';
}

export interface FederationFindingRegistryLintReport {
    readonly totalIssues: number;
    readonly issuesBySeverity: { readonly warning: number; readonly error: number };
    readonly issuesByType: Record<FederationFindingRegistryLintIssueType, number>;
    readonly issues: readonly FederationFindingRegistryLintIssue[];
    readonly summaryMessage: string;
}

export function lintFederationFindingRegistry(
    result: FederationEvaluationResult
): FederationFindingRegistryLintReport {
    const issues: FederationFindingRegistryLintIssue[] = [];
    const issuesBySeverity = { warning: 0, error: 0 };
    const issuesByType: Record<FederationFindingRegistryLintIssueType, number> = {
        CORE_PREFIX_IMPERSONATION: 0,
        TAXONOMY_REPAIRED_FINDING: 0,
        RESERVED_CODE_CATEGORY_MISMATCH: 0,
        SUSPICIOUS_CORE_LIKE_CODE: 0
    };

    const seenCodes = new Set<string>();

    for (const pack of result.packResults) {
        if (!pack.evaluationResult?.findings) continue;

        for (const finding of pack.evaluationResult.findings) {
            // Since there can be multiple findings with the same code, we lint each code-category-pack combination once
            const identityKey = `${pack.policyPackId}::${finding.code}::${finding.category}`;
            if (seenCodes.has(identityKey)) continue;
            seenCodes.add(identityKey);

            // TAXONOMY_REPAIRED_FINDING
            if (finding.taxonomyRepaired) {
                issues.push({
                    issueType: 'TAXONOMY_REPAIRED_FINDING',
                    code: finding.code,
                    category: finding.category,
                    packName: pack.policyPackId,
                    summaryMessage: `Finding taxonomy was repaired by normalizer. Fix pack implementation.`,
                    severity: 'warning'
                });
            }

            // CORE_PREFIX_IMPERSONATION
            if (finding.code.startsWith('INVALID_PREFIX_ARCH_')) {
                issues.push({
                    issueType: 'CORE_PREFIX_IMPERSONATION',
                    code: finding.code,
                    category: finding.category,
                    packName: pack.policyPackId,
                    summaryMessage: `Pack attempted to use reserved ARCH_ prefix illegally.`,
                    severity: 'error'
                });
            }

            // RESERVED_CODE_CATEGORY_MISMATCH
            if (finding.code.startsWith('ARCH_')) {
                let expectedCategory = '';
                if (finding.code.startsWith('ARCH_TRUST_')) expectedCategory = 'trust';
                else if (finding.code.startsWith('ARCH_EXECUTION_')) expectedCategory = 'execution';
                else if (finding.code.startsWith('ARCH_COMPATIBILITY_')) expectedCategory = 'compatibility';
                else if (finding.code.startsWith('ARCH_GOVERNANCE_')) expectedCategory = 'governance';
                else if (finding.code.startsWith('ARCH_ADVISORY_')) expectedCategory = 'advisory';

                if (expectedCategory && finding.category !== expectedCategory) {
                    issues.push({
                        issueType: 'RESERVED_CODE_CATEGORY_MISMATCH',
                        code: finding.code,
                        category: finding.category,
                        packName: pack.policyPackId,
                        summaryMessage: `Code ${finding.code} belongs to category '${expectedCategory}' but was emitted as '${finding.category}'.`,
                        severity: 'error'
                    });
                }
            }

            // SUSPICIOUS_CORE_LIKE_CODE
            const originalCode = finding.code.replace('INVALID_PREFIX_', '');
            if (originalCode.startsWith('ARC_') || (originalCode.startsWith('ARCH') && !originalCode.startsWith('ARCH_'))) {
                issues.push({
                    issueType: 'SUSPICIOUS_CORE_LIKE_CODE',
                    code: finding.code,
                    category: finding.category,
                    packName: pack.policyPackId,
                    summaryMessage: `Code strongly resembles reserved core prefix ARCH_ but is malformed.`,
                    severity: 'warning'
                });
            }
        }
    }

    // Sort deterministically
    issues.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
        if (a.issueType !== b.issueType) return a.issueType.localeCompare(b.issueType);
        if (a.code !== b.code) return a.code.localeCompare(b.code);
        if (a.packName !== b.packName) return (a.packName || '').localeCompare(b.packName || '');
        return a.category.localeCompare(b.category);
    });

    for (const issue of issues) {
        issuesBySeverity[issue.severity]++;
        issuesByType[issue.issueType]++;
    }

    const totalIssues = issues.length;
    let summaryMessage = 'Finding registry is clean. No taxonomy or core protection issues found.';
    if (totalIssues > 0) {
        summaryMessage = `Found ${totalIssues} registry issue(s): ${issuesBySeverity.error} error(s), ${issuesBySeverity.warning} warning(s).`;
    }

    return {
        totalIssues,
        issuesBySeverity,
        issuesByType,
        issues,
        summaryMessage
    };
}
