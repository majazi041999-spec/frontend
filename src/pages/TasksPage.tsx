// frontend/src/pages/TasksPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {TaskDialog} from "@/components/tasks/TaskDialog";
import { StatusPills, TaskStatus } from "@/components/tasks/StatusPills";
import { cn } from "@/lib/utils";

type TaskDto = {
    id: number;
    title: string;
    status: TaskStatus;
    priority?: string;
    date?: string | null;

    assignedToId?: number | null;
    assignedToName?: string | null;

    createdById?: number | null;
    createdByName?: string | null;

    closeRequested?: boolean | null;
    closeRequestedAt?: string | null;
    closedAt?: string | null;
};

const API_BASE = "";

async function getJSON<T>(path: string): Promise<T> {
    const res = await fetch(API_BASE + path, { credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function postJSON<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(API_BASE + path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function patchJSON<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(API_BASE + path, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function TasksPage() {
    const [sp] = useSearchParams();
    const taskIdFromUrl = sp.get("taskId");
    const openMsgs = sp.get("messages") === "1";

    const [meId, setMeId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState<TaskDto[]>([]);
    const [q, setQ] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const me = await getJSON<{ id: number }>("/api/me");
            setMeId(me?.id ?? null);

            const list = await getJSON<TaskDto[]>("/api/tasks");
            setTasks(list || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!taskIdFromUrl) return;
        const id = Number(taskIdFromUrl);
        if (!Number.isFinite(id)) return;
        setSelectedTaskId(id);
        setDialogOpen(true);
    }, [taskIdFromUrl]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return tasks;
        return tasks.filter((t) => (t.title || "").toLowerCase().includes(qq));
    }, [tasks, q]);

    const openTask = (id: number) => {
        setSelectedTaskId(id);
        setDialogOpen(true);
    };

    const setStatus = async (t: TaskDto, status: TaskStatus) => {
        if (status === "DONE") return;
        await patchJSON(`/api/tasks/${t.id}`, { status });
        await load();
    };

    const requestClose = async (t: TaskDto) => {
        await postJSON(`/api/tasks/${t.id}/request-close`, {});
        await load();
    };

    const closeTask = async (t: TaskDto) => {
        await postJSON(`/api/tasks/${t.id}/close`, {});
        await load();
    };

    return (
        <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">تسک‌ها</div>
                    <div className="text-xs text-muted-foreground">مدیریت و پیگیری</div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" className="rounded-xl" onClick={load} disabled={loading}>
                        بروزرسانی
                    </Button>
                </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="جستجو..."
                    className="rounded-xl"
                />
            </div>

            <div className="mt-3 space-y-2">
                {filtered.length === 0 ? (
                    <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
                        {loading ? "در حال بارگذاری..." : "تسکی وجود ندارد."}
                    </div>
                ) : (
                    filtered.map((t) => {
                        const isAssignee = !!t.assignedToId && t.assignedToId === meId;
                        const isCreator = !!t.createdById && t.createdById === meId;

                        const allowDoneSelect = false;

                        return (
                            <div key={t.id} className="rounded-2xl border p-3">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold truncate">{t.title}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            مسئول: {t.assignedToName || "-"} | ارجاع‌دهنده: {t.createdByName || "-"}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <StatusPills
                                                value={t.status}
                                                onChange={(s) => setStatus(t, s)}
                                                allowDoneSelect={allowDoneSelect}
                                            />
                                            {t.closeRequested && !t.closedAt && (
                                                <span className="text-[11px] rounded-xl border px-2 py-1 bg-amber-500/10 border-amber-500/25 text-amber-700">
                          درخواست بستن
                        </span>
                                            )}
                                            {t.closedAt && (
                                                <span className="text-[11px] rounded-xl border px-2 py-1 bg-emerald-500/10 border-emerald-500/25 text-emerald-700">
                          بسته شد
                        </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button className="rounded-xl" onClick={() => openTask(t.id)}>
                                            باز کردن
                                        </Button>

                                        {isAssignee && !t.closedAt && (
                                            <Button
                                                variant="secondary"
                                                className="rounded-xl"
                                                onClick={() => requestClose(t)}
                                                disabled={!!t.closeRequested}
                                            >
                                                درخواست بستن
                                            </Button>
                                        )}

                                        {isCreator && !t.closedAt && (
                                            <Button
                                                className={cn("rounded-xl")}
                                                onClick={() => closeTask(t)}
                                                disabled={!t.closeRequested && !(isCreator && isAssignee)}
                                            >
                                                بستن نهایی
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <TaskDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                taskId={selectedTaskId}
                openMessagesOnOpen={openMsgs}
                onChanged={load}
            />
        </div>
    );
}
