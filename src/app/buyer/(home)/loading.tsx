export default function BuyerLoading() {
  return (
    <section aria-busy="true" aria-label="Loading buyer workspace" className="space-y-7">
      <span role="status" className="sr-only">
        Opening the buyer workspace…
      </span>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-3 w-36 rounded bg-line" />
        <div className="h-7 w-60 max-w-full rounded bg-line" />
        <div className="h-3 w-80 max-w-full rounded bg-line" />
      </div>
      <div
        aria-hidden="true"
        className="divide-y divide-line overflow-hidden rounded-md border border-line"
      >
        <div className="h-10 bg-paper" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex h-20 items-center gap-6 px-5">
            <div className="h-3 w-48 max-w-[45%] rounded bg-line" />
            <div className="ml-auto h-5 w-20 rounded bg-line" />
          </div>
        ))}
      </div>
    </section>
  );
}
