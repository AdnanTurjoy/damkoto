import { Carrot, Droplet, Egg, Fish, Flame, Package, Shirt, Smartphone, Sofa, Wheat, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  carrot: Carrot,
  wheat: Wheat,
  droplet: Droplet,
  fish: Fish,
  egg: Egg,
  flame: Flame,
  shirt: Shirt,
  smartphone: Smartphone,
  sofa: Sofa,
  package: Package,
};

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Package;
  return <Icon className={className} aria-hidden />;
}
