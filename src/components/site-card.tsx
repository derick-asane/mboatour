import { useTranslations } from "next-intl";

import { CoverImage } from "@/components/cover-image";
import { RatingSummary } from "@/components/reviews/stars";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";

type SiteCardProps = {
  site: {
    slug: string;
    name: string;
    summary: string | null;
    city: string | null;
    country: string | null;
    category: string | null;
    coverImageUrl: string | null;
    verification: string;
    ratingAverage: number | null;
    ratingCount: number;
  };
  upcomingEvents: number;
};

export function SiteCard({ site, upcomingEvents }: SiteCardProps) {
  const t = useTranslations("Sites");
  const categories = useTranslations("Categories");
  const reviews = useTranslations("Reviews");
  const place = [site.city, site.country].filter(Boolean).join(", ");

  return (
    <Link
      href={`/sites/${site.slug}`}
      className="card card-flush card-interactive group flex flex-col"
    >
      <div className="relative">
        <CoverImage
          src={site.coverImageUrl}
          alt=""
          className="h-40 w-full object-cover"
        />
        {site.category ? (
          <span className="badge absolute left-3 top-3 bg-surface/90 backdrop-blur">
            {categories.has(site.category)
              ? categories(site.category)
              : site.category}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-1.5 font-semibold tracking-tight transition group-hover:text-accent">
            {site.name}
            {site.verification === "VERIFIED" ? (
              <VerifiedBadge className="shrink-0" />
            ) : null}
          </h3>
          {place ? (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 shrink-0"
              >
                <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {place}
            </p>
          ) : null}
        </div>

        {site.summary ? (
          <p className="line-clamp-2 text-sm text-muted">{site.summary}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-xs font-medium text-accent">
            {t("upcomingEvents", { count: upcomingEvents })}
          </p>
          <RatingSummary
            average={site.ratingAverage}
            count={site.ratingCount}
            label={reviews("count", { count: site.ratingCount })}
          />
        </div>
      </div>
    </Link>
  );
}
