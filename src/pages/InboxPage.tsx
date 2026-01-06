import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Notif = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
};

export default function InboxPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const load = async () => setItems(await apiFetch("/api/notifications"));
  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  };

  return (
    <div className="p-4">
      <div className="text-xl font-bold mb-3">Inbox</div>
      <div className="rounded-2xl border bg-card/60 backdrop-blur">
        <ScrollArea className="h-[78vh] p-3">
          <div className="grid gap-3">
            {items.map(n => (
              <div key={n.id} className="rounded-xl border p-3 bg-background/40">
                <div className="font-semibold">{n.title}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{n.message}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("fa-IR")}
                  </div>
                  {!n.readAt && (
                    <Button size="sm" onClick={() => markRead(n.id)}>خوانده شد</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
