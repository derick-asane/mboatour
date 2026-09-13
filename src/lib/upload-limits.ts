/// Plain data about accepted uploads. Kept apart from `uploads.ts` so the
/// picker in the browser can read the limits without dragging `node:fs` along.

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_GALLERY_IMAGES = 6;

/// Extension is taken from the declared type, never from the client's filename.
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(IMAGE_EXTENSIONS);
