import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/app/[locale]/login/login-form";
import { BrandMark } from "@/components/brand";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Link } from "@/i18n/navigation";
import {
  authErrorMessageKey,
  isOAuthProviderId,
  OAUTH_PROVIDER_LABELS,
} from "@/lib/oauth";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string; provider?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { next, error, provider } = await searchParams;
  const t = await getTranslations("Auth");
  const errors = await getTranslations("Errors");

  // Auth.js sends failed social sign-ins back here with an `error` code.
  const errorKey = error ? authErrorMessageKey(error) : null;
  const providerLabel =
    provider && isOAuthProviderId(provider)
      ? OAUTH_PROVIDER_LABELS[provider]
      : "";

  return (
    <div className="mx-auto w-full max-w-md space-y-6 py-4 sm:py-8">
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <BrandMark className="h-11 w-11" />
        </div>
        <h1 className="page-title text-2xl">{t("signInTitle")}</h1>
        <p className="lede text-sm">{t("signInSubtitle")}</p>
      </div>

      {errorKey ? (
        <p role="alert" className="alert alert-error">
          {errors.has(errorKey)
            ? errors(errorKey, { provider: providerLabel })
            : errors("oauthFailed")}
        </p>
      ) : null}

      <OAuthButtons from={`/${locale}/login`} next={next} />

      <LoginForm next={next} />

      <p className="text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/register" className="link">
          {t("signUpCta")}
        </Link>
      </p>
    </div>
  );
}
