import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import dayjs from "@/lib/day";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth";

export type TaskMessageDto = {
  id: number;
  taskId: number;
  senderId: number;
  senderName: string;
  body: string;
  createdAt: string;
};

export function TaskMessagesDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId: number;
  taskTitle?: string | null;
}) {
  const { user } = useAuth();
  const meId = user?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<TaskMessageDto[]>([]);
  const [text, setText] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => {
    const base = taskTitle ? `پیام‌های تسک: ${taskTitle}` : `پیام‌های تسک #${taskId}`;
    return base;
  }, [taskId, taskTitle]);

  const scrollToBottom = () => {
    window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  };

  const load = async () => {
    if (!taskId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<TaskMessageDto[]>(`/api/tasks/${taskId}/messages`, { method: "GET" });
      setItems(Array.isArray(data) ? data : []);
      scrollToBottom();
    } catch (e: any) {
      setErr(e?.message || "خطا در دریافت پیام‌ها");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;

    setSending(true);
    setErr(null);
    try {
      const created = await apiFetch<TaskMessageDto>(`/api/tasks/${taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      setItems((prev) => [...prev, created]);
      setText("");
      scrollToBottom();
    } catch (e: any) {
      setErr(e?.message || "خطا در ارسال پیام");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-right inline-flex items-center justify-end gap-2">
            <MessageCircle className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {err ? (
          <div className="text-sm text-rose-600 dark:text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-3 py-2 text-right">
            {err}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
          <ScrollArea className="h-[420px]">
            <div className="p-3 space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground py-10 text-center inline-flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال دریافت…
                </div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center">پیامی وجود ندارد.</div>
              ) : (
                items.map((m) => {
                  const isMe = meId != null && m.senderId === meId;
                  return (
                    <div key={m.id} className={cn("flex", isMe ? "justify-start" : "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-3xl border border-border/60 bg-background/40 backdrop-blur px-4 py-3 shadow-sm",
                          isMe ? "text-left" : "text-right"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground">
                            {m.senderName}
                          </Badge>
                          <div className="text-[11px] text-muted-foreground">
                            {dayjs(m.createdAt).calendar("jalali").locale("fa").format("YYYY/MM/DD HH:mm")}
                          </div>
                        </div>
                        <div className="mt-2 text-sm whitespace-pre-wrap leading-6">{m.body}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <div className="w-full flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="پیام…"
              className="min-h-[44px] max-h-[120px] rounded-2xl"
              disabled={sending}
            />
            <Button
              type="button"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
              className="rounded-2xl shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
