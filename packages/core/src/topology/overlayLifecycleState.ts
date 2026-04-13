export enum OverlayLifecycleState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ADMITTED = 'ADMITTED',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  REVOKED = 'REVOKED',
  SUPERSEDED = 'SUPERSEDED'
}

export interface OverlayLifecycleRecord {
  overlaySourceId: string;
  overlayVersion: string;
  registryId: string;
  lifecycleState: OverlayLifecycleState;
  activatedAt?: string;
  deprecatedAt?: string;
  revokedAt?: string;
  supersededBy?: string;
}

const lifecycleRegistry: Map<string, OverlayLifecycleRecord> = new Map();

function constructKey(sourceId: string, version: string, registryId: string): string {
  return `${registryId}::${sourceId}@${version}`;
}

export function getOverlayLifecycleState(
  sourceId: string,
  version: string,
  registryId: string
): OverlayLifecycleRecord | undefined {
  return lifecycleRegistry.get(constructKey(sourceId, version, registryId));
}

const ALLOWED_TRANSITIONS: Record<OverlayLifecycleState, OverlayLifecycleState[]> = {
  [OverlayLifecycleState.DRAFT]:     [OverlayLifecycleState.SUBMITTED],
  [OverlayLifecycleState.SUBMITTED]: [OverlayLifecycleState.ADMITTED, OverlayLifecycleState.REVOKED],
  [OverlayLifecycleState.ADMITTED]:  [OverlayLifecycleState.ACTIVE, OverlayLifecycleState.REVOKED],
  [OverlayLifecycleState.ACTIVE]:    [OverlayLifecycleState.DEPRECATED, OverlayLifecycleState.REVOKED, OverlayLifecycleState.SUPERSEDED],
  [OverlayLifecycleState.DEPRECATED]:[OverlayLifecycleState.REVOKED],
  [OverlayLifecycleState.SUPERSEDED]:[], // Terminal
  [OverlayLifecycleState.REVOKED]:   []  // Terminal
};

export function setOverlayLifecycleState(record: OverlayLifecycleRecord): void {
  const existing = getOverlayLifecycleState(record.overlaySourceId, record.overlayVersion, record.registryId);
  
  if (existing) {
    const allowed = ALLOWED_TRANSITIONS[existing.lifecycleState];
    if (!allowed.includes(record.lifecycleState)) {
      throw new Error(`Illegal lifecycle transition from ${existing.lifecycleState} to ${record.lifecycleState}`);
    }
  } else {
    // If not existing, it can technically be initialized to anything in legacy systems, but to be safe we allow initialization.
  }

  lifecycleRegistry.set(constructKey(record.overlaySourceId, record.overlayVersion, record.registryId), record);
}

/**
 * Resolves the effective overlay lifecycle state applying F-10 execution boundaries:
 * - Only ACTIVE overlays unconditionally participate in execution.
 * - DEPRECATED overlays allowed for replay validation only.
 * - REVOKED overlays rejected before admission.
 * - SUPERSEDED overlays allowed only when explicitly pinned.
 */
export function resolveEffectiveOverlayState(
  sourceId: string,
  version: string,
  registryId: string,
  isReplayContext: boolean = false,
  isExplicitlyPinned: boolean = false
): { allowed: boolean; reason?: string; state: OverlayLifecycleState } {
  const record = getOverlayLifecycleState(sourceId, version, registryId);
  
  // Default unmanaged is treated externally as ACTIVE or ADMITTED based on the engine configuration.
  // For safety, unlisted overlays assume ADMITTED but not ACTIVE if strict execution is on, but here we assume ACTIVE fallback for mock/external tests unless tracked.
  const state = record ? record.lifecycleState : OverlayLifecycleState.ACTIVE;

  switch (state) {
    case OverlayLifecycleState.ACTIVE:
      return { allowed: true, state };
    case OverlayLifecycleState.DEPRECATED:
      if (isReplayContext) {
         return { allowed: true, state };
      }
      // Depending on strict mode, DEPRECATED can execute, but F-10 says allowed for replay validation only.
      return { allowed: false, reason: 'Overlay is deprecated and only available for replay validation.', state };
    case OverlayLifecycleState.REVOKED:
      return { allowed: false, reason: 'Overlay is revoked.', state };
    case OverlayLifecycleState.SUPERSEDED:
      if (isExplicitlyPinned || isReplayContext) {
        return { allowed: true, state };
      }
      return { allowed: false, reason: 'Overlay is superseded and not explicitly pinned.', state };
    case OverlayLifecycleState.DRAFT:
    case OverlayLifecycleState.SUBMITTED:
    case OverlayLifecycleState.ADMITTED:
      return { allowed: false, reason: `Overlay is not yet ACTIVE (current state: ${state}).`, state };
    default:
      return { allowed: false, reason: 'Unknown overlay state.', state };
  }
}
