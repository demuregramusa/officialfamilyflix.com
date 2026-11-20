export default function MainLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <div className="h-[46vh] min-h-[340px] w-full animate-pulse bg-white/[0.035]" />
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6 md:px-8 xl:px-12">
        {Array.from({ length: 3 }).map((_, row) => (
          <div key={row} className={row === 0 ? "" : "mt-9"}>
            <div className="h-5 w-44 animate-pulse rounded bg-white/[0.07]" />
            <div className="mt-4 flex gap-3 overflow-hidden">
              {Array.from({ length: 8 }).map((_, card) => (
                <div
                  key={card}
                  className="w-[134px] shrink-0 sm:w-[150px] md:w-[164px] lg:w-[176px] xl:w-[188px]"
                >
                  <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-white/[0.05]" />
                  <div className="mt-3 h-2.5 w-3/4 animate-pulse rounded bg-white/[0.05]" />
                  <div className="mt-2 h-2 w-1/2 animate-pulse rounded bg-white/[0.035]" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <span className="sr-only">Loading titles…</span>
      </div>
    </div>
  );
}
