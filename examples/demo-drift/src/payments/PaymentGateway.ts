// payments/PaymentGateway.ts
//
// The provider integration. Should only be reached through
// the services layer. Direct imports from frontend modules
// are an architecture-drift signal.

export const PaymentGateway = {
  directlyCharge(amount: number): void {
    // Real implementation would talk to the provider.
    // For the demo, this is a placeholder.
    void amount;
  },
};
