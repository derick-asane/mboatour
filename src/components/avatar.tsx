/// One person, shown the same way everywhere: their picture when there is one,
/// their initial when there is not. Pictures come from an account upload or from
/// whichever provider they signed in with, so they are rendered as a plain `img`
/// rather than opening `next/image` to arbitrary remote hosts.
export function Avatar({
  name,
  imageUrl,
  className = "",
  title,
}: {
  /// Used for the initial, and only for the initial: an avatar beside a name
  /// that is already on screen adds nothing for a screen reader.
  name: string | null | undefined;
  imageUrl: string | null | undefined;
  /// Size and spacing come from the caller, as they did when this was a span.
  className?: string;
  title?: string;
}) {
  const initial = (name ?? "").trim().charAt(0) || "?";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        title={title}
        className={`avatar object-cover ${className}`}
      />
    );
  }

  return (
    <span aria-hidden className={`avatar ${className}`} title={title}>
      {initial}
    </span>
  );
}
