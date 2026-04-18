import { AssuranceCaseRuntime } from '../../../../assurance/src/index.js';
import { ClaimEvidenceProofGraph } from '../../../../assurance/src/graph/index.js';
import { RegulatorySubmissionBundleRuntime } from '../../../../assurance/src/submission/index.js';
import { ReviewBoardEvidenceRuntime } from '../../../../assurance/src/review/index.js';
import { CounterexampleRuntime } from '../../../../assurance/src/counterexamples/index.js';
import { ResidualRiskRuntime } from '../../../../assurance/src/residual-risk/index.js';

export async function assuranceCreateCommand(options: any) {
    const result = { status: AssuranceCaseRuntime.createAssurance() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function assuranceInspectCommand(options: any) {
    const result = { status: AssuranceCaseRuntime.inspectAssurance() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function assuranceGraphCommand(options: any) {
    const result = { status: ClaimEvidenceProofGraph.graphAssurance() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function assuranceExportSubmissionCommand(options: any) {
    const result = { status: RegulatorySubmissionBundleRuntime.exportSubmission() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function assuranceExportReviewPackCommand(options: any) {
    const result = { status: ReviewBoardEvidenceRuntime.exportReviewPack() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function assuranceCounterexampleCommand(options: any) {
    const result = { status: CounterexampleRuntime.generateCounterexample() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function assuranceResidualRiskCommand(options: any) {
    const result = { status: ResidualRiskRuntime.analyzeRisk() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
