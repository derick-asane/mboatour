const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/// Appends a short suffix until `isTaken` says the slug is free.
export async function uniqueSlug(
  input: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(input) || "site";
  let candidate = base;

  for (let attempt = 2; await isTaken(candidate); attempt++) {
    candidate = `${base}-${attempt}`;
  }

  return candidate;
}

export function bookingReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let reference = "";

  for (let index = 0; index < 8; index++) {
    reference += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return reference;
}
