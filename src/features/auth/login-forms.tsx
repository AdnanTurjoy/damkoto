"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { translateLoose } from "@/lib/i18n/core";
import { magicLinkAction, signInAction, type AuthState } from "./actions";

export function LoginForms({ next }: { next: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, {});
  const [magic, magicAction, magicPending] = useActionState<AuthState, FormData>(magicLinkAction, {});
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field id="email" label={t("auth.email")}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field id="password" label={t("auth.password")}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        {state.error && <p role="alert" className="text-sm font-medium text-red-700">{translateLoose(t, state.error)}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
      </form>
      <form action={magicAction} className="space-y-3 border-t border-line pt-5">
        <input type="hidden" name="next" value={next} />
        <Field id="magic-email" label={t("auth.email")}>
          <Input id="magic-email" name="email" type="email" autoComplete="email" required />
        </Field>
        {magic.error && <p role="alert" className="text-sm font-medium text-red-700">{translateLoose(t, magic.error)}</p>}
        {magic.message && <p role="status" className="text-sm font-medium text-brand-700">{translateLoose(t, magic.message)}</p>}
        <Button type="submit" variant="outline" className="w-full" disabled={magicPending}>
          {t("auth.magicLink")}
        </Button>
      </form>
    </div>
  );
}
