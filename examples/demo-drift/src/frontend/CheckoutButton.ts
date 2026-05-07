// frontend/CheckoutButton.ts
//
// This is the "drift" — a frontend module that imports the payment
// gateway directly, bypassing the services layer.
//
// In a healthy architecture, frontend should call services, and only
// services should call the payments gateway. The direct
// frontend → payments import is what arch-engine flags.

import { PaymentService } from '@demo-drift/services';
import { PaymentGateway } from '@demo-drift/payments';

export function checkout(amount: number): void {
  // Healthy path: go through the services layer.
  PaymentService.charge(amount);

  // Drift: skipping services, talking to the gateway directly.
  // arch-engine catches this with a `frontend → payments` edge.
  PaymentGateway.directlyCharge(amount);
}
