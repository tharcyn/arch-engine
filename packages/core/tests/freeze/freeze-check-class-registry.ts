export const FreezeCheckClassRegistry = Object.freeze({
  namespaceIsolation: 'namespaceIsolation',
  abiParity: 'abiParity',
  precedenceOrdering: 'precedenceOrdering',
  closureReplayParity: 'closureReplayParity',
  runtimeDiffIsolation: 'runtimeDiffIsolation',
  snapshotBoundaryLock: 'snapshotBoundaryLock',
  scriptGuardValidation: 'scriptGuardValidation',
  uriResolutionDeterminism: 'uriResolutionDeterminism',
  regexGuard: 'regexGuard',
  taxonomyIdentityLock: 'taxonomyIdentityLock',
  filesystemGuardValidation: 'filesystemGuardValidation',
  transportParity: 'transportParity'
} as const);

export type FreezeCheckClass = keyof typeof FreezeCheckClassRegistry;
