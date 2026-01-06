import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import dayjs from "@/lib/day";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth";

type NotificationDto = {
  id: number;
  type: string;
  title: string;
  message?: string | null;
  taskId?: number | null;
  meetingId?: number | null;
  createdAt: string;
  readAt?: string | null;
};

function relTime(iso: string) {
  const d = dayjs(iso);
  const now = dayjs();
  const diffMin = Math.abs(now.diff(d, "minute"));
  if (diffMin < 1) return "لحظاتی پیش";
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  const diffH = Math.abs(now.diff(d, "hour"));
  if (diffH < 24) return `${diffH} ساعت پیش`;
  const diffD = Math.abs(now.diff(d, "day"));
  return `${diffD} روز پیش`;
}

export function NotificationCenter({ className }: { className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.readAt).length, [items]);
  const unreadItems = useMemo(() => items.filter((n) => !n.readAt), [items]);

  const refresh = async () => {
    if (!user) return;
    setErr(null);
    try {
      const data = await apiFetch<NotificationDto[]>("/api/notifications", { method: "GET" });
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "خطا در دریافت اعلان‌ها");
    }
  };

  useEffect(() => {
    if (!user) return;
    void refresh();
    const t = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const title = useMemo(() => (unreadCount ? `اعلان‌ها (${unreadCount})` : "اعلان‌ها"), [unreadCount]);

  const markRead = async (id: number) => {
    try {
      await apiFetch<void>(`/api/notifications/${id}/read`, { method: "POST" });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch {
      // ignore
    }
  };

  const openTarget = (n: NotificationDto) => {
    if (n.taskId) {
      navigate(`/tasks?taskId=${n.taskId}`);
      setOpen(false);
      return;
    }
    if (n.meetingId) {
      navigate(`/?meetingId=${n.meetingId}`);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "relative rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60",
          className
        )}
      >
        <Bell size={18} className="ml-2" />
        اعلان‌ها
        {unreadCount > 0 ? (
          <span className="absolute -left-1 -top-1">
            <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] px-1.5 shadow-sm">
              {unreadCount}
            </span>
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-right">{title}</DialogTitle>
          </DialogHeader>

          <Separator className="my-2 bg-border/60" />

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin ml-2" />
              در حال دریافت…
            </div>
          ) : err ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-right">
              {err}
            </div>
          ) : unreadItems.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-background/30 p-6 text-center text-sm text-muted-foreground">
              فعلاً اعلان جدیدی نداری.
            </div>
          ) : (
            <ScrollArea className="h-[420px] pr-2">
              <div className="space-y-3">
                {unreadItems.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-3xl border border-border/60 bg-card/50 backdrop-blur p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-right">
                        <div className="text-sm font-semibold text-foreground truncate">{n.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {relTime(n.createdAt)} • {dayjs(n.createdAt).calendar("jalali").locale("fa").format("YYYY/MM/DD HH:mm")}
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground"
                      >
                        {n.type}
                      </Badge>
                    </div>

                    {n.message ? (
                      <div className="mt-3 text-sm text-foreground/90 whitespace-pre-line leading-6 text-right">
                        {n.message}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {n.taskId ? `Task #${n.taskId}` : n.meetingId ? `Meeting #${n.meetingId}` : ""}
                      </div>
                      <div className="flex items-center gap-2">
                        {(n.taskId || n.meetingId) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openTarget(n)}
                            className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                          >
                            باز کردن
                          </Button>
                        ) : null}

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void markRead(n.id)}
                          className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                        >
                          <CheckCircle2 className="h-4 w-4 ml-2" />
                          خواندم
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
