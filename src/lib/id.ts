import { randomBytes } from "crypto";

/**
 * Generate a unique ID with optional prefix
 * Works in both browser and Node.js environments
 */
export function generateId(prefix?: string): string {
  // Use crypto.getRandomValues for browser compatibility
  const array = new Uint8Array(12);

  if (typeof window !== "undefined" && window.crypto) {
    // Browser environment
    window.crypto.getRandomValues(array);
  } else if (typeof globalThis !== "undefined" && globalThis.crypto) {
    // Node.js 19+ or modern environments
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for older Node.js
    const bytes = randomBytes(12);
    for (let i = 0; i < 12; i++) {
      array[i] = bytes[i];
    }
  }

  // Convert to base64url-safe string manually
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return prefix ? `${prefix}_${base64}` : base64;
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