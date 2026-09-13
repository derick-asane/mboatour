"use client";

import { Link, usePathname } from "@/i18n/navigation";

type Tab = { key: string; href: string; label: string };

export function ManageNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line surface-muted p-1">
      {tabs.map((tab) => {
        // The overview tab matches exactly; section tabs also match their children.
        const active =
          tab.key === "overview"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`tab ${active ? "tab-active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
