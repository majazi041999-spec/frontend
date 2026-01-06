import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Plus, Search, Loader2, MessageCircle, Trash2, RefreshCcw } from "lucide-react";

import { apiFetch } from "@/lib/api";
import dayjs from "@/lib/day";
import { cn } from "@/lib/utils";

import { TaskDialog, type TaskDto, type TaskPriority, type UserMini } from "@/components/tasks/TaskDialog";
import { StatusPills, type TaskStatus } from "@/components/tasks/StatusPills";
import { useAuth } from "@/features/auth/auth";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

function statusBadgeClass(s: TaskStatus) {
  switch (s) {
    case "TODO":
      return "border-zinc-500/25 bg-zinc-500/10";
    case "DOING":
      return "border-sky-500/25 bg-sky-500/10";
    case "DONE":
      return "border-emerald-500/25 bg-emerald-500/10";
  }
}

function priorityBadge(p?: TaskPriority | null) {
  switch (p) {
    case "HIGH":
      return { label: "HIGH", cls: "border-rose-500/25 bg-rose-500/10" };
    case "LOW":
      return { label: "LOW", cls: "border-zinc-500/25 bg-zinc-500/10" };
    default:
      return { label: "MEDIUM", cls: "border-amber-500/25 bg-amber-500/10" };
  }
}

