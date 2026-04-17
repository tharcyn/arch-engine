import type { FederationEvaluationResult } from './runFederationEvaluationPlan.js';

export interface FederationFindingCodeSummary {
    readonly code: string;
    readonly category: string;
    readonly coreReserved: boolean;
    readonly taxonomyRepairedObserved: boolean;
    readonly countsBySeverity: { readonly info: number; readonly warning: number; readonly error: number };
    readonly observedPacks: readonly string[];
}

export interface FederationFindingInspectionReport {
    readonly reservedCoreCodePrefix: string;
    readonly totalFindings: number;
    readonly codesObserved: number;
    readonly coreReservedCodesObserved: number;
    readonly packLocalCodesObserved: number;
    readonly taxonomyRepairedCount: number;
    readonly taxonomyRepairedCodes: readonly string[];
    readonly countsByCode: Readonly<Record<string, number>>;
    readonly countsByCategory: Readonly<Record<string, number>>;
    readonly countsBySeverity: { readonly info: number; readonly warning: number; readonly error: number };
    readonly codeSummaries: readonly FederationFindingCodeSummary[];
}

export function inspectFederationEvaluationFindings(
    result: FederationEvaluationResult
): FederationFindingInspectionReport {
    const reservedCoreCodePrefix = 'ARCH_';

    let totalFindings = 0;
    let taxonomyRepairedCount = 0;
    
    const countsByCode = new Map<string, number>();
    const countsByCategory = new Map<string, number>();
    const countsBySeverity = { info: 0, warning: 0, error: 0 };
    
    // Per-code aggregation maps
    const codeCategories = new Map<string, Set<string>>();
    const codeSeverities = new Map<string, { info: number; warning: number; error: number }>();
    const codePacks = new Map<string, Set<string>>();
    const taxonomyRepairedCodesSet = new Set<string>();

    for (const pack of result.packResults) {
        if (!pack.evaluationResult?.findings) continue;

        for (const finding of pack.evaluationResult.findings) {
            totalFindings++;

            // Severity
            countsBySeverity[finding.severity]++;

            // Category
            countsByCategory.set(finding.category, (countsByCategory.get(finding.category) || 0) + 1);

            // Code
            countsByCode.set(finding.code, (countsByCode.get(finding.code) || 0) + 1);

            // Taxonomy tracking
            if (finding.taxonomyRepaired) {
                taxonomyRepairedCount++;
                taxonomyRepairedCodesSet.add(finding.code);
            }

            // Per-code info
            if (!codeCategories.has(finding.code)) {
                codeCategories.set(finding.code, new Set());
                codeSeverities.set(finding.code, { info: 0, warning: 0, error: 0 });
                codePacks.set(finding.code, new Set());
            }

            codeCategories.get(finding.code)!.add(finding.category);
            codeSeverities.get(finding.code)![finding.severity]++;
            codePacks.get(finding.code)!.add(pack.policyPackId);
        }
    }

    const codeSummaries: FederationFindingCodeSummary[] = [];
    let coreReservedCodesObserved = 0;
    let packLocalCodesObserved = 0;

    const sortedCodes = Array.from(countsByCode.keys()).sort();

    for (const code of sortedCodes) {
        const isCoreReserved = code.startsWith(reservedCoreCodePrefix);
        if (isCoreReserved) {
            coreReservedCodesObserved++;
        } else {
            packLocalCodesObserved++;
        }

        const categories = Array.from(codeCategories.get(code)!).sort();
        // Fallback or multiple, but normalizer ensures one category per code strictly usually.
        // If somehow multiple, we join them for display.
        const category = categories.join(',');

        codeSummaries.push({
            code,
            category,
            coreReserved: isCoreReserved,
            taxonomyRepairedObserved: taxonomyRepairedCodesSet.has(code),
            countsBySeverity: codeSeverities.get(code)!,
            observedPacks: Array.from(codePacks.get(code)!).sort()
        });
    }

    const taxonomyRepairedCodes = Array.from(taxonomyRepairedCodesSet).sort();

    const outputCountsByCode: Record<string, number> = {};
    for (const [code, count] of countsByCode.entries()) {
        outputCountsByCode[code] = count;
    }

    const outputCountsByCategory: Record<string, number> = {};
    for (const [cat, count] of countsByCategory.entries()) {
        outputCountsByCategory[cat] = count;
    }

    return {
        reservedCoreCodePrefix,
        totalFindings,
        codesObserved: codeSummaries.length,
        coreReservedCodesObserved,
        packLocalCodesObserved,
        taxonomyRepairedCount,
        taxonomyRepairedCodes,
        countsByCode: outputCountsByCode,
        countsByCategory: outputCountsByCategory,
        countsBySeverity,
        codeSummaries
    };
}
