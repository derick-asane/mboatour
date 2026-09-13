import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { renderEmail } from "@/server/email/layout";
import { appUrl, sendEmail } from "@/server/email/send";

/// Every recipient is written to in the language they chose, which is why each
/// helper looks the locale up rather than using the sender's.
function localeFor(stored: string | null | undefined): string {
  return stored && (routing.locales as readonly string[]).includes(stored)
    ? stored
    : routing.defaultLocale;
}

type Recipient = { email: string; locale?: string | null };

async function deliver(
  recipient: Recipient,
  build: (t: Awaited<ReturnType<typeof getTranslations>>) => {
    subject: string;
    title: string;
    paragraphs: string[];
    action?: { label: string; url: string };
    facts?: { label: string; value: string }[];
  },
): Promise<void> {
  const locale = localeFor(recipient.locale);
  const t = await getTranslations({ locale, namespace: "Email" });
  const common = await getTranslations({ locale, namespace: "Common" });

  const content = build(t);
  const { html, text } = renderEmail({
    appName: common("appName"),
    title: content.title,
    paragraphs: content.paragraphs,
    action: content.action,
    facts: content.facts,
    footer: t("footer", { appName: common("appName") }),
  });

  await sendEmail({ to: recipient.email, subject: content.subject, html, text });
}

/// A notification must never take down the thing that triggered it: a booking
/// is still a booking if the mail server is unreachable.
async function safely(task: Promise<void>): Promise<void> {
  try {
    await task;
  } catch (error) {
    console.error("[email] notification failed:", error);
  }
}

export async function sendPasswordResetEmail(
  recipient: Recipient,
  resetUrl: string,
  expiresInMinutes: number,
): Promise<void> {
  await safely(
    deliver(recipient, (t) => ({
      subject: t("resetSubject"),
      title: t("resetTitle"),
      paragraphs: [t("resetBody", { minutes: expiresInMinutes }), t("resetIgnore")],
      action: { label: t("resetCta"), url: resetUrl },
    })),
  );
}

type BookingContext = {
  siteName: string;
  siteSlug: string;
  eventTitle: string;
  startsAt: string;
  seats: number;
  reference: string;
};

/// Confirms to the visitor, and tells the site team a booking arrived.
export async function sendBookingCreatedEmails(
  visitor: Recipient,
  context: BookingContext,
  siteId: string,
): Promise<void> {
  await safely(
    deliver(visitor, (t) => ({
      subject: t("bookingCreatedSubject", { event: context.eventTitle }),
      title: t("bookingCreatedTitle"),
      paragraphs: [t("bookingCreatedBody", { site: context.siteName })],
      facts: [
        { label: t("factEvent"), value: context.eventTitle },
        { label: t("factWhen"), value: context.startsAt },
        { label: t("factSeats"), value: String(context.seats) },
        { label: t("factReference"), value: context.reference },
      ],
      action: { label: t("viewBookings"), url: appUrl(`/${localeFor(visitor.locale)}/dashboard`) },
    })),
  );

  for (const member of await siteTeam(siteId, "MANAGE_BOOKINGS")) {
    await safely(
      deliver(member, (t) => ({
        subject: t("bookingTeamSubject", { event: context.eventTitle }),
        title: t("bookingTeamTitle"),
        paragraphs: [t("bookingTeamBody", { site: context.siteName })],
        facts: [
          { label: t("factEvent"), value: context.eventTitle },
          { label: t("factWhen"), value: context.startsAt },
          { label: t("factSeats"), value: String(context.seats) },
          { label: t("factReference"), value: context.reference },
        ],
        action: {
          label: t("reviewCta"),
          url: appUrl(`/${localeFor(member.locale)}/manage/${context.siteSlug}/events`),
        },
      })),
    );
  }
}

