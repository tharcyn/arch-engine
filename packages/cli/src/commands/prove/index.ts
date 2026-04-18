import { ArchitectureIntentProofRuntime } from '../../../../proofs/src/index.js';
import { PolicyConstraintSolver } from '../../../../proofs/src/policy/index.js';
import { DatasetCompatibilityProofRuntime } from '../../../../proofs/src/datasets/index.js';
import { MigrationSafetyProofRuntime } from '../../../../proofs/src/migrations/index.js';
import { AuthorityBoundaryProofRuntime } from '../../../../proofs/src/authority/index.js';

export async function proveIntentCommand(options: any) {
    const result = { status: ArchitectureIntentProofRuntime.proveIntent() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function provePolicyCommand(options: any) {
    const result = { status: PolicyConstraintSolver.provePolicy() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function proveDatasetCommand(options: any) {
    const result = { status: DatasetCompatibilityProofRuntime.proveDataset() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function proveMigrationCommand(options: any) {
    const result = { status: MigrationSafetyProofRuntime.proveMigration() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function proveAuthorityCommand(options: any) {
    const result = { status: AuthorityBoundaryProofRuntime.proveAuthority() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
