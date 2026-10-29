import { Compass } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/states";
import { buttonClasses } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        icon={<Compass />}
        title={t("errors.notFoundTitle")}
        text={t("errors.notFoundText")}
        action={
          <Link href="/" className={buttonClasses("primary")}>
            {t("errors.goHome")}
          </Link>
        }
      />
    </div>
  );
}
