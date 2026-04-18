export type PublishStrategy = 
    | 'append-only'
    | 'append-with-version-check'
    | 'replace-if-hash-match'
    | 'reject-if-exists';

export type PromotionStage = 
    | 'development'
    | 'staging'
    | 'verified'
    | 'production'
    | 'deprecated'
    | 'revoked';

export type MirrorPropagationPolicy = 
    | 'propagate-immediately'
    | 'propagate-on-promotion'
    | 'do-not-propagate';

export type CatalogMutationMode = 
    | 'strict-parity'
    | 'allow-append';

export interface BundlePublishingDescriptor {
    readonly targetRegistryId: string;
    readonly targetCatalogId: string;
    readonly publishStrategy: PublishStrategy;
    readonly signatureRequirement: 'required' | 'optional' | 'none';
    readonly promotionStage: PromotionStage;
    readonly mirrorPropagationPolicy: MirrorPropagationPolicy;
    readonly catalogMutationMode: CatalogMutationMode;
}