export function TasksPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.includes("ROLE_ADMIN");

  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [users, setUsers] = useState<UserMini[]>([]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogInitial, setDialogInitial] = useState<Partial<TaskDto> | undefined>(undefined);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState<string | undefined>(undefined);
  const [confirmAction, setConfirmAction] = useState<(() => void | Promise<void>) | null>(null);

  const askConfirm = (title: string, desc: string | undefined, action: () => void | Promise<void>) => {
    setConfirmTitle(title);
    setConfirmDesc(desc);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const loadTasks = async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await apiFetch<TaskDto[]>("/api/tasks", { method: "GET" });
      setTasks(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.message || "خطا در دریافت تسک‌ها");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      if (isAdmin) {
        const list = await apiFetch<any[]>("/api/admin/users", { method: "GET" });
        const active = (Array.isArray(list) ? list : []).filter((u) => u.active !== false);
        setUsers(active.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, active: u.active })));
      } else {
        const list = await apiFetch<UserMini[]>("/api/users/assignable", { method: "GET" });
        setUsers(Array.isArray(list) ? list : []);
      }
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    void loadTasks();
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // deep-link from notifications: /tasks?taskId=123
  useEffect(() => {
    const tid = searchParams.get("taskId");
    if (!tid) return;
    const idNum = Number(tid);
    if (!Number.isFinite(idNum)) return;

    const t = tasks.find((x) => x.id === idNum);
    if (!t) return;

    setDialogMode("edit");
    setDialogInitial(t);
    setDialogOpen(true);

    // clean query param to avoid reopening
    const next = new URLSearchParams(searchParams);
    next.delete("taskId");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return tasks
        .filter((t) => (statusFilter === "ALL" ? true : t.status === statusFilter))
        .filter((t) => {
          if (!qq) return true;
          const a = `${t.title} ${t.assignedToName || ""} ${t.createdByName || ""}`.toLowerCase();
          return a.includes(qq);
        })
        .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  }, [tasks, q, statusFilter]);

  const openCreate = () => {
    setDialogMode("create");
    setDialogInitial({
      status: "TODO",
      priority: "MEDIUM",
      date: dayjs().format("YYYY-MM-DD"),
    });
    setDialogOpen(true);
  };

  const openEdit = (t: TaskDto) => {
    setDialogMode("edit");
    setDialogInitial(t);
    setDialogOpen(true);
  };

  const upsert = (saved: TaskDto) => {
    setTasks((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const copy = [...prev];
      copy[idx] = saved;
      return copy;
    });
  };

  const remove = (id: number) => {
    setTasks((prev) => prev.filter((x) => x.id !== id));
  };

  const quickSetStatus = async (t: TaskDto, next: TaskStatus) => {
    try {
      const saved = await apiFetch<TaskDto>(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      upsert(saved);
    } catch {
      // ignore
    }
  };

  const quickDelete = async (t: TaskDto) => {
    try {
      await apiFetch<void>(`/api/tasks/${t.id}`, { method: "DELETE" });
      remove(t.id);
    } catch {
      // ignore
    }
  };

  return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-right">
            <div className="text-xl font-semibold">تسک‌ها</div>
            <div className="text-sm text-muted-foreground">مدیریت و پیگیری تسک‌های روزانه</div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
                variant="outline"
                onClick={() => void loadTasks()}
                className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
            >
              <RefreshCcw className="h-4 w-4 ml-2" />
              رفرش
            </Button>

            <Button onClick={openCreate} className="rounded-2xl">
              <Plus className="h-4 w-4 ml-2" />
              تسک جدید
            </Button>
          </div>
        </div>

        <Card className="glass">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-right">لیست تسک‌ها</CardTitle>

              <div className="flex flex-col sm:flex-row gap-2 items-center justify-end">
                <div className="relative w-full sm:w-[320px]">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…" className="pl-10 rounded-2xl" />
                </div>

                <div className="flex justify-end">
                  <div className={cn("inline-flex items-center gap-2", "")}>
                    <span className="text-xs text-muted-foreground">فیلتر وضعیت:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm"
                    >
                      <option value="ALL">همه</option>
                      <option value="TODO">در انتظار</option>
                      <option value="DOING">در حال انجام</option>
                      <option value="DONE">انجام‌شده</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-4">
            {err ? (
                <div className="mb-3 text-sm text-rose-600 dark:text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-3 py-2 text-right">
                  {err}
                </div>
            ) : null}

            {loading ? (
                <div className="text-sm text-muted-foreground py-10 text-center inline-flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال دریافت…
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center">تسکی پیدا نشد.</div>
            ) : (
                <div className="space-y-2">
                  {filtered.map((t) => {
                    const meId = user?.id ?? null;
                    const canDelete = isAdmin || (meId != null && t.createdById === meId);
                    const pr = priorityBadge(t.priority);

                    return (
                        <div key={t.id} className="rounded-2xl border bg-background/40 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 text-right">
                              <div className="text-sm font-semibold truncate cursor-pointer" onClick={() => openEdit(t)}>
                                {t.title}
                              </div>

                              <div className="text-xs text-muted-foreground mt-1">
                                {dayjs(t.date).calendar("jalali").locale("fa").format("YYYY/MM/DD")}
                                {t.assignedToName ? ` • مسئول: ${t.assignedToName}` : ""}
                                {t.createdByName ? ` • ارجاع‌دهنده: ${t.createdByName}` : ""}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2 justify-end">
                                <Badge variant="outline" className={cn("rounded-xl bg-background/40 backdrop-blur", statusBadgeClass(t.status))}>
                                  {t.status}
                                </Badge>

                                <Badge variant="outline" className={cn("rounded-xl bg-background/40 backdrop-blur", pr.cls)}>
                                  {pr.label}
                                </Badge>

                                {t.followUpEnabled ? (
                                    <Badge
                                        variant="outline"
                                        className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground"
                                    >
                                      پیگیری فعال
                                    </Badge>
                                ) : null}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-end flex-col gap-2">
                              <StatusPills value={t.status} onChange={(v) => void quickSetStatus(t, v)} className="justify-end" />

                              <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                                    onClick={() => openEdit(t)}
                                >
                                  <MessageCircle className="h-4 w-4 ml-2" />
                                  جزئیات / پیام‌ها
                                </Button>

                                {canDelete ? (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="rounded-2xl"
                                        onClick={() =>
                                            askConfirm(
                                                "حذف تسک",
                                                `مطمئنی می‌خوای تسک «${t.title}» حذف بشه؟`,
                                                async () => {
                                                  await quickDelete(t);
                                                }
                                            )
                                        }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}
          </CardContent>
        </Card>

        <TaskDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            mode={dialogMode}
            initial={dialogInitial}
            users={users}
            onSaved={upsert}
            onDeleted={remove}
        />

        {/* ✅ فقط یک‌بار اینجا */}
        <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={confirmTitle}
            description={confirmDesc}
            confirmText="تأیید"
            cancelText="انصراف"
            destructive
            onConfirm={async () => {
              try {
                if (confirmAction) await confirmAction();
              } finally {
                setConfirmOpen(false);
                setConfirmAction(null);
              }
            }}
        />
      </div>
  );
}

export default TasksPage;
