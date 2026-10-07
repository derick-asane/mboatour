import Image from "next/image";

import logo from "@/assets/mboatour-logo.png";

/// The Mboatour wordmark. It already reads "MBOA TOUR", so wherever this
/// appears the name is not repeated beside it.
///
/// The artwork has an opaque white background, so it sits on a white plate of
/// its own rather than straight on the page: that is invisible on the light
/// surface and keeps it from being a hard white rectangle on the dark one.
export function BrandLogo({
  className = "h-8",
  priority = false,
}: {
  /// A height; the width follows from the artwork.
  className?: string;
  /// Set on the header, which is in the first screenful on every page.
  priority?: boolean;
}) {
  return (
    <span className="brand-plate inline-flex shrink-0 items-center">
      <Image
        src={logo}
        alt="Mboatour"
        priority={priority}
        className={`w-auto ${className}`}
        sizes="(max-width: 640px) 120px, 160px"
      />
    </span>
  );
}
