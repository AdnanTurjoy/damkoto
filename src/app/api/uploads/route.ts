import { createHash } from "node:crypto";
import { imageSize } from "image-size";
import { env, features } from "@/config/env";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { getClientHash } from "@/lib/identity";
import { MAX_IMAGE_BYTES, MAX_IMAGE_SIDE, MIN_IMAGE_SIDE, sniffImageType } from "@/lib/images";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/uploads — validates an optional product photo on the server
 * (real type, size, dimensions) and forwards it to Cloudinary with a
 * server-side signature. The API secret never reaches the browser.
 */
export async function POST(request: Request) {
  return handle(async () => {
    if (!features.imageUploads) throw new AppError("submit.imagesDisabled", 503);
    assertSameOrigin(request);

    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_IMAGE_BYTES + 64 * 1024) throw new AppError("errors.imageSize", 413);

    const clientHash = await getClientHash({ create: true });
    if (!(await consumeRateLimit(await getDb(), `upload:c:${clientHash}`, RATE_LIMITS.uploadPerClient))) {
      throw new AppError("errors.rateLimited", 429);
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new AppError("errors.imageType", 422);
    if (file.size > MAX_IMAGE_BYTES) throw new AppError("errors.imageSize", 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) throw new AppError("errors.imageType", 422);

    let dimensions: { width?: number; height?: number };
    try {
      dimensions = imageSize(bytes);
    } catch {
      throw new AppError("errors.imageType", 422);
    }
    const { width = 0, height = 0 } = dimensions;
    if (width < MIN_IMAGE_SIDE || height < MIN_IMAGE_SIDE || width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
      throw new AppError("errors.imageDimensions", 422);
    }

    const { cloudName, apiKey, apiSecret, folder } = env.cloudinary;
    const timestamp = Math.floor(Date.now() / 1000);
    const signed = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash("sha1").update(signed + apiSecret).digest("hex");

    const upload = new FormData();
    upload.set("file", new Blob([bytes], { type }));
    upload.set("api_key", apiKey!);
    upload.set("timestamp", String(timestamp));
    upload.set("folder", folder);
    upload.set("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: upload });
    if (!response.ok) {
      console.error("Cloudinary upload failed", response.status);
      throw new AppError("errors.imageFailed", 502);
    }
    const result = (await response.json()) as { secure_url: string; width: number; height: number };
    return ok({ url: result.secure_url, width: result.width, height: result.height });
  });
}
