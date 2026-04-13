export type AdapterTrustTier =
  | 'internal'
  | 'verified'
  | 'untrusted';

export type DeterminismEvidence =
  | 'none'
  | 'self_attested'
  | 'certified_by_harness';

export interface AdapterCapabilityDeclaration {
  adapterId: string;
  outputSchemaVersion: string;
  allowedInputKinds: string[];
}

export interface AdapterExecutionTrustProfile {
  trustTier: AdapterTrustTier;
  determinismEvidence: DeterminismEvidence;

  mustDeclareSideEffects: boolean;

  maxExecutionMs: number;
  maxEdgeCount: number;

  declaresClockIndependence: boolean;
  declaresRandomnessIndependence: boolean;
}
