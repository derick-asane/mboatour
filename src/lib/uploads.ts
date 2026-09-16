import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  IMAGE_EXTENSIONS,
  MAX_GALLERY_IMAGES,
  MAX_IMAGE_BYTES,
} from "@/lib/upload-limits";

/// Server-side half of the upload path: this module touches the filesystem, so
/// it must never be imported from a client component.
///
/// Uploads are written under `public/` so Next serves them as static files.
/// That ties them to the server's own disk: on a read-only or multi-instance
/// host (Vercel and the like) these need to move to object storage instead.

/// Sites, events, chat pictures and guide portraits keep to their own folders.
export type UploadFolder = "sites" | "events" | "chat" | "guides";

const UPLOAD_FOLDERS: readonly UploadFolder[] = [
  "sites",
  "events",
  "chat",
  "guides",
];

function directoryFor(folder: UploadFolder): string {
  return path.join(process.cwd(), "public", "uploads", folder);
}

export function urlPrefixFor(folder: UploadFolder): string {
  return `/uploads/${folder}`;
}

export type SavedImage = { url: string } | { error: string };

/// An untouched file input still submits an entry, with an empty file.
export function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function saveUploadedImage(
  file: File,
  folder: UploadFolder,
): Promise<SavedImage> {
  if (file.size > MAX_IMAGE_BYTES) return { error: "imageTooLarge" };

  const extension = IMAGE_EXTENSIONS[file.type];

  if (!extension) return { error: "imageType" };

  const directory = directoryFor(folder);

  await mkdir(directory, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;

  await writeFile(
    path.join(directory, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return { url: `${urlPrefixFor(folder)}/${filename}` };
}

/// Removes a file this app wrote. Anything outside the upload folders, or with
/// a name we did not generate, is ignored rather than deleted.
export async function deleteUploadedImage(url: string): Promise<void> {
  const folder = UPLOAD_FOLDERS.find((candidate) =>
    url.startsWith(`${urlPrefixFor(candidate)}/`),
  );

  if (!folder) return;

  const filename = path.basename(url);

  if (!/^[0-9a-f-]{36}\.[a-z]{3,4}$/i.test(filename)) return;

  try {
    await unlink(path.join(directoryFor(folder), filename));
  } catch {
    // A missing file is already in the state we wanted.
  }
}

export type UploadedImages =
  | { error: string }
  | { cover: string | null | undefined; gallery: string[] };

/// Writes every picked file to disk. `cover` is `undefined` when the field was
/// left alone, `null` when the existing cover was ticked for removal.
export async function readImageUploads(
  formData: FormData,
  folder: UploadFolder,
): Promise<UploadedImages> {
  const galleryFiles = formData.getAll("images").filter(isUploadedFile);

  if (galleryFiles.length > MAX_GALLERY_IMAGES) {
    return { error: "tooManyImages" };
  }

  const coverFile = formData.get("coverImage");
  let cover: string | null | undefined = undefined;

  if (isUploadedFile(coverFile)) {
    const saved = await saveUploadedImage(coverFile, folder);

    if ("error" in saved) return { error: saved.error };

    cover = saved.url;
  } else if (formData.get("removeCover") === "on") {
    cover = null;
  }

  const gallery: string[] = [];

  for (const file of galleryFiles) {
    const saved = await saveUploadedImage(file, folder);

    if ("error" in saved) return { error: saved.error };

    gallery.push(saved.url);
  }

  return { cover, gallery };
}
