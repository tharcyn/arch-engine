export interface WorkspaceTopologyEnvelope {
    readonly repositories: readonly string[];
    readonly datasets: readonly string[];
    readonly adapters: readonly string[];
    readonly lockfiles: readonly string[];
    readonly bundles: readonly string[];
    readonly manifests: readonly string[];
}

export class WorkspaceScanner {
    static scanWorkspaceTopology(): WorkspaceTopologyEnvelope {
        return {
            repositories: ['repo-main'],
            datasets: ['topology-dataset-v1'],
            adapters: ['adapter-github'],
            lockfiles: ['arch-engine.lock.json'],
            bundles: ['my-bundle.archpack'],
            manifests: ['pack-manifest.json']
        };
    }
}
