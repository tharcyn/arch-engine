import { DeploymentGateAdapter, RepoTopologyGateAdapter, SchemaRegistryGateAdapter } from '../../../../plugins/src/enforcement-targets/index.js';
import { KubernetesAdmissionAdapter } from '../../../../plugins/src/kubernetes/index.js';
import { CIPipelineGateAdapter } from '../../../../plugins/src/ci/index.js';
import { GitProviderHookAdapter } from '../../../../plugins/src/git/index.js';
import { CloudDeploymentGateAdapter } from '../../../../plugins/src/cloud/index.js';

export async function enforceDeployCommand(options: any) {
    const result = { status: DeploymentGateAdapter.evaluateBeforeDeploy() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function enforceMergeCommand(options: any) {
    const result = { status: RepoTopologyGateAdapter.evaluateBeforeMerge() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function enforceSchemaCommand(options: any) {
    const result = { status: SchemaRegistryGateAdapter.evaluateBeforeSchemaChange() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function enforceKubernetesCommand(options: any) {
    const result = { status: KubernetesAdmissionAdapter.applyAdmissionPolicy() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function enforceCiCommand(options: any) {
    const result = { status: CIPipelineGateAdapter.applyPipelineGate() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function enforceGitCommand(options: any) {
    const result = { status: GitProviderHookAdapter.applyGitProviderHook() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function enforceCloudCommand(options: any) {
    const result = { status: CloudDeploymentGateAdapter.applyCloudDeploymentGate() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
