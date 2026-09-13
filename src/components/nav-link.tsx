"use client";

import { Link, usePathname } from "@/i18n/navigation";

/// Header link that highlights itself on its own section.
export function NavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nav-link ${active ? "nav-link-active" : ""}`}
    >
      {children}
    </Link>
  );
}
