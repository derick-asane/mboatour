import { MAX_RATING } from "@/lib/reviews";

/// A row of stars. Presentational and server-safe: the score is already known,
/// so nothing here needs to run in the browser.
export function Stars({
  rating,
  className = "h-4 w-4",
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 text-warning" aria-hidden>
      {Array.from({ length: MAX_RATING }, (_, index) => {
        const filled = index < Math.round(rating);

        return (
          <svg
            key={index}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            className={`${className} ${filled ? "" : "opacity-35"}`}
          >
            <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6Z" />
          </svg>
        );
      })}
    </span>
  );
}

/// Average plus count, the way it appears on a card or beside a title.
export function RatingSummary({
  average,
  count,
  label,
  className = "",
}: {
  average: number | null;
  count: number;
  /// Already pluralised by the caller, which has the translator.
  label: string;
  className?: string;
}) {
  if (average === null || count === 0) {
    return <span className={`text-xs text-faint ${className}`}>{label}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Stars rating={average} className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{average.toFixed(1)}</span>
      <span className="text-xs text-muted">{label}</span>
    </span>
  );
}
