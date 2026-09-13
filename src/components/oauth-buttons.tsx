import { getTranslations } from "next-intl/server";

import { SubmitButton } from "@/components/form";
import {
  OAUTH_PROVIDER_IDS,
  OAUTH_PROVIDER_LABELS,
  type OAuthProviderId,
} from "@/lib/oauth";
import { oauthSignInAction } from "@/server/actions/account";

const ICONS: Record<OAuthProviderId, React.ReactNode> = {
  google: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.59-5.17 3.59-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  ),
  apple: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M16.37 12.76c.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.61-1.7-3.18-1.73-1.35-.14-2.64.79-3.33.79-.69 0-1.75-.77-2.87-.75-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.14.83-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5ZM14.2 6.2c.6-.74 1.01-1.75.9-2.77-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.58-1.22Z"
      />
    </svg>
  ),
  facebook: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z"
      />
    </svg>
  ),
};

/// Social sign-in, shown above the email form on both auth pages. `from` is the
/// path a failed attempt returns to, so the visitor stays where they were.
export async function OAuthButtons({
  from,
  next,
}: {
  from: string;
  next?: string;
}) {
  const t = await getTranslations("Auth");

  return (
    <div className="space-y-4">
      {/* One row of three: the marks carry the meaning, the name confirms it. */}
      <div className="grid grid-cols-3 gap-2">
        {OAUTH_PROVIDER_IDS.map((provider) => (
          <form key={provider} action={oauthSignInAction}>
            <input type="hidden" name="provider" value={provider} />
            <input type="hidden" name="from" value={from} />
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <SubmitButton
              className="btn-secondary btn-sm w-full gap-1.5 px-2 text-xs"
              ariaLabel={t("continueWith", {
                provider: OAUTH_PROVIDER_LABELS[provider],
              })}
            >
              {ICONS[provider]}
              <span className="min-w-0 truncate">
                {OAUTH_PROVIDER_LABELS[provider]}
              </span>
            </SubmitButton>
          </form>
        ))}
      </div>

      <p className="divider-label">{t("orUseEmail")}</p>
    </div>
  );
}
