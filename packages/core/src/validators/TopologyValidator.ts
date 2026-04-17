import type { ValidatorTopologyView } from '../topology/validator-topology-view';
import type { ValidatorResult } from './validator-result';

export interface TopologyValidator {
  readonly validatorId: string;
  readonly displayName: string;
  readonly requiredCapabilities?: readonly string[];

  run(view: ValidatorTopologyView): ValidatorResult;
}
