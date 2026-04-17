export interface PolicyPackSignatureVerificationResult {
    readonly verified: boolean;
    readonly expectedSignature?: string;
    readonly actualSignature?: string;
}
