import { useTranslations } from "next-intl";

/// The platform vouching for a site. Shown only once an admin has verified it.
export function VerifiedBadge({ className = "" }: { className?: string }) {
  const t = useTranslations("Verification");

  return (
    <span className={`badge badge-accent ${className}`} title={t("verifiedHint")}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <path d="M12 3.2 5 6v5.4c0 4 2.9 7.6 7 9.4 4.1-1.8 7-5.4 7-9.4V6l-7-2.8Z" />
        <path d="m9.2 12.1 2 2 3.6-3.9" />
      </svg>
      {t("VERIFIED")}
    </span>
  );
}
