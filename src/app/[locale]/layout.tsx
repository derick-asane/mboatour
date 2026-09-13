import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand";
import { SiteHeader } from "@/components/site-header";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Common" });

  return { title: t("appName"), description: t("tagline") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const common = await getTranslations("Common");
  const nav = await getTranslations("Nav");

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider>
          <SiteHeader />

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>

          <footer className="mt-8 border-t border-line bg-surface">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
              <div className="flex items-center gap-3">
                <BrandMark className="h-8 w-8" />
                <div>
                  <p className="text-sm font-semibold tracking-tight">
                    {common("appName")}
                  </p>
                  <p className="text-xs text-muted">{common("tagline")}</p>
                </div>
              </div>

              <nav className="flex items-center gap-1">
                <Link href="/sites" className="nav-link">
                  {nav("sites")}
                </Link>
                <Link href="/sites/new" className="nav-link">
                  {nav("createSite")}
                </Link>
              </nav>

              <p className="text-xs text-faint">
                &copy; {new Date().getFullYear()} {common("appName")}
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