export async function sendBookingDecisionEmail(
  visitor: Recipient,
  context: BookingContext,
  decision: "CONFIRMED" | "CANCELLED" | "PENDING",
): Promise<void> {
  if (decision === "PENDING") return;

  await safely(
    deliver(visitor, (t) => ({
      subject:
        decision === "CONFIRMED"
          ? t("bookingConfirmedSubject", { event: context.eventTitle })
          : t("bookingCancelledSubject", { event: context.eventTitle }),
      title:
        decision === "CONFIRMED"
          ? t("bookingConfirmedTitle")
          : t("bookingCancelledTitle"),
      paragraphs: [
        decision === "CONFIRMED"
          ? t("bookingConfirmedBody", { site: context.siteName })
          : t("bookingCancelledBody", { site: context.siteName }),
      ],
      facts: [
        { label: t("factEvent"), value: context.eventTitle },
        { label: t("factWhen"), value: context.startsAt },
        { label: t("factReference"), value: context.reference },
      ],
      action: {
        label: t("viewSite"),
        url: appUrl(`/${localeFor(visitor.locale)}/sites/${context.siteSlug}`),
      },
    })),
  );
}

type VisitContext = {
  siteName: string;
  siteSlug: string;
  visitDate: string;
  partySize: number;
  visitorName: string;
};

export async function sendVisitRequestedEmails(
  context: VisitContext,
  siteId: string,
): Promise<void> {
  for (const member of await siteTeam(siteId, "MANAGE_VISITS")) {
    await safely(
      deliver(member, (t) => ({
        subject: t("visitTeamSubject", { site: context.siteName }),
        title: t("visitTeamTitle"),
        paragraphs: [t("visitTeamBody", { name: context.visitorName })],
        facts: [
          { label: t("factWhen"), value: context.visitDate },
          { label: t("factPeople"), value: String(context.partySize) },
        ],
        action: {
          label: t("reviewCta"),
          url: appUrl(`/${localeFor(member.locale)}/manage/${context.siteSlug}/visits`),
        },
      })),
    );
  }
}

export async function sendVisitDecisionEmail(
  visitor: Recipient,
  context: VisitContext,
  decision: "APPROVED" | "REJECTED",
  note: string | null,
): Promise<void> {
  await safely(
    deliver(visitor, (t) => ({
      subject:
        decision === "APPROVED"
          ? t("visitApprovedSubject", { site: context.siteName })
          : t("visitRejectedSubject", { site: context.siteName }),
      title:
        decision === "APPROVED" ? t("visitApprovedTitle") : t("visitRejectedTitle"),
      paragraphs: [
        decision === "APPROVED"
          ? t("visitApprovedBody", { site: context.siteName })
          : t("visitRejectedBody", { site: context.siteName }),
        ...(note ? [note] : []),
      ],
      facts: [
        { label: t("factWhen"), value: context.visitDate },
        { label: t("factPeople"), value: String(context.partySize) },
      ],
      action: {
        label: t("viewSite"),
        url: appUrl(`/${localeFor(visitor.locale)}/sites/${context.siteSlug}`),
      },
    })),
  );
}

export async function sendVerificationDecisionEmail(
  owner: Recipient,
  siteName: string,
  siteSlug: string,
  decision: "VERIFIED" | "REJECTED" | "UNVERIFIED",
  note: string | null,
): Promise<void> {
  if (decision === "UNVERIFIED") return;

  await safely(
    deliver(owner, (t) => ({
      subject:
        decision === "VERIFIED"
          ? t("verifiedSubject", { site: siteName })
          : t("verificationRejectedSubject", { site: siteName }),
      title:
        decision === "VERIFIED" ? t("verifiedTitle") : t("verificationRejectedTitle"),
      paragraphs: [
        decision === "VERIFIED"
          ? t("verifiedBody", { site: siteName })
          : t("verificationRejectedBody", { site: siteName }),
        ...(note ? [note] : []),
      ],
      action: {
        label: t("manageCta"),
        url: appUrl(`/${localeFor(owner.locale)}/manage/${siteSlug}`),
      },
    })),
  );
}

/// The people on a site who hold a given permission, owners always included.
async function siteTeam(
  siteId: string,
  permission: "MANAGE_BOOKINGS" | "MANAGE_VISITS",
): Promise<Recipient[]> {
  const members = await prisma.siteMember.findMany({
    where: {
      siteId,
      OR: [{ role: "OWNER" }, { permissions: { has: permission } }],
    },
    select: { user: { select: { email: true, locale: true } } },
  });

  return members.map((member) => member.user);
}
