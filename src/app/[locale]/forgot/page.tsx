import { getTranslations, setRequestLocale } from "next-intl/server";

import { ForgotForm } from "@/app/[locale]/forgot/forgot-form";
import { BrandMark } from "@/components/brand";
import { Link } from "@/i18n/navigation";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auth");

  return (
    <div className="mx-auto w-full max-w-md space-y-6 py-4 sm:py-8">
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <BrandMark className="h-11 w-11" />
        </div>
        <h1 className="page-title text-2xl">{t("forgotTitle")}</h1>
        <p className="lede text-sm">{t("forgotSubtitle")}</p>
      </div>

      <ForgotForm />

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="link">
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
