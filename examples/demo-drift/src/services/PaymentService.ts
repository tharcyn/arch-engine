// services/PaymentService.ts
//
// The healthy boundary: services owns the integration with payments.
// Frontend should call PaymentService.charge, never PaymentGateway directly.

import { PaymentGateway } from '@demo-drift/payments';

export const PaymentService = {
  charge(amount: number): void {
    // Routing rules, idempotency keys, retries, etc. would live here.
    PaymentGateway.directlyCharge(amount);
  },
};
