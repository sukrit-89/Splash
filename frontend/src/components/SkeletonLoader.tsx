export function SkeletonLoader() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-line bg-surface p-5">
          <div className="h-4 w-24 animate-pulse rounded bg-[#1b1b1b]" />
          <div className="mt-4 h-8 w-44 animate-pulse rounded bg-[#1b1b1b]" />
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="h-12 animate-pulse rounded bg-[#1b1b1b]" />
            <div className="h-12 animate-pulse rounded bg-[#1b1b1b]" />
          </div>
        </div>
      ))}
    </div>
  );
}
