import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { VisitDecision } from "@/app/[locale]/manage/[slug]/visits/visit-decision";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/avatar";
import { SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { loadManagedSite } from "@/server/manage";

export default async function ManageVisitsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { site } = await loadManagedSite(slug, "MANAGE_VISITS");
  const t = await getTranslations("Visits");
  const format = await getFormatter();

  const requests = await prisma.visitRequest.findMany({
    where: { siteId: site.id },
    orderBy: [{ status: "asc" }, { visitDate: "asc" }],
    include: {
      user: { select: { name: true, email: true, image: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-5">
      <SectionHeader title={t("title")} />

      {requests.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const who = request.user.name ?? request.user.email;

            return (
              <li key={request.id} className="card space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar
                    name={who}
                    imageUrl={request.user.image}
                    title={request.user.email}
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-medium">{who}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge">
                        {format.dateTime(request.visitDate, {
                          dateStyle: "medium",
                        })}
                      </span>
                      <span className="badge">
                        {t("partySize")}: {request.partySize}
                      </span>
                    </div>
                    {request.message ? (
                      <p className="text-sm leading-relaxed text-muted">
                        {request.message}
                      </p>
                    ) : null}
                    {request.reviewedBy ? (
                      <p className="text-xs text-faint">
                        {t("reviewedBy", {
                          name: request.reviewedBy.name ?? request.reviewedBy.email,
                        })}
                      </p>
                    ) : null}
                  </div>

                  <StatusBadge status={request.status} />
                </div>

                {request.status === "PENDING" ? (
                  <VisitDecision requestId={request.id} />
                ) : request.responseNote ? (
                  <p className="alert">{request.responseNote}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
