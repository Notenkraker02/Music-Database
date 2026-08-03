export function CardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton aspect-square w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="skeleton h-5 w-10" />
          <div className="skeleton h-5 flex-1" />
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-8 w-20 mb-2" />
      <div className="skeleton h-4 w-28" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-10 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
      <CardGridSkeleton />
    </div>
  );
}
