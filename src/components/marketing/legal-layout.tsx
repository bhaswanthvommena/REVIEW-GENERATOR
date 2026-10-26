import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export function LegalLayout({
  title,
  lede,
  sections,
  children,
}: {
  title: string;
  lede: string;
  sections: Array<{ id: string; label: string }>;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-5 py-12 md:grid-cols-[13rem_minmax(0,1fr)] md:py-16">
        <nav aria-label="On this page" className="md:sticky md:top-24 md:self-start">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            On this page
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-muted-foreground hover:text-foreground">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article>
          <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-4 text-base text-muted-foreground">{lede}</p>
          <div className="mt-10 space-y-10 text-sm leading-7 text-foreground/90">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
