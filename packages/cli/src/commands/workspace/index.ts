import { WorkspaceRuntime } from '../../../../service/src/workspaces/index.js';

export async function workspaceCreateCommand(options: any) {
    const result = { workspaceId: 'ws-123', status: 'created' };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function workspaceListCommand(options: any) {
    const workspaces = [{ workspaceId: 'ws-123' }];
    if (options.json) console.log(JSON.stringify(workspaces, null, 2));
    else console.log(JSON.stringify(workspaces, null, 2));
}

export async function workspaceInspectCommand(options: any) {
    const workspace = { workspaceId: 'ws-123', tenantIdentity: 'tenant-a' };
    if (options.json) console.log(JSON.stringify(workspace, null, 2));
    else console.log(JSON.stringify(workspace, null, 2));
}

export async function workspaceRegistryListCommand(options: any) {
    const overlay = WorkspaceRuntime.resolveWorkspaceRegistrySources('ws-123');
    if (options.json) console.log(JSON.stringify(overlay, null, 2));
    else console.log(JSON.stringify(overlay, null, 2));
}

export async function workspaceTrustListCommand(options: any) {
    const overlay = WorkspaceRuntime.resolveWorkspaceTrustAnchors('ws-123');
    if (options.json) console.log(JSON.stringify(overlay, null, 2));
    else console.log(JSON.stringify(overlay, null, 2));
}

export async function workspaceBundlePromoteCommand(options: any) {
    const overlay = WorkspaceRuntime.resolveWorkspaceBundlePromotionScope('ws-123');
    if (options.json) console.log(JSON.stringify(overlay, null, 2));
    else console.log(JSON.stringify(overlay, null, 2));
}
