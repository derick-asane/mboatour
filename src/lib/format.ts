/// Money is stored in minor units so it survives the server/client boundary.
export function formatMoney(
  cents: number,
  currency: string,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/// `datetime-local` inputs need a local-time `YYYY-MM-DDTHH:mm` value.
export function toDateTimeLocal(date: Date | null | undefined): string {
  if (!date) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
