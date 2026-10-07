import { cookies } from "next/headers";

import { routing } from "@/i18n/routing";
import { buildBookingReceipt } from "@/server/receipts/booking-receipt";

function isLocale(value: string | undefined | null): value is string {
  return Boolean(value) && (routing.locales as readonly string[]).includes(value!);
}

/// This route sits outside the locale-prefixed pages, so `getLocale()` would
/// always answer with the default and hand a French reader an English receipt.
/// The page that links here knows the locale and says so; the cookie is the
/// fallback for a bookmarked link.
async function localeFor(request: Request): Promise<string> {
  const asked = new URL(request.url).searchParams.get("locale");

  if (isLocale(asked)) return asked;

  const stored = (await cookies()).get("NEXT_LOCALE")?.value;

  return isLocale(stored) ? stored : routing.defaultLocale;
}

/// The receipt as a file to keep. Built on request rather than stored, so it
/// always reflects where the booking stands now — including a refund.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;

  const result = await buildBookingReceipt(reference, await localeFor(request));

  if (!result.ok) {
    return new Response(null, { status: result.status });
  }

  return new Response(result.pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      // A receipt is nobody else's business and changes with the booking.
      "Cache-Control": "private, no-store",
    },
  });
}
