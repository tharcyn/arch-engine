import type { FederationEvaluationResult } from './runFederationEvaluationPlan.js';

export interface FederationEvaluationPackSeveritySummary {
    readonly policyPackId: string;
    readonly highestSeverity: 'none' | 'info' | 'warning' | 'error';
    readonly severityCounts: {
        readonly info: number;
        readonly warning: number;
        readonly error: number;
    };
}

export interface FederationEvaluationSeveritySummary {
    readonly highestSeverity: 'none' | 'info' | 'warning' | 'error';
    readonly severityCounts: {
        readonly info: number;
        readonly warning: number;
        readonly error: number;
    };
    readonly packsWithInfo: readonly string[];
    readonly packsWithWarnings: readonly string[];
    readonly packsWithErrors: readonly string[];
    readonly perPack: readonly FederationEvaluationPackSeveritySummary[];
    readonly summaryMessage: string;
    readonly blockingSeverityReached: boolean;
}

export function aggregateFederationEvaluationSeverity(
    result: FederationEvaluationResult
): FederationEvaluationSeveritySummary {
    let globalInfo = 0;
    let globalWarning = 0;
    let globalError = 0;

    const packsWithInfo: string[] = [];
    const packsWithWarnings: string[] = [];
    const packsWithErrors: string[] = [];
    const perPack: FederationEvaluationPackSeveritySummary[] = [];

    for (const pack of result.packResults) {
        let packInfo = 0;
        let packWarning = 0;
        let packError = 0;

        if (pack.evaluationResult?.findings) {
            for (const finding of pack.evaluationResult.findings) {
                if (finding.severity === 'info') packInfo++;
                else if (finding.severity === 'warning') packWarning++;
                else if (finding.severity === 'error') packError++;
            }
        }

        let highestSeverity: 'none' | 'info' | 'warning' | 'error' = 'none';
        if (packError > 0) {
            highestSeverity = 'error';
            packsWithErrors.push(pack.policyPackId);
        } else if (packWarning > 0) {
            highestSeverity = 'warning';
            packsWithWarnings.push(pack.policyPackId);
        } else if (packInfo > 0) {
            highestSeverity = 'info';
            packsWithInfo.push(pack.policyPackId);
        }

        // Technically we can still have info findings even if highest is warning/error
        if (highestSeverity !== 'info' && packInfo > 0) packsWithInfo.push(pack.policyPackId);
        if (highestSeverity !== 'warning' && packWarning > 0) packsWithWarnings.push(pack.policyPackId);

        perPack.push({
            policyPackId: pack.policyPackId,
            highestSeverity,
            severityCounts: {
                info: packInfo,
                warning: packWarning,
                error: packError
            }
        });

        globalInfo += packInfo;
        globalWarning += packWarning;
        globalError += packError;
    }

    let globalHighest: 'none' | 'info' | 'warning' | 'error' = 'none';
    if (globalError > 0) globalHighest = 'error';
    else if (globalWarning > 0) globalHighest = 'warning';
    else if (globalInfo > 0) globalHighest = 'info';

    let summaryMessage = 'No findings emitted.';
    if (globalHighest !== 'none') {
        summaryMessage = `Evaluation completed with a highest severity of ${globalHighest.toUpperCase()} (${globalError} errors, ${globalWarning} warnings, ${globalInfo} info).`;
    }

    return {
        highestSeverity: globalHighest,
        severityCounts: {
            info: globalInfo,
            warning: globalWarning,
            error: globalError
        },
        packsWithInfo,
        packsWithWarnings,
        packsWithErrors,
        perPack,
        summaryMessage,
        blockingSeverityReached: globalError > 0
    };
}
