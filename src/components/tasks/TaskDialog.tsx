import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MessageCircle, Save, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import dayjs from "@/lib/day";
import { j } from "@/lib/jdate";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatusPills, type TaskStatus } from "@/components/tasks/StatusPills";
import { useAuth } from "@/features/auth/auth";
import { TaskMessagesDialog } from "@/components/tasks/TaskMessagesDialog";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type TaskDto = {
  id: number;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority | null;
  date: string; // YYYY-MM-DD
  assignedToId?: number | null;
  assignedToName?: string | null;
  createdById?: number | null;
  createdByName?: string | null;
  followUpEnabled?: boolean | null;
  followUpAt?: string | null; // ISO
};

export type UserMini = {
  id: number;
  fullName: string;
  email?: string;
  role?: string;
  active?: boolean;
};

type Mode = "create" | "edit";

export function TaskDialog({
  open,
  onOpenChange,
  mode,
  initial,
  users,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  initial?: Partial<TaskDto>;
  users: UserMini[];
  onSaved: (t: TaskDto) => void;
  onDeleted?: (id: number) => void;
}) {
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.includes("ROLE_ADMIN");
  const meId = user?.id ?? null;

  const isEdit = mode === "edit";
  const taskId = (initial?.id as number | undefined) ?? undefined;

  const isAssignee = useMemo(() => {
    if (!meId) return false;
    if (!initial?.assignedToId) return false;
    return initial.assignedToId === meId;
  }, [initial?.assignedToId, meId]);

  const isCreator = useMemo(() => {
    if (!meId) return false;
    if (!initial?.createdById) return false;
    return initial.createdById === meId;
  }, [initial?.createdById, meId]);

  const canEditAll = isAdmin || isCreator || !isEdit; // create always full
  const assigneeOnly = isEdit && isAssignee && !isAdmin && !isCreator;
  const canDelete = isEdit && (isAdmin || isCreator);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState<number | "">("");
  const [date, setDate] = useState<string>(dayjs().format("YYYY-MM-DD"));

  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpAtLocal, setFollowUpAtLocal] = useState<string>(""); // datetime-local

  const [msgOpen, setMsgOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr(null);

    const it = initial || {};
    setTitle((it.title || "").toString());
    setStatus((it.status as TaskStatus) || "TODO");
    setPriority(((it.priority as TaskPriority) || "MEDIUM") as TaskPriority);
    setAssignedToId(typeof it.assignedToId === "number" ? it.assignedToId : "");
    setDate(it.date ? dayjs(it.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"));

    const fuEnabled = Boolean(it.followUpEnabled);
    setFollowUpEnabled(fuEnabled);
    if (it.followUpAt) {
      try {
        setFollowUpAtLocal(dayjs(it.followUpAt).local().format("YYYY-MM-DDTHH:mm"));
      } catch {
        setFollowUpAtLocal("");
      }
    } else {
      setFollowUpAtLocal("");
    }
  }, [open, initial]);

  const jalaliHint = useMemo(() => {
    try {
      return j(`${date}T12:00:00`).format("D MMMM YYYY");
    } catch {
      return "";
    }
  }, [date]);

  const canSave = useMemo(() => {
    if (!date) return false;
    if (!title.trim()) return false;
    if (!isEdit && assignedToId === "") return false; // create requires assignee
    if (followUpEnabled && !followUpAtLocal.trim()) return false;
    return true;
  }, [title, date, assignedToId, isEdit, followUpEnabled, followUpAtLocal]);

  const toIsoFromLocal = (local: string) => {
    // local: YYYY-MM-DDTHH:mm (interpreted as local time)
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const onSubmit = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErr("عنوان تسک را وارد کن.");
      return;
    }

    if (!isEdit && assignedToId === "") {
      setErr("مسئول تسک را انتخاب کن.");
      return;
    }

    if (followUpEnabled && !followUpAtLocal.trim()) {
      setErr("برای پیگیری، زمان یادآوری لازم است.");
      return;
    }

    setSaving(true);
    setErr(null);

    const followUpAt = followUpEnabled ? toIsoFromLocal(followUpAtLocal.trim()) : null;

    try {
      if (!isEdit) {
        const payload: any = {
          title: cleanTitle,
          date,
          priority,
          assignedTo: { id: assignedToId === "" ? null : assignedToId },
          followUpEnabled: followUpEnabled ? true : false,
          followUpAt,
        };

        const saved = await apiFetch<TaskDto>("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        onSaved(saved);
        onOpenChange(false);
        return;
      }

      if (!taskId) throw new Error("task id missing");

      // PATCH rules:
      // - assignee-only: can update status only.
      // - creator/admin: can update status, priority, assigneeId, followUp*
      const payload: any = {};
      payload.status = status;

      if (!assigneeOnly) {
        payload.priority = priority;
        if (assignedToId !== "") payload.assigneeId = assignedToId;

        if (followUpEnabled) {
          payload.followUpEnabled = true;
          payload.followUpAt = followUpAt;
        } else {
          payload.followUpEnabled = false;
          payload.followUpAt = null;
        }
      }

      const saved = await apiFetch<TaskDto>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onSaved(saved);
      onOpenChange(false);
    } catch (e: any) {
      setErr(e?.message || "خطا در ذخیره تسک");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!taskId) return;
    setDeleting(true);
    setErr(null);
    try {
      await apiFetch<void>(`/api/tasks/${taskId}`, { method: "DELETE" });
      onDeleted?.(taskId);
      onOpenChange(false);
    } catch (e: any) {
      setErr(e?.message || "خطا در حذف تسک");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 justify-end">
                <span className={cn("font-semibold", isEdit ? "" : "")}>{isEdit ? "ویرایش تسک" : "ایجاد تسک جدید"}</span>
              </div>

              {isEdit ? (
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                    onClick={() => setMsgOpen(true)}
                  >
                    <MessageCircle className="h-4 w-4 ml-2" />
                    پیام‌ها
                  </Button>
                </div>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-right">
                <Label>عنوان</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: هماهنگی با تیم…" disabled={assigneeOnly} />
              </div>

              <div className="space-y-2 text-right">
                <Label className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  تاریخ
                </Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={assigneeOnly} />
                {jalaliHint ? (
                  <div className="flex justify-end">
                    <Badge variant="outline" className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground">
                      {jalaliHint}
                    </Badge>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 text-right">
                <Label>اولویت</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                  disabled={!canEditAll || assigneeOnly}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div className="space-y-2 text-right">
                <Label>مسئول</Label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value ? Number(e.target.value) : "")}
                  className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                  disabled={!canEditAll || assigneeOnly}
                >
                  <option value="">— انتخاب —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 text-right">
                <Label>وضعیت</Label>
                <div className="flex justify-end">
                  <StatusPills value={status} onChange={setStatus} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">یادآور پیگیری برای ارجاع‌دهنده</div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={followUpEnabled}
                    onChange={(e) => setFollowUpEnabled(e.target.checked)}
                    disabled={!canEditAll || assigneeOnly}
                  />
                  فعال
                </label>
              </div>

              {followUpEnabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2 text-right">
                    <Label>زمان یادآور</Label>
                    <Input
                      type="datetime-local"
                      value={followUpAtLocal}
                      onChange={(e) => setFollowUpAtLocal(e.target.value)}
                      disabled={!canEditAll || assigneeOnly}
                    />
                    <div className="text-xs text-muted-foreground">این یادآوری برای کسی است که تسک را ارجاع داده.</div>
                  </div>
                  <div className="hidden md:block" />
                </div>
              ) : null}
            </div>

            {isEdit ? (
              <div className="flex flex-wrap gap-2 justify-end">
                {initial?.createdByName ? (
                  <Badge variant="outline" className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground">
                    ارجاع‌دهنده: {initial.createdByName}
                  </Badge>
                ) : null}
                {initial?.assignedToName ? (
                  <Badge variant="outline" className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground">
                    مسئول: {initial.assignedToName}
                  </Badge>
                ) : null}
              </div>
            ) : null}

            {err ? (
              <div className="text-sm text-rose-600 dark:text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-3 py-2 text-right">
                {err}
              </div>
            ) : null}
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                className="rounded-2xl"
                onClick={() => void doDelete()}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                {deleting ? "در حال حذف…" : "حذف"}
              </Button>
            ) : null}

            <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
              بستن
            </Button>
            <Button className="rounded-2xl" onClick={onSubmit} disabled={!canSave || saving || deleting}>
              <span className="inline-flex items-center gap-2">
                <Save className="h-4 w-4" />
                {saving ? "در حال ذخیره…" : "ذخیره"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEdit && taskId ? (
        <TaskMessagesDialog
          open={msgOpen}
          onOpenChange={setMsgOpen}
          taskId={taskId}
          taskTitle={initial?.title ?? null}
        />
      ) : null}
    </>
  );
}
