import type { TopologyValidator } from './TopologyValidator';
import type { ValidatorTopologyView } from '../topology/validator-topology-view';
import type { ValidatorResult } from './validator-result';
import type { ValidatorRunnerResultEnvelope } from './validator-runner-envelope';

export class ValidatorRunner {
  private readonly validators: readonly TopologyValidator[];

  constructor(validators: readonly TopologyValidator[]) {
    const seenIds = new Set<string>();
    for (const v of validators) {
      if (seenIds.has(v.validatorId)) {
        throw new Error(`Duplicate validatorId detected: ${v.validatorId}`);
      }
      seenIds.add(v.validatorId);
    }
    this.validators = validators;
  }

  public run(view: ValidatorTopologyView): ValidatorRunnerResultEnvelope {
    const results = this.validators.map(validator => this.executeValidator(validator, view));
    return {
      executionSurfaceVersion: "1.0.0",
      results
    };
  }

  private executeValidator(validator: TopologyValidator, view: ValidatorTopologyView): ValidatorResult {
    if (validator.requiredCapabilities && validator.requiredCapabilities.length > 0) {
      const manifest = view.capabilities.manifest;
      // We check that the manifest exists and that the requested capabilities evaluate to truthy
      const missingCapabilities = validator.requiredCapabilities.filter(
        cap => !manifest[cap as keyof typeof manifest]
      );

      if (missingCapabilities.length > 0) {
        return {
          validatorId: validator.validatorId,
          success: true,
          diagnostics: [
            {
              code: 'VALIDATOR_SKIPPED',
              message: `Validator skipped due to missing required capabilities: ${missingCapabilities.join(', ')}`,
              severity: 'info',
            }
          ]
        };
      }
    }

    return validator.run(view);
  }
}
