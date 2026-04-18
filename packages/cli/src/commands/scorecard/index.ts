import { GovernanceScorecardRuntime, CapabilityAdoptionEffectivenessRuntime } from '../../../../scorecard/src/index.js';
import { PolicyROIAttributionRuntime } from '../../../../scorecard/src/roi/index.js';

export async function scorecardGenerateCommand(options: any) {
    const result = { status: GovernanceScorecardRuntime.generateScorecard() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function scorecardRoiCommand(options: any) {
    const result = { status: PolicyROIAttributionRuntime.measureROI() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function scorecardCapabilityImpactCommand(options: any) {
    const result = { status: CapabilityAdoptionEffectivenessRuntime.measureCapabilityImpact() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
