export class QuotaEnforcementRuntime {
    static inspectQuota(): string { return 'quota-inspected'; }
    static validateQuota(): string { return 'quota-validated'; }
}

export class QuotaDescriptor {}
export class QuotaValidator {}
export class QuotaBreachResolver {}
