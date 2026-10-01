export default function ShopLoading() {
  return (
    <div className="container-x py-6 md:py-10">
      <div className="h-8 w-64 skeleton mb-2" />
      <div className="h-4 w-96 skeleton mb-6" />
      <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
        <div className="card p-4 space-y-3 hidden lg:block">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-8 w-full" />)}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4" aria-busy="true" aria-label="Loading products">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton h-44 sm:h-52 rounded-none" />
              <div className="p-3.5 space-y-2">
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-2/5" />
                <div className="skeleton h-9 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
