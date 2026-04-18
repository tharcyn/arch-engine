export class ExceptionWaiverRuntime {
    static waive(): string { return 'waived'; }
    static listWaivers(): string { return 'waivers-listed'; }
}

export class WaiverDescriptor {}
export class WaiverScopeResolver {}
export class WaiverExpiryTracker {}
export class CompensatingControlLinker {}
export class RiskAcceptanceRecorder {}
