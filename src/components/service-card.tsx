import { useTranslations } from "next-intl";

import { CoverImage } from "@/components/cover-image";
import { RatingSummary } from "@/components/reviews/stars";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";

type ServiceCardProps = {
  service: {
    slug: string;
    kind: string;
    name: string;
    summary: string | null;
    city: string | null;
    country: string | null;
    coverImageUrl: string | null;
    verification: string;
    entryFeeCents: number;
    currency: string;
    ratingAverage: number | null;
    ratingCount: number;
  };
  locale: string;
};

/// A service on a list. It leads with what it is, because "Hotel" tells a
/// traveller more about a strange name than a category ever would, and it
/// carries the badge, since nothing unverified is listed here at all.
export function ServiceCard({ service, locale }: ServiceCardProps) {
  const kinds = useTranslations("PlaceKinds");
  const t = useTranslations("Services");
  const reviews = useTranslations("Reviews");
  const place = [service.city, service.country].filter(Boolean).join(", ");

  return (
    <Link
      href={`/services/${service.slug}`}
      className="card card-flush card-interactive group flex flex-col"
    >
      <div className="relative">
        <CoverImage
          src={service.coverImageUrl}
          alt=""
          className="h-40 w-full object-cover"
        />
        <span className="badge absolute left-3 top-3 bg-surface/90 backdrop-blur">
          {kinds(service.kind)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-1.5 font-semibold tracking-tight transition group-hover:text-accent">
            {service.name}
            {service.verification === "VERIFIED" ? (
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

        {service.summary ? (
          <p className="line-clamp-2 text-sm text-muted">{service.summary}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          {service.entryFeeCents > 0 ? (
            <p className="text-xs font-medium text-accent">
              {t("fromPrice", {
                price: formatMoney(
                  service.entryFeeCents,
                  service.currency,
                  locale,
                ),
              })}
            </p>
          ) : (
            <span />
          )}
          <RatingSummary
            average={service.ratingAverage}
            count={service.ratingCount}
            label={reviews("count", { count: service.ratingCount })}
          />
        </div>
      </div>
    </Link>
  );
}
