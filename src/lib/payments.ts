/// Client-safe payment vocabulary: what the picker offers and what each method
/// needs from the payer. No provider code here, so the browser bundle stays
/// free of server concerns.

export const PAYMENT_METHODS = ["MTN_MOMO", "ORANGE_MONEY", "CARD"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

/// Mobile money is charged by pushing a prompt to the payer's handset, so those
/// methods need a phone number; a card does not.
export function needsPhone(method: PaymentMethod): boolean {
  return method === "MTN_MOMO" || method === "ORANGE_MONEY";
}

export function needsCard(method: PaymentMethod): boolean {
  return method === "CARD";
}

/// Cameroonian numbers, with or without the +237 country code. Deliberately
/// forgiving: spaces and dashes are stripped before checking.
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[\s-().]/g, "");
  const match = /^(?:\+?237)?(6\d{8})$/.exec(digits);

  return match ? `+237${match[1]}` : null;
}

export function lastFourDigits(cardNumber: string): string | null {
  const digits = cardNumber.replace(/\D/g, "");

  return digits.length >= 12 && digits.length <= 19 ? digits.slice(-4) : null;
}

/// Luhn check. It catches a mistyped card before anything is charged, which is
/// what a real gateway would do first too.
export function isPlausibleCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");

  if (digits.length < 12 || digits.length > 19) return false;

  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index--) {
    let value = Number(digits[index]);

    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }

    sum += value;
    double = !double;
  }

  return sum % 10 === 0;
}
