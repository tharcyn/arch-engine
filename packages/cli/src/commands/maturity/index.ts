import { GovernanceMaturityRuntime, CapabilityGapAnalyzer } from '../../../../maturity/src/index.js';

export async function maturityScoreCommand(options: any) {
    const result = { status: GovernanceMaturityRuntime.computeMaturityScore() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function maturityExplainCommand(options: any) {
    const result = { status: GovernanceMaturityRuntime.explainMaturityScore() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function maturityGapsCommand(options: any) {
    const result = { status: CapabilityGapAnalyzer.analyzeGaps() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
