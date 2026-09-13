import { getTranslations } from "next-intl/server";

import { MapView } from "@/components/map/map-view";
import { Link } from "@/i18n/navigation";

/// A still preview on the site page. Routing and the large map live on their
/// own screen, so this card stays a glance rather than a workspace.
export async function SiteLocationCard({
  slug,
  latitude,
  longitude,
  address,
}: {
  slug: string;
  latitude: number;
  longitude: number;
  address: string | null;
}) {
  const t = await getTranslations("Map");

  return (
    <section className="card card-flush overflow-hidden">
      <Link href={`/sites/${slug}/map`} className="block" aria-label={t("openMap")}>
        <MapView
          latitude={latitude}
          longitude={longitude}
          className="h-48 w-full"
          interactive={false}
        />
      </Link>

      <div className="space-y-3 p-4">
        <div>
          <h2 className="section-title text-base">{t("title")}</h2>
          {address ? <p className="hint">{address}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/sites/${slug}/map?route=1`}
            className="btn-primary btn-sm"
          >
            {t("directions")}
          </Link>
          <Link href={`/sites/${slug}/map`} className="btn-secondary btn-sm">
            {t("openMap")}
          </Link>
        </div>
      </div>
    </section>
  );
}
