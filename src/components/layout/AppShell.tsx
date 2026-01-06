import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, LayoutDashboard, ListChecks, Users } from "lucide-react";
import { useAuth } from "@/features/auth/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

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
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[300px_1fr] p-4 gap-4">
        {/* Sidebar */}
        <aside className="hidden lg:block surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_30px_rgba(16,185,129,.45)]" />
              <div>
                <div className="text-xl font-semibold tracking-tight text-foreground">Taskchi</div>
                <div className="text-xs text-muted-foreground mt-1">Team Workspace</div>
              </div>
            </div>

            <Badge
              variant="outline"
              className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground"
            >
              v0.1
            </Badge>
          </div>

          <Separator className="my-4 bg-border/60" />

          <nav className="space-y-2 text-sm">
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="داشبورد" end />
            <NavItem to="/tasks" icon={<ListChecks size={18} />} label="تسک‌ها" />
            <NavItem to="/admin/users" icon={<Users size={18} />} label="کاربران" />
          </nav>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/30 p-3">
            <div className="text-xs text-muted-foreground mb-2">حساب کاربری</div>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-background/50 border border-border/60 text-foreground">
                  {user?.email?.slice(0, 1)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-foreground">{user?.email}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.roles?.includes("ROLE_ADMIN") ? "Admin" : "Staff"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground/90">
            نسخه آزمایشی • محیط داخلی
          </div>
        </aside>

        {/* Main */}
        <main className="surface p-6 min-w-0">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="text-lg font-semibold text-foreground">{pageTitle}</div>
              <div className="text-sm text-muted-foreground mt-1">
                خوش آمدی{user?.email ? `، ${user.email}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <NotificationCenter />

              <Button
                type="button"
                onClick={() => logout()}
                variant="outline"
                className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
              >
                <LogOut size={18} className="ml-2" />
                خروج
              </Button>
            </div>
          </header>

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
        cn(
          "group flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition",
          isActive
            ? "bg-primary/10 border-primary/25 text-foreground shadow-sm"
            : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:border-border/60"
        )
      }
    >
      <div className="transition opacity-80 group-hover:opacity-100">{icon}</div>
      <div className="font-medium">{label}</div>
    </NavLink>
  );
}
