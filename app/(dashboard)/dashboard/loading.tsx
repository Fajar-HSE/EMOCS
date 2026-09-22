export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 animate-pulse space-y-6 p-8">
      <section className="flex flex-col justify-between gap-6 lg:flex-row">
        <div className="flex-1 space-y-2">
          <div className="h-7 w-64 rounded-lg bg-slate-200" />
          <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
        </div>
        <div className="h-[106px] w-full rounded-2xl bg-slate-200 lg:w-[460px]" />
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] rounded-2xl border border-slate-200/70 bg-white p-5">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-7 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-[260px] rounded-2xl border border-slate-200/70 bg-white p-5 lg:col-span-4" />
        <div className="h-[260px] rounded-2xl border border-slate-200/70 bg-white p-5 lg:col-span-5" />
        <div className="h-[260px] rounded-2xl border border-slate-200/70 bg-white p-5 lg:col-span-3" />
      </section>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-[320px] rounded-2xl border border-slate-200/70 bg-white p-6 lg:col-span-9" />
        <div className="h-[320px] rounded-2xl border border-slate-200/70 bg-white p-5 lg:col-span-3" />
      </section>
    </main>
  )
}
