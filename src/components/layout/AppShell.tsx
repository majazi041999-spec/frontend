import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, LogOut, LayoutDashboard, ListChecks, Users } from "lucide-react";
import { useAuth } from "@/features/auth/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function AppShell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const pageTitle =
    pathname === "/"
      ? "داشبورد"
      : pathname.startsWith("/tasks")
      ? "تسک‌ها"
      : pathname.startsWith("/admin/users")
      ? "کاربران"
      : "پنل";

  return (
    <div className="app-bg min-h-screen w-full">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[280px_1fr] p-4 gap-4">
        {/* Sidebar */}
        <aside className="hidden lg:block rounded-3xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold tracking-tight text-zinc-50">Taskchi</div>
              <div className="text-xs text-zinc-400 mt-1">Team Workspace</div>
            </div>
            <Badge className="bg-zinc-950/40 border border-zinc-800 text-zinc-200 rounded-xl">
              v0.1
            </Badge>
          </div>

          <Separator className="my-4 bg-zinc-800/60" />

          <nav className="space-y-2 text-sm">
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="داشبورد" end />
            <NavItem to="/tasks" icon={<ListChecks size={18} />} label="تسک‌ها" />
            <NavItem to="/admin/users" icon={<Users size={18} />} label="کاربران" />
          </nav>

          <div className="mt-6 rounded-2xl border border-zinc-800/60 bg-zinc-950/20 p-3">
            <div className="text-xs text-zinc-400 mb-2">حساب کاربری</div>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-zinc-950/50 border border-zinc-800 text-zinc-200">
                  {user?.email?.slice(0, 1)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-zinc-50">{user?.email}</div>
                <div className="text-xs text-zinc-400 truncate">
                  {user?.roles?.includes("ROLE_ADMIN") ? "Admin" : "Staff"}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="rounded-3xl border border-zinc-800/60 bg-zinc-900/25 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] p-6 min-w-0">
          <header className="flex items-center justify-between mb-6">
            <div>
              <div className="text-lg font-semibold text-zinc-50">{pageTitle}</div>
              <div className="text-sm text-zinc-400 mt-1">
                خوش آمدی{user?.email ? `، ${user.email}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/35 text-zinc-200"
              >
                <Bell size={18} className="ml-2" />
                اعلان‌ها
              </Button>

              <Button
                type="button"
                onClick={() => logout()}
                variant="outline"
                className="rounded-2xl border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/35 text-zinc-200"
              >
                <LogOut size={18} className="ml-2" />
                خروج
              </Button>
            </div>
          </header>

          {/* 👇 اینجا محتوای صفحات رندر میشه */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition",
          isActive
            ? "bg-zinc-950/30 border-zinc-800 text-zinc-50 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
            : "bg-transparent border-transparent text-zinc-300 hover:bg-zinc-950/20 hover:border-zinc-800/60",
        ].join(" ")
      }
    >
      <div className="text-zinc-300">{icon}</div>
      <div className="font-medium">{label}</div>
    </NavLink>
  );
}
