import { randomUUID } from "node:crypto";

import type { PaymentMethod } from "@/lib/payments";

/// Payments go through one interface so the aggregator behind it can change
/// without touching the booking flow. Until credentials for a real one are
/// configured, the simulated provider below approves charges, which keeps the
/// whole flow demonstrable end to end.
///
/// Plugging in MTN MoMo, Orange Money or a card acquirer — directly or through
/// an aggregator such as CinetPay, Campay or Fapshi — means adding one adapter
/// here and selecting it in `paymentProvider()`. Nothing else changes.

export type ChargeRequest = {
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  /// Normalised mobile money number, for the wallet methods.
  phone?: string | null;
  cardLast4?: string | null;
  /// Our own identifier for the thing being paid for.
  reference: string;
};

export type ChargeResult =
  | { status: "PAID"; providerRef: string }
  | { status: "FAILED"; failureCode: string };

export type RefundRequest = {
  /// The reference the original charge came back with.
  providerRef: string;
  amountCents: number;
  currency: string;
};

export type RefundResult =
  | { status: "REFUNDED"; refundRef: string }
  | { status: "FAILED"; failureCode: string };

export type PaymentProvider = {
  name: string;
  /// True when charges are simulated, so the UI can say so plainly.
  simulated: boolean;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  refund(request: RefundRequest): Promise<RefundResult>;
};

/// Approves everything except deliberately unlucky inputs, so the failure path
/// can be exercised without a sandbox account:
///   a mobile number ending 0000, or a card ending 0000, is always declined.
const simulatedProvider: PaymentProvider = {
  name: "mock",
  simulated: true,
  async charge(request) {
    // A beat of latency, so the pending state is visible rather than a flash.
    await new Promise((resolve) => setTimeout(resolve, 600));

    const declined =
      request.phone?.endsWith("0000") || request.cardLast4 === "0000";

    if (declined) return { status: "FAILED", failureCode: "declined" };

    return { status: "PAID", providerRef: `sim_${randomUUID()}` };
  },
  async refund(request) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    // A charge that never reached a provider has nothing to send back.
    if (!request.providerRef) {
      return { status: "FAILED", failureCode: "unknownCharge" };
    }

    return { status: "REFUNDED", refundRef: `sim_refund_${randomUUID()}` };
  },
};

/// Swap in a real adapter here once its credentials are present. The booking
/// flow neither knows nor cares which one answered.
export function paymentProvider(): PaymentProvider {
  return simulatedProvider;
}

export function paymentsAreSimulated(): boolean {
  return paymentProvider().simulated;
}
