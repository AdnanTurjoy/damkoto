"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { translateLoose } from "@/lib/i18n/core";
import { setRoleAction } from "../actions";

export function RoleSelect({ userId, role, disabled }: { userId: string; role: "user" | "moderator" | "admin"; disabled: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Select
      aria-label={t("admin.settings.role")}
      defaultValue={role}
      disabled={disabled || pending}
      className="h-9 w-40"
      onChange={(e) =>
        startTransition(async () => {
          const result = await setRoleAction(userId, e.target.value as typeof role);
          if (!result.ok) toast(translateLoose(t, result.error), "error");
          else toast(t("admin.done"));
          router.refresh();
        })
      }
    >
      {(["user", "moderator", "admin"] as const).map((r) => <option key={r} value={r}>{t(`admin.settings.roleNames.${r}`)}</option>)}
    </Select>
  );
}
