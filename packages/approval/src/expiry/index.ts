export class ApprovalExpiryRuntime {
    static checkExpiry(): string { return 'expiry-checked'; }
    static revalidate(): string { return 'revalidated'; }
}

export class ApprovalExpiryDescriptor {}
export class ApprovalRevalidationPlanner {}
export class ApprovalDriftInvalidationResolver {}
