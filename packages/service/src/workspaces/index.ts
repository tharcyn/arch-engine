export interface WorkspaceRegistryOverlay {
    readonly workspaceRegistryOverlay: string[];
    readonly tenantRegistryPriority: string;
    readonly overlayTrustTier: string;
}

export interface WorkspaceTrustOverlay {
    readonly workspaceTrustScope: string[];
    readonly tenantAuthorityDelegation: string;
}

export interface WorkspaceBundleOverlay {
    readonly workspacePromotionLadder: string;
}

export interface GovernanceWorkspace {
    readonly workspaceId: string;
    readonly tenantIdentity: string;
    readonly registryScope: WorkspaceRegistryOverlay;
    readonly trustAnchorScope: WorkspaceTrustOverlay;
    readonly bundlePromotionScope: WorkspaceBundleOverlay;
    readonly policyPackScope: string[];
}

export interface WorkspaceExecutionContext {
    readonly workspaceId: string;
}

export class WorkspaceRuntime {
    static resolveWorkspaceRegistrySources(workspaceId: string): WorkspaceRegistryOverlay {
        return {
            workspaceRegistryOverlay: ['tenant-registry'],
            tenantRegistryPriority: 'high',
            overlayTrustTier: 'tier-1'
        };
    }

    static resolveWorkspaceTrustAnchors(workspaceId: string): WorkspaceTrustOverlay {
        return {
            workspaceTrustScope: ['tenant-anchor'],
            tenantAuthorityDelegation: 'delegated'
        };
    }

    static resolveWorkspaceBundlePromotionScope(workspaceId: string): WorkspaceBundleOverlay {
        return {
            workspacePromotionLadder: 'tenant-ladder'
        };
    }
}
