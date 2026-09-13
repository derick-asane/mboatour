/// Mail goes out through whichever transport the environment provides, so the
/// app never depends on a particular vendor:
///
///   RESEND_API_KEY set -> Resend's HTTP API (no SDK, plain fetch)
///   otherwise          -> printed to the server log, which is what local
///                         development wants anyway
///
/// Nothing here throws: a failed notification must never fail the booking or
/// the sign-up that triggered it.

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailResult = { sent: boolean; transport: "resend" | "log" };

function sender(): string {
  return process.env.EMAIL_FROM ?? "Mboatour <onboarding@resend.dev>";
}

/// Absolute URLs, because a link in an email has no page to be relative to.
export function appUrl(path: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendWithResend(message: EmailMessage): Promise<boolean> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender(),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    console.error(
      `[email] Resend refused the message: ${response.status} ${await response.text()}`,
    );
    return false;
  }

  return true;
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  try {
    if (process.env.RESEND_API_KEY) {
      return { sent: await sendWithResend(message), transport: "resend" };
    }

    // Development transport. Printing the whole body means a password reset
    // link can be followed straight from the terminal.
    console.info(
      [
        "",
        "──────────── email (not sent: no provider configured) ────────────",
        `to:      ${message.to}`,
        `from:    ${sender()}`,
        `subject: ${message.subject}`,
        "",
        message.text,
        "──────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );

    return { sent: true, transport: "log" };
  } catch (error) {
    console.error("[email] could not be sent:", error);
    return { sent: false, transport: process.env.RESEND_API_KEY ? "resend" : "log" };
  }
}
