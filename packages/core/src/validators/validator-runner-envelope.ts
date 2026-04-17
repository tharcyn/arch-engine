import type { ValidatorResult } from './validator-result';

export interface ValidatorRunnerResultEnvelope {
  // Version of the validator execution contract surface.
  // Independent from ingestion schema version and projectionSurfaceVersion.
  readonly executionSurfaceVersion: "1.0.0";
  readonly results: readonly ValidatorResult[];
}
