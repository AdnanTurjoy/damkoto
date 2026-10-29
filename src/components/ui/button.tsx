import { Slot } from "./slot";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  accent: "bg-amber-400 text-ink hover:bg-amber-300 shadow-sm",
  outline: "border border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50",
  ghost: "text-ink hover:bg-brand-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  link: "text-brand-700 underline-offset-4 hover:underline px-0",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-[15px] gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
}

export function buttonClasses(variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer",
    "disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant, size, asChild, className, type = "button", ...props }: ButtonProps) {
  if (asChild) return <Slot className={buttonClasses(variant, size, className)} {...props} />;
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
