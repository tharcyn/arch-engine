/**
 * Handler function signature for overlay seam overrides.
 * Receives the core topology state and returns a potentially modified result.
 */
export type SeamOverrideHandler = (coreTopologyState: any) => any;

/**
 * Per-handler identity envelope for federation-grade overlay composition.
 *
 * Each handler carries its own identity envelope.
 * Identity must never be inherited from activation context.
 *
 * This binding is the prerequisite for:
 * - per-seam authority grants (F-2)
 * - signature verification enforcement (F-3)
 * - cross-registry deterministic sorting (F-4)
 * - mirror equivalence validation (F-5)
 */
export interface OverlayHandlerMetadata {
  readonly overlaySourceId: string;
  readonly overlayVersion: string;
  readonly overlaySignature?: string;
  // F-4: Federation-portable precedence hints for deterministic cross-registry sorting.
  // All fields optional. Sorting produces deterministic output without them.
  readonly overlayNamespace?: string;
  readonly overlayPriority?: number;
  readonly overlayDeclaredOrder?: number;
  readonly overlayRegistrySource?: string;
  readonly overlayOriginRegistry?: string;
  readonly handler: SeamOverrideHandler;
  // F-12: Capability federation identity binding.
  // These fields bind handler execution identity to its manifest identity.
  // They MUST NOT participate in closure hash identity.
  readonly handlerIdentityHash?: string;
  readonly providerIdentity?: string;
  readonly capabilityGrantScope?: readonly string[];
}

export type SeamMergeMode = 
  | 'replace-if-authorized' 
  | 'merge-by-key' 
  | 'append' 
  | 'intersect' 
  | 'deny';

export interface OverlaySeamContract {
  identity: string;
  layer: string;
  target: string;
  allowedOperationType: string;
  mergeMode: SeamMergeMode;
  precedenceMode: string;
  determinismConstraints: readonly string[];
  auditIdentity: string;
  defaultInactive: boolean;
}

export enum OverlayAuthorityTier {
  UNTRUSTED_EXTERNAL = 1,
  SIGNED_EXTERNAL_PACK = 2,
  TRUSTED_POLICY_PACK = 3,
  CORE_INTERNAL = 4
}

/**
 * F-2: Per-seam authority grant.
 *
 * Constrains overlay authority to specific seams. When authorityGrants is
 * present on OverlayActivationContext, a handler may only execute on a seam
 * if that seam has an explicit grant entry.
 *
 * Grants constrain authority — they cannot expand it beyond the global tier.
 * effectiveAuthorityTier = min(globalTier, seamGrant.maxTier)
 */
export interface OverlaySeamAuthorityGrant {
  readonly maxTier: OverlayAuthorityTier;
  readonly allowedMergeModes: readonly SeamMergeMode[];
}

export interface OverlayActivationContext {
  activeOverlays: string[]; // List of explicitly attached overlay packages
  // Multi-overlay stacking algebra:
  // handlers execute deterministically in precedence order
  // rather than last-writer-wins replacement semantics.
  // Each handler in the stack carries its own identity envelope (OverlayHandlerMetadata).
  seamOverrides?: Record<string, readonly OverlayHandlerMetadata[]>;
  // Context-level identity fields serve as fallback only.
  // Per-handler metadata takes precedence when present.
  overlaySourceId?: string;
  overlayVersion?: string;
  overlaySignature?: string;
  overlayRegistrySource?: string;
  overlayOriginRegistry?: string;
  overlayNamespace?: string;
  overlayTrustTier?: OverlayAuthorityTier;
  allowPrecedenceOverrides?: boolean;
  includeSeamExecutionInClosureHash?: boolean;
  // F-2: Per-seam authority grants.
  // When present, authority is scoped per-seam. A handler may only execute
  // on a seam if that seam has an explicit grant in this map.
  // When absent, existing global authority behavior is preserved.
  authorityGrants?: Record<string, OverlaySeamAuthorityGrant>;
}

export interface OverlaySeamRunState {
  telemetry: import('./seamExecutionTelemetry.js').OverlaySeamExecutionRecord[];
  seamHashFingerprints: string[];
  telemetryErrors?: string[];
}

export interface OverlaySeamExecutionContext {
  activation?: OverlayActivationContext;
  runState?: OverlaySeamRunState;
}

export interface OverlayAuthorityResolutionResult {
  overlaySourceId: string;
  overlayVersion: string;
  authorityTier: OverlayAuthorityTier;
  trustAccepted: boolean;
  overridePermissions: string[];
  compatibilityAccepted: boolean;
  rejectionReason?: string;
}

export interface OverlayAuthorityResolutionContract {
  resolveAuthority(
    overlayActivationContext: OverlayActivationContext | undefined,
    seamId: string,
    mergeMode: SeamMergeMode
  ): OverlayAuthorityResolutionResult;
}
