import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4">
      <div className="text-zinc-50 font-semibold">پنل</div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="rounded-2xl border-zinc-800 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-950/35"
        >
          <Bell size={18} />
          <span className="mr-2 text-sm">اعلان‌ها</span>
        </Button>

        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/20 px-3 py-2 text-sm text-zinc-200">
          Admin
        </div>
      </div>
    </header>
  );
}
