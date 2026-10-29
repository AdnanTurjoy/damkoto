import type { Metadata } from "next";
import { Container } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { env, features } from "@/config/env";
import { devSignInAction, signOutAction } from "@/features/auth/actions";
import { LoginForms } from "@/features/auth/login-forms";
import { getViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.title"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { t } = await getI18n();
  const nextParam = (await searchParams).next;
  const next = typeof nextParam === "string" && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin";
  const viewer = await getViewer();

  return (
    <Container className="max-w-md py-12">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{t("auth.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("auth.subtitle")}</p>
        <div className="mt-6">
          {viewer ? (
            <form action={signOutAction} className="space-y-3">
              <p>{t("auth.signedInAs", { name: viewer.displayName ?? viewer.id.slice(0, 8) })}</p>
              <Button type="submit" variant="outline">{t("nav.logout")}</Button>
            </form>
          ) : features.supabaseAuth ? (
            <LoginForms next={next} />
          ) : (
            <p className="rounded-xl bg-paper-deep px-4 py-3 text-sm text-muted">{t("auth.notConfigured")}</p>
          )}
        </div>
        {env.devAuthEnabled && !viewer && (
          <div className="mt-8 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
            <h2 className="font-bold">{t("auth.devTitle")}</h2>
            <p className="text-sm text-amber-700">{t("auth.devHint")}</p>
            <div className="mt-3 flex gap-2">
              {(["moderator", "admin"] as const).map((role) => (
                <form key={role} action={devSignInAction}>
                  <input type="hidden" name="role" value={role} />
                  <input type="hidden" name="next" value={next} />
                  <Button type="submit" size="sm" variant="outline">{t("auth.devAs", { role })}</Button>
                </form>
              ))}
            </div>
          </div>
        )}
      </Card>
    </Container>
  );
}
