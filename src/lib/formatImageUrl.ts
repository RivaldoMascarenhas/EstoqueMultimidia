/**
 * Normalizes image URLs, automatically converting Google Drive, Dropbox,
 * and OneDrive share links to direct raw image URLs suitable for <img> tags.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();

  // Handle Google Drive links
  // Patterns:
  // - https://drive.google.com/file/d/FILE_ID/view...
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  // - https://docs.google.com/uc?id=FILE_ID
  if (trimmed.includes("drive.google.com") || trimmed.includes("docs.google.com")) {
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      // Google Drive thumbnail endpoint serves the high-resolution raw image without auth/CORS restrictions
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }

  // Handle Dropbox links
  if (trimmed.includes("dropbox.com")) {
    return trimmed.replace("dl=0", "raw=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }

  return trimmed;
}
