import { useTranslations } from "next-intl";

const TONES: Record<string, string> = {
  PENDING: "badge-warning",
  DRAFT: "badge",
  CONFIRMED: "badge-success",
  APPROVED: "badge-success",
  PUBLISHED: "badge-success",
  CANCELLED: "badge-danger",
  REJECTED: "badge-danger",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Status");

  return (
    <span className={`badge badge-dot ${TONES[status] ?? ""}`}>
      {t.has(status) ? t(status) : status}
    </span>
  );
}
