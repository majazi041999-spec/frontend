function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-zinc-800/60 bg-zinc-950/15 p-5">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="text-2xl font-semibold mt-2 tracking-tight text-zinc-50">{value}</div>
      <div className="text-xs text-zinc-500 mt-2">به زودی به API وصل می‌شود</div>
    </div>
  );
}

export function DashboardHome() {
  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="کل تسک‌ها" value="—" />
        <StatCard title="موعد نزدیک" value="—" />
        <StatCard title="انجام‌شده" value="—" />
      </section>

      <div className="mt-6 rounded-3xl border border-zinc-800/60 bg-zinc-950/15 p-6">
        <div className="text-sm text-zinc-200 font-medium mb-2">گام بعدی</div>
        <div className="text-sm text-zinc-400">
          فاز ۲: صفحه تسک‌ها (لیست/ساخت/آپدیت) + تاریخ شمسی + فیلترها
        </div>
      </div>
    </>
  );
}
