import { NavLink } from "react-router-dom";
import { LayoutGrid, ListTodo, Users } from "lucide-react";

const itemBase =
  "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition border border-transparent";
const itemActive =
  "bg-zinc-950/40 border-zinc-800 text-zinc-50 shadow-[0_10px_30px_rgba(0,0,0,0.25)]";
const itemIdle = "text-zinc-300 hover:bg-zinc-950/25 hover:border-zinc-800/70";

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[280px] shrink-0 flex-col gap-4 p-4">
      <div className="rounded-3xl border border-zinc-800/70 bg-zinc-950/25 backdrop-blur-xl p-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,.6)]" />
          <div className="text-zinc-50 font-semibold">Taskchi</div>
        </div>
        <div className="mt-1 text-xs text-zinc-400">سیستم مدیریت تسک</div>
      </div>

      <nav className="rounded-3xl border border-zinc-800/70 bg-zinc-950/25 backdrop-blur-xl p-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${itemBase} ${isActive ? itemActive : itemIdle}`
          }
        >
          <LayoutGrid size={18} />
          خانه
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `${itemBase} ${isActive ? itemActive : itemIdle}`
          }
        >
          <ListTodo size={18} />
          تسک‌ها
        </NavLink>

        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            `${itemBase} ${isActive ? itemActive : itemIdle}`
          }
        >
          <Users size={18} />
          کاربران
        </NavLink>
      </nav>

      <div className="mt-auto rounded-3xl border border-zinc-800/70 bg-zinc-950/25 backdrop-blur-xl p-4 text-xs text-zinc-400">
        نسخه آزمایشی • فقط محیط داخلی شرکت
      </div>
    </aside>
  );
}
