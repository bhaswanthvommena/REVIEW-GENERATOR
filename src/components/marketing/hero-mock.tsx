export function HeroMock() {
  return (
    <div className="flex items-center justify-center gap-6">
      <div className="hidden w-40 shrink-0 rounded-2xl border border-border bg-card p-4 shadow-card xl:block">
        <div className="grid grid-cols-5 gap-1" aria-hidden="true">
          {Array.from({ length: 25 }, (_, index) => (
            <span
              key={index}
              className={
                [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24].includes(index)
                  ? "aspect-square rounded-[2px] bg-foreground"
                  : "aspect-square rounded-[2px] bg-muted"
              }
            />
          ))}
        </div>
        <p className="mt-3 text-center text-xs font-medium">Scan to review</p>
      </div>
      <div className="w-full max-w-sm rounded-[2rem] border border-border bg-card p-3 shadow-pop">
        <div className="rounded-[1.5rem] border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
              C
            </span>
            <div>
              <p className="text-sm font-semibold">Cafe Luna</p>
              <p className="text-xs text-muted-foreground">How was your visit?</p>
            </div>
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium">Service</p>
            <p className="mt-1 text-2xl tracking-widest text-brand" aria-hidden="true">
              ★★★★<span className="text-muted-foreground/40">★</span>
            </p>
          </div>
          <p className="mt-4 rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-muted-foreground">
            I stopped in for lunch and the service was quick and friendly. I would come back.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex min-h-11 items-center justify-center rounded-xl bg-brand text-sm font-medium text-brand-foreground">
              Copy review
            </div>
            <div className="flex min-h-11 items-center justify-center rounded-xl bg-brand-50 text-sm font-medium text-brand-800">
              Continue to Google
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
