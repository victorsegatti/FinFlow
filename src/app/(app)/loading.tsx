export default function Loading() {
  return (
    <div className="ff-enter" style={{ padding: '8px 0 140px' }}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-1 pb-5">
        <div>
          <div className="h-7 w-40 rounded shimmer mb-2" />
          <div className="h-3 w-32 rounded shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-full shimmer" />
          <div className="w-10 h-10 rounded-full shimmer" />
        </div>
      </div>

      {/* Hero card skeleton */}
      <div className="rounded-xl p-5 shimmer" style={{ height: 240 }} />

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 gap-2.5 mt-3.5">
        <div className="rounded-lg shimmer" style={{ height: 110 }} />
        <div className="rounded-lg shimmer" style={{ height: 110 }} />
      </div>

      {/* Section skeletons */}
      <div className="mt-6 space-y-2">
        <div className="h-3 w-24 rounded shimmer mb-3" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-md shimmer" style={{ height: 64, animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </div>
  );
}
