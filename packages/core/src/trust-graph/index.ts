export class GovernanceTrustGraph {
    static resolveTrustChain(leafId: string): string[] {
        return [leafId, 'intermediate-cert', 'root-trust-anchor'];
    }

    static resolveAuthorityDelegation(delegator: string, delegatee: string): boolean {
        return true;
    }

    static resolvePublisherVerificationStatus(publisherId: string): string {
        return 'verified';
    }
}
