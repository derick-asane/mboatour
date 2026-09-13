/// Prices are quoted in FCFA by default. Codes are ISO 4217, so `Intl` renders
/// each one the way the reader's locale expects.
export const DEFAULT_CURRENCY = "XAF";

export const CURRENCIES = [
  { code: "XAF", label: "FCFA — Central Africa (XAF)" },
  { code: "XOF", label: "FCFA — West Africa (XOF)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "USD", label: "US dollar (USD)" },
] as const;

/// The CFA franc has no subunit: 500 FCFA is a whole price, not 5.00.
const ZERO_DECIMAL_CURRENCIES = new Set(["XAF", "XOF"]);

export function hasSubunits(code: string): boolean {
  return !ZERO_DECIMAL_CURRENCIES.has(code);
}

/// Amounts are stored in minor units; this renders them for a number input.
export function toAmountInput(minorUnits: number, code: string): string {
  return hasSubunits(code)
    ? (minorUnits / 100).toFixed(2)
    : String(Math.round(minorUnits / 100));
}
