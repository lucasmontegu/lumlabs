import { randomBytes } from "crypto";

export function generateId(prefix?: string): string {
  const id = randomBytes(12).toString("base64url");
  return prefix ? `${prefix}_${id}` : id;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function branchNameFromTitle(title: string): string {
  const slug = slugify(title);
  return `feature/${slug}`;
}
