import { getTranslations, setRequestLocale } from "next-intl/server";

import { CoverImage } from "@/components/cover-image";
import { SectionHeader } from "@/components/page-header";
import { SiteCard } from "@/components/site-card";
import { Link } from "@/i18n/navigation";
import { openEventWhere } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const common = await getTranslations("Common");

  const sites = await prisma.touristicSite.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      _count: {
        select: {
          events: { where: { status: "PUBLISHED", ...openEventWhere() } },
        },
      },
    },
  });

  // The hero collage reuses the covers of the newest sites.
  const collage = sites.slice(0, 4);

  return (
    <div className="space-y-14">
      <section className="hero-surface px-6 py-10 sm:px-10 sm:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <p className="eyebrow">{common("tagline")}</p>
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.75rem]">
              {t("heroTitle")}
            </h1>
            <p className="lede max-w-xl text-base">{t("heroSubtitle")}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/sites" className="btn-primary">
                {t("browseCta")}
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/sites/new" className="btn-secondary">
                {t("createCta")}
              </Link>
            </div>
          </div>

          <div className="hidden grid-cols-2 gap-3 lg:grid" aria-hidden>
            {(collage.length > 0 ? collage : [null, null, null, null]).map(
              (site, index) => (
                <CoverImage
                  key={site?.id ?? index}
                  src={site?.coverImageUrl ?? null}
                  alt=""
                  className={`w-full rounded-xl border border-line shadow-sm ${
                    index % 2 === 0 ? "h-36 sm:h-40" : "h-44 sm:h-52"
                  }`}
                />
              ),
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader
          title={t("featured")}
          actions={
            sites.length > 0 ? (
              <Link href="/sites" className="link text-sm">
                {t("browseCta")}
              </Link>
            ) : null
          }
        />

        {sites.length === 0 ? (
          <div className="empty-state">
            <p className="font-medium text-foreground">{t("empty")}</p>
            <Link href="/sites/new" className="btn-primary btn-sm mt-2">
              {t("createCta")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                upcomingEvents={site._count.events}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <SectionHeader title={t("howItWorks")} />
        <div className="grid gap-5 sm:grid-cols-3">
          {(["step1", "step2", "step3"] as const).map((step, index) => (
            <div key={step} className="card space-y-3">
              <span className="badge badge-accent h-7 w-7 justify-center rounded-full p-0 text-sm">
                {index + 1}
              </span>
              <h3 className="font-semibold tracking-tight">
                {t(`${step}Title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {t(`${step}Body`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
