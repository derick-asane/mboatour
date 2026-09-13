/// Cover art comes from an operator-supplied URL on any host, so it is rendered
/// as a plain `img` rather than opening `next/image` to arbitrary remote hosts.
export function CoverImage({
  src,
  alt,
  className = "",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return <div aria-hidden className={`media-placeholder ${className}`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`media-placeholder object-cover ${className}`}
    />
  );
}
