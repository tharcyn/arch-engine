export interface KnowledgeGraphNode {
    readonly id: string;
    readonly type: string;
    readonly lifecycleState: string;
}

export interface KnowledgeGraphEdge {
    readonly source: string;
    readonly target: string;
    readonly relationship: string;
    readonly authorityBoundaryTransition: boolean;
}

export interface KnowledgeGraphTimelineIndex {
    readonly nodes: readonly KnowledgeGraphNode[];
    readonly edges: readonly KnowledgeGraphEdge[];
}

export class ArchitectureKnowledgeGraph {
    static buildGraph(): KnowledgeGraphTimelineIndex {
        return {
            nodes: [
                { id: 'service-a', type: 'service', lifecycleState: 'active' }
            ],
            edges: [
                { source: 'service-a', target: 'db-a', relationship: 'calls', authorityBoundaryTransition: false }
            ]
        };
    }
}
