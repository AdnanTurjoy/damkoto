import { CategoryIcon } from "@/components/category-icon";
import { cloudinarySrcSet, cloudinaryUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/** Optimised Cloudinary image, or an illustrated placeholder when no photo exists. */
export function ReportImage({
  url,
  alt,
  icon,
  className,
  sizes = "(min-width: 768px) 320px, 100vw",
}: {
  url: string | null;
  alt: string;
  icon: string;
  className?: string;
  sizes?: string;
}) {
  if (!url) {
    return (
      <div aria-hidden className={cn("relative grid place-items-center overflow-hidden bg-gradient-to-br from-brand-50 to-amber-50 text-brand-300", className)}>
        <CategoryIcon name={icon} className="size-1/3 max-h-16 max-w-16" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary handles resizing/format; next/image optimisation would duplicate it.
    <img src={cloudinaryUrl(url, 640)} srcSet={cloudinarySrcSet(url)} sizes={sizes} alt={alt} loading="lazy" decoding="async" className={cn("object-cover", className)} />
  );
}
