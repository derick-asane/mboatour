/// The Mboatour mark: a map pin drawn as a compass needle.
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-[0.6rem] bg-accent text-accent-foreground ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[62%] w-[62%]"
      >
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
        <path d="m14.4 7.6-1.1 3.7-3.7 1.1 1.1-3.7 3.7-1.1Z" />
      </svg>
    </span>
  );
}
