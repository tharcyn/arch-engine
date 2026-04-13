import { AdapterExecutionTrustProfile, AdapterCapabilityDeclaration } from './adapterTrustContract.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export class AdapterTrustEnforcement {
  
  public validateAdapterRegistrationProfile(declaration: AdapterCapabilityDeclaration, profile: AdapterExecutionTrustProfile) {
     if (!profile) {
        throw new PolicyRuntimeError({
          code: PolicyRuntimeErrorCode.MISSING_DEPENDENCY,
          message: 'Adapter execution trust profile missing.',
          policyId: declaration.adapterId,
          policyNamespace: 'system'
        });
     }
  }

  public enforceNegotiationTrustCompatibility(adapterId: string, profile: AdapterExecutionTrustProfile, requestedTier: string) {
     if (profile.trustTier === 'untrusted' && requestedTier === 'verified') {
        throw new PolicyRuntimeError({
          code: PolicyRuntimeErrorCode.INCOMPATIBLE_CAPABILITY_DESCRIPTOR,
          message: `Implicit trust escalation blocked for adapter ${adapterId}`,
          policyId: adapterId,
          policyNamespace: 'system'
        });
     }
  }

  public measureAdapterExecutionDuration(adapterId: string, startTime: number): number {
      const duration = Date.now() - startTime;
      return duration;
  }

  public enforceExecutionBudget(adapterId: string, profile: AdapterExecutionTrustProfile, durationMs: number) {
      if (durationMs > profile.maxExecutionMs) {
          throw new PolicyRuntimeError({
            code: PolicyRuntimeErrorCode.INCOMPATIBLE_CAPABILITY_DESCRIPTOR,
            message: `Execution budget exceeded for adapter ${adapterId}. Limit ${profile.maxExecutionMs}ms, took ${durationMs}ms`,
            policyId: adapterId,
            policyNamespace: 'system'
          });
      }
  }

  public enforceMaxEdgeCount(adapterId: string, profile: AdapterExecutionTrustProfile, edgeCount: number) {
      if (edgeCount > profile.maxEdgeCount) {
          throw new PolicyRuntimeError({
            code: PolicyRuntimeErrorCode.INCOMPATIBLE_CAPABILITY_DESCRIPTOR,
            message: `Max edge injection exceeded for adapter ${adapterId}. Limit ${profile.maxEdgeCount}, attempted ${edgeCount}`,
            policyId: adapterId,
            policyNamespace: 'system'
          });
      }
  }

  public validateAdapterOutputSchema(adapterId: string, profile: AdapterExecutionTrustProfile, output: any) {
      if (profile.mustDeclareSideEffects && (!output || output.declaredSideEffects === undefined)) {
          throw new PolicyRuntimeError({
            code: PolicyRuntimeErrorCode.INCOMPATIBLE_CAPABILITY_DESCRIPTOR,
            message: `Mutation side effects not declared by adapter ${adapterId}`,
            policyId: adapterId,
            policyNamespace: 'system'
          });
      }
  }
}
