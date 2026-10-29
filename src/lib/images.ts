export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MIN_IMAGE_SIDE = 200;
export const MAX_IMAGE_SIDE = 8000;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Detects the real image type from magic bytes (never trusts the file name or MIME header). */
export function sniffImageType(bytes: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Inserts a Cloudinary delivery transformation into an upload URL, e.g.
 * …/image/upload/v1/x.jpg → …/image/upload/f_auto,q_auto,c_limit,w_640/v1/x.jpg
 */
export function cloudinaryUrl(url: string, width: number): string {
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  return `${url.slice(0, i + marker.length)}f_auto,q_auto,c_limit,w_${width}/${url.slice(i + marker.length)}`;
}

export function cloudinarySrcSet(url: string, widths: number[] = [320, 640, 960]): string {
  return widths.map((w) => `${cloudinaryUrl(url, w)} ${w}w`).join(", ");
}
