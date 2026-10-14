const benefits = [
  'Discover unique pre-loved finds',
  'Save your favorites in one place',
  'Create your own marketplace shop',
];

export default function AuthIntro() {
  return (
    <aside className="relative overflow-hidden bg-[var(--market-ink)] p-6 text-white sm:p-10 lg:flex lg:flex-col lg:justify-between">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Your next great find</p>
        <h2 className="mt-4 max-w-sm text-3xl font-semibold leading-tight sm:text-4xl">Good pieces.<br />New beginnings.</h2>
        <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">Find something you love or give your pre-loved pieces a new home.</p>
      </div>
      <div className="relative mt-10 hidden space-y-4 lg:block">
        {benefits.map((text) => (
          <div key={text} className="flex items-center gap-3 text-sm text-white/90">
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {text}
          </div>
        ))}
        <p className="pt-5 text-xs text-white/60">A little less new. A lot more you.</p>
      </div>
    </aside>
  );
}
