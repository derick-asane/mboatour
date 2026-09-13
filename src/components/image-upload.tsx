"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_GALLERY_IMAGES,
  MAX_IMAGE_BYTES,
} from "@/lib/upload-limits";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

/// Object URLs for the files just picked, revoked whenever they are replaced.
function usePreviews(files: File[]): string[] {
  const urls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(
    () => () => {
      for (const url of urls) URL.revokeObjectURL(url);
    },
    [urls],
  );

  return urls;
}

function oversized(files: File[]): boolean {
  return files.some((file) => file.size > MAX_IMAGE_BYTES);
}

/// A single replaceable cover image.
export function CoverImageField({
  currentUrl,
}: {
  currentUrl: string | null;
}) {
  const t = useTranslations("Photos");
  const errors = useTranslations("Errors");
  const [picked, setPicked] = useState<File[]>([]);
  const [previewUrl] = usePreviews(picked);

  const shown = previewUrl ?? currentUrl;

  return (
    <div className="space-y-3">
      <span className="label">{t("coverImage")}</span>

      <div className="flex flex-wrap items-start gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className="media-placeholder h-24 w-40 shrink-0 rounded-lg border border-line object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="media-placeholder h-24 w-40 shrink-0 rounded-lg border border-dashed border-line-strong"
          />
        )}

        <div className="min-w-48 flex-1 space-y-2">
          <input
            className="input"
            type="file"
            name="coverImage"
            accept={ACCEPT}
            onChange={(event) =>
              setPicked(Array.from(event.target.files ?? []))
            }
          />
          <p className="hint">{t("coverImageHint")}</p>

          {oversized(picked) ? (
            <p role="alert" className="alert alert-error">
              {errors("imageTooLarge")}
            </p>
          ) : null}

          {currentUrl && picked.length === 0 ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeCover" />
              {t("removeCover")}
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/// The site's photo gallery: existing shots with a remove tick, plus new picks.
export function GalleryField({
  images,
}: {
  images: { id: string; url: string }[];
}) {
  const t = useTranslations("Photos");
  const errors = useTranslations("Errors");
  const [picked, setPicked] = useState<File[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const previews = usePreviews(picked);

  const keptCount = images.length - removed.length;
  const tooMany = keptCount + picked.length > MAX_GALLERY_IMAGES;

  return (
    <div className="space-y-3">
      <span className="label">{t("images")}</span>

      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => {
            const isRemoved = removed.includes(image.id);

            return (
              <li key={image.id}>
                <label className="block cursor-pointer space-y-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt=""
                    className={`media-placeholder h-24 w-full rounded-lg border border-line object-cover transition ${
                      isRemoved ? "opacity-40 grayscale" : ""
                    }`}
                  />
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      name="removeImageIds"
                      value={image.id}
                      checked={isRemoved}
                      onChange={(event) =>
                        setRemoved((current) =>
                          event.target.checked
                            ? [...current, image.id]
                            : current.filter((id) => id !== image.id),
                        )
                      }
                    />
                    {t("removeImage")}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}

      {previews.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map((url, index) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="media-placeholder h-24 w-full rounded-lg border border-accent-border object-cover"
              />
              <span className="mt-1.5 block truncate text-xs text-muted">
                {picked[index]?.name}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        className="input"
        type="file"
        name="images"
        accept={ACCEPT}
        multiple
        onChange={(event) => setPicked(Array.from(event.target.files ?? []))}
      />
      <p className="hint">{t("imagesHint", { max: MAX_GALLERY_IMAGES })}</p>

      {tooMany ? (
        <p role="alert" className="alert alert-error">
          {errors("tooManyImages", { max: MAX_GALLERY_IMAGES })}
        </p>
      ) : null}

      {oversized(picked) ? (
        <p role="alert" className="alert alert-error">
          {errors("imageTooLarge")}
        </p>
      ) : null}
    </div>
  );
}
