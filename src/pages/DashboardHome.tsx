function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/50 backdrop-blur p-5 shadow-sm">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold mt-2 tracking-tight text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-2">به زودی به API وصل می‌شود</div>
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

      <div className="mt-6 rounded-3xl border border-border/60 bg-card/50 backdrop-blur p-6 shadow-sm">
        <div className="text-sm text-foreground font-medium mb-2">گام بعدی</div>
        <div className="text-sm text-muted-foreground">
          فاز ۲: صفحه تسک‌ها (لیست/ساخت/آپدیت) + تاریخ شمسی + فیلترها
        </div>
      </div>
    </>
  );
}
