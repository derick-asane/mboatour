"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Locales");
  const nav = useTranslations("Nav");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{nav("language")}</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        className="pointer-events-none absolute left-2 h-4 w-4 text-muted"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
      <select
        aria-label={nav("language")}
        className="input w-auto appearance-none py-1 pl-8 pr-7 text-xs"
        defaultValue={locale}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value;
          startTransition(() => {
            router.replace(pathname, {
              locale: nextLocale as (typeof routing.locales)[number],
            });
          });
        }}
      >
        {routing.locales.map((option) => (
          <option key={option} value={option}>
            {t(option)}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
