import { getTranslations, setRequestLocale } from "next-intl/server";

import { ResetForm } from "@/app/[locale]/reset/reset-form";
import { BrandMark } from "@/components/brand";
import { Link } from "@/i18n/navigation";
import { resolvePasswordResetToken } from "@/server/password-reset";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { token } = await searchParams;
  const t = await getTranslations("Auth");

  // Checked before the form is drawn, so a dead link says so straight away
  // rather than after the visitor has typed a new password.
  const valid = token ? await resolvePasswordResetToken(token) : null;

  return (
    <div className="mx-auto w-full max-w-md space-y-6 py-4 sm:py-8">
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <BrandMark className="h-11 w-11" />
        </div>
        <h1 className="page-title text-2xl">{t("resetTitle")}</h1>
        <p className="lede text-sm">{t("resetSubtitle")}</p>
      </div>

      {valid && token ? (
        <ResetForm token={token} />
      ) : (
        <div className="card space-y-4 text-center sm:p-6">
          <p className="alert alert-error">{t("resetLinkInvalid")}</p>
          <Link href="/forgot" className="btn-primary w-full">
            {t("forgotCta")}
          </Link>
        </div>
      )}

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="link">
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
