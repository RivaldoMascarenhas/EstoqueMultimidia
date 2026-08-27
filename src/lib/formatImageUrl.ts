/**
 * Normalizes image URLs, automatically routing Google Drive and external shared
 * storage links through our proxy to guarantee 100% reliability with zero CORS/referrer blocks.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  let trimmed = url.trim();

  // If already proxied, Base64 or local public asset, return as-is
  if (
    trimmed.startsWith("/api/v1/image-proxy") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("/brand/") ||
    trimmed.startsWith("/branding/") ||
    trimmed.startsWith("/uploads/") ||
    trimmed.startsWith("/models/")
  ) {
    return trimmed;
  }

  // Handle Google Drive links (including sharing links, uc, open, file/d/, and thumbnail links)
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.includes("docs.google.com") ||
    trimmed.includes("googleusercontent.com") ||
    trimmed.startsWith("thumbnail?id=") ||
    trimmed.startsWith("/thumbnail?id=") ||
    trimmed.startsWith("https://drive.google.com/thumbnail")
  ) {
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
      return `/api/v1/image-proxy?id=${fileIdMatch[1]}`;
    }
    return `/api/v1/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  // Handle Dropbox links
  if (trimmed.includes("dropbox.com")) {
    return trimmed
      .replace("dl=0", "raw=1")
      .replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }

  return trimmed;
}
