import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/avatar";
import { BrandMark } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NavLink } from "@/components/nav-link";
import { isPlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { signOutAction } from "@/server/actions/account";
import { getCurrentUser } from "@/server/session";

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const common = await getTranslations("Common");
  const user = await getCurrentUser();

  // Shown only to people who actually guide, so it stays out of the way for
  // everyone else.
  const guideProfile = user
    ? await prisma.guideProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })
    : null;

  const links = (
    <>
      <NavLink href="/sites">{t("sites")}</NavLink>
      <NavLink href="/guides">{t("guides")}</NavLink>
      {user ? <NavLink href="/dashboard">{t("dashboard")}</NavLink> : null}
      {user ? <NavLink href="/chats">{t("chats")}</NavLink> : null}
      {guideProfile ? <NavLink href="/guide">{t("guiding")}</NavLink> : null}
      {/* The portal only appears for accounts that can actually open it. */}
      {isPlatformAdmin(user?.platformRole) ? (
        <NavLink href="/admin">{t("admin")}</NavLink>
      ) : null}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg pr-1 text-[0.9375rem] font-semibold tracking-tight"
        >
          <BrandMark className="h-7 w-7" />
          {common("appName")}
        </Link>

        <nav className="ml-3 hidden items-center gap-1 sm:flex">{links}</nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />

          {user ? (
            <>
              <Link
                href="/sites/new"
                className="btn-secondary btn-sm hidden sm:inline-flex"
              >
                {t("createSite")}
              </Link>
              <Link href="/account" title={t("account")}>
                <Avatar
                  name={user.name ?? user.email}
                  imageUrl={user.image}
                />
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="btn-ghost btn-sm">
                  {t("signOut")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-sm">
                {t("signIn")}
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                {t("signUp")}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* On small screens the sections move to their own scrollable row. */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-1.5 sm:hidden">
        {links}
        {user ? <NavLink href="/sites/new">{t("createSite")}</NavLink> : null}
      </nav>
    </header>
  );
}
