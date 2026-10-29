import { Container } from "@/components/states";
import type { StaticPageContent } from "@/messages/pages";

export function StaticPage({ content, children }: { content: StaticPageContent; children?: React.ReactNode }) {
  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{content.title}</h1>
      <p className="mt-4 text-lg text-muted">{content.intro}</p>
      <div className="mt-10 space-y-9">
        {content.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-bold">{s.heading}</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed md:text-base">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      {children}
    </Container>
  );
}
