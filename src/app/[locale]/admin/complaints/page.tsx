import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { ComplaintDecision } from "@/app/[locale]/admin/complaints/complaint-decision";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { COMPLAINT_STATUSES, type ComplaintStatus } from "@/lib/complaints";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/server/session";

const TONES: Record<ComplaintStatus, string> = {
  OPEN: "badge-danger",
  REVIEWING: "badge-warning",
  RESOLVED: "badge-success",
  DISMISSED: "",
};

function isStatus(value: string | undefined): value is ComplaintStatus {
  return (
    value !== undefined && (COMPLAINT_STATUSES as readonly string[]).includes(value)
  );
}

/// Complaints about guides, for the people who can actually do something about
/// them. Nothing here is public, and nothing here is shown to the guide.
export default async function AdminComplaintsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePlatformAdmin();

  const { status } = await searchParams;
  const filter = isStatus(status) ? status : null;

  const t = await getTranslations("Complaints");
  const adminT = await getTranslations("Admin");
  const format = await getFormatter();

  const complaints = await prisma.guideComplaint.findMany({
    where: filter ? { status: filter } : {},
    // Anything still waiting on somebody comes first.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      guide: {
        select: {
          slug: true,
          status: true,
          user: { select: { name: true, email: true } },
          _count: { select: { complaints: true } },
        },
      },
      user: { select: { name: true, email: true } },
      booking: { select: { startDate: true, endDate: true, status: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-5">
      <SectionHeader title={t("adminTitle")} description={t("adminHint")} />

      <nav className="flex flex-wrap gap-1 rounded-xl border border-line surface-muted p-1">
        <Link
          href="/admin/complaints"
          className={`tab ${filter ? "" : "tab-active"}`}
        >
          {adminT("filterAll")}
        </Link>
        {COMPLAINT_STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/complaints?status=${value}`}
            className={`tab ${filter === value ? "tab-active" : ""}`}
          >
            {t(`status${value}`)}
          </Link>
        ))}
      </nav>

      {complaints.length === 0 ? (
        <EmptyState title={t("adminEmpty")} />
      ) : (
        <ul className="space-y-3">
          {complaints.map((complaint) => {
            const closed =
              complaint.status === "RESOLVED" || complaint.status === "DISMISSED";

            return (
              <li key={complaint.id} className="card space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`badge ${TONES[complaint.status as ComplaintStatus]}`}
                    >
                      {t(`status${complaint.status}`)}
                    </span>
                    <span className="badge">{t(`reason${complaint.reason}`)}</span>

                    {/* A guide with a history is the thing a reviewer most
                        needs to see, so it is on the card, not a click away. */}
                    {complaint.guide._count.complaints > 1 ? (
                      <span className="badge badge-warning">
                        {t("priorCount", {
                          count: complaint.guide._count.complaints,
                        })}
                      </span>
                    ) : null}

                    {complaint.guide.status === "SUSPENDED" ? (
                      <span className="badge badge-danger">
                        {t("guideSuspended")}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm">
                    <Link
                      href={`/guides/${complaint.guide.slug}`}
                      className="font-medium hover:text-accent"
                    >
                      {complaint.guide.user.name ?? complaint.guide.user.email}
                    </Link>
                    <span className="text-muted">
                      {" · "}
                      {t("reportedBy", {
                        name: complaint.user.name ?? complaint.user.email,
                      })}
                    </span>
                  </p>

                  <p className="text-xs text-faint">
                    {format.dateTime(complaint.createdAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {complaint.booking
                      ? ` · ${t("aboutOuting", {
                          date: format.dateTime(complaint.booking.startDate, {
                            dateStyle: "medium",
                          }),
                        })}`
                      : ` · ${t("noOuting")}`}
                  </p>
                </div>

                <p className="whitespace-pre-wrap rounded-xl border border-line surface-muted p-3 text-sm">
                  {complaint.body}
                </p>

                {closed ? (
                  <div className="space-y-1 rounded-xl border border-line surface-muted p-3">
                    <p className="text-sm font-medium">
                      {complaint.outcome
                        ? t(`outcome${complaint.outcome}`)
                        : t("outcomeNO_ACTION")}
                    </p>
                    {complaint.resolution ? (
                      <p className="text-sm text-muted">{complaint.resolution}</p>
                    ) : null}
                    <p className="text-xs text-faint">
                      {t("decidedBy", {
                        name:
                          complaint.reviewedBy?.name ??
                          complaint.reviewedBy?.email ??
                          "—",
                        date: complaint.reviewedAt
                          ? format.dateTime(complaint.reviewedAt, {
                              dateStyle: "medium",
                            })
                          : "—",
                      })}
                    </p>
                  </div>
                ) : (
                  <ComplaintDecision
                    complaintId={complaint.id}
                    status={complaint.status}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
