import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "@/lib/day";
import type { Dayjs } from "dayjs";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// NOTE: description is removed; Task backend doesn't have it.

import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import {MeetingDialog, type MeetingDto as MeetingDtoFE} from "@/components/meetings/MeetingDialog";
import { useAuth } from "@/features/auth/auth";

type HolidayDto = {
  dayId: string; // 14040101
  holiday: boolean;
  cause?: string;
  events?: string[];
};

type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type TaskStatus = "TODO" | "DOING" | "DONE";

type TaskDto = {
  id: number;
  title: string;
  priority?: TaskPriority | null;
  status: TaskStatus;
  date: string; // YYYY-MM-DD (Gregorian)
  assignedToId?: number | null;
  assignedToName?: string | null;
  createdById?: number | null;
  createdByName?: string | null;
  followUpEnabled?: boolean | null;
  followUpAt?: string | null;
};

type UserDto = {
  id: number;
  fullName: string;
  email?: string;
  role?: "ADMIN" | "STAFF";
  active?: boolean;
  managerId?: number | null;
};

type MeetingDto = MeetingDtoFE;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function jalaliDayId(d: Dayjs) {
  const jj = d.calendar("jalali");
  const y = jj.year();
  const m = jj.month() + 1;
  const dd = jj.date();
  return `${y}${pad2(m)}${pad2(dd)}`;
}

function sameJMonth(a: Dayjs, b: Dayjs) {
  const aj = a.calendar("jalali");
  const bj = b.calendar("jalali");
  return aj.year() === bj.year() && aj.month() === bj.month();
}

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const xsrf = getCookie("XSRF-TOKEN");
  const headers: Record<string, string> = {
    ...(init?.headers as any),
  };
  if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;

  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function fetchHolidaysRange(start: string, end: string): Promise<HolidayDto[]> {
  try {
    return await apiJson<HolidayDto[]>(`/api/calendar/holidays/range?start=${start}&end=${end}`);
  } catch {
    return [];
  }
}

function statusLabel(s: TaskStatus) {
  switch (s) {
    case "TODO":
      return "در انتظار";
    case "DOING":
      return "در حال انجام";
    case "DONE":
      return "انجام‌شده";
  }
}

function priorityRank(p?: TaskPriority | null) {
  // lower is higher priority
  switch (p) {
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 3;
    default:
      return 99;
  }
}

function gregorianDateForJalaliDay(d: Dayjs) {
  // d در تقویم جلالی انتخاب می‌شود، ولی backend تاریخ Gregorian (LocalDate) می‌خواهد.
  // dayjs(d.toDate()) تاریخ معادل Gregorian را برمی‌گرداند.
  return dayjs(d.toDate()).format("YYYY-MM-DD");
}

function chipClassByStatus(s: TaskStatus) {
  // لوکس + قابل خواندن در light/dark
  switch (s) {
    case "TODO":
      return "border-zinc-500/25 bg-zinc-500/10 text-foreground";
    case "DOING":
      return "border-sky-500/25 bg-sky-500/10 text-foreground";
    case "DONE":
      return "border-emerald-500/25 bg-emerald-500/10 text-foreground";
  }
}

function dotClassByStatus(s: TaskStatus) {
  switch (s) {
    case "TODO":
      return "bg-zinc-400/80";
    case "DOING":
      return "bg-sky-400/90";
    case "DONE":
      return "bg-emerald-400/90";
  }
}

export function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.includes("ROLE_ADMIN");
  const [searchParams, setSearchParams] = useSearchParams();

  const [cursor, setCursor] = useState(() => dayjs().calendar("jalali").startOf("month"));
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Sheet / selection
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null);

  // Tasks
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Meetings
  const [meetings, setMeetings] = useState<MeetingDto[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);

  // Meeting dialog
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingMode, setMeetingMode] = useState<"create" | "edit">("create");
  const [meetingInitial, setMeetingInitial] = useState<Partial<MeetingDto> & { date: string }>({
    date: dayjs().format("YYYY-MM-DD"),
  });

  // Users (assignees)
  const [users, setUsers] = useState<UserDto[]>([]);

  // Create form
  const [tTitle, setTTitle] = useState("");
  const [tPriority, setTPriority] = useState<TaskPriority>("MEDIUM");
  const [tAssigneeId, setTAssigneeId] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // Status update feedback
  const [savingTaskId, setSavingTaskId] = useState<number | null>(null);
  const [taskErr, setTaskErr] = useState<string | null>(null);

  const monthStart = useMemo(() => cursor.calendar("jalali").startOf("month"), [cursor]);
  const monthEnd = useMemo(() => cursor.calendar("jalali").endOf("month"), [cursor]);

  const startId = jalaliDayId(monthStart);
  const endId = jalaliDayId(monthEnd);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchHolidaysRange(startId, endId)
      .then((data) => {
        if (!alive) return;
        setHolidays(Array.isArray(data) ? data : []);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [startId, endId]);

  const holidayMap = useMemo(() => {
    const m = new Map<string, HolidayDto>();
    for (const h of holidays) m.set(h.dayId, h);
    return m;
  }, [holidays]);

  const loadTasks = async () => {
    setTasksLoading(true);
    try {
      const data = await apiFetch<TaskDto[]>("/api/tasks", { method: "GET" });
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadMeetings = async (fromIso: string, toIso: string) => {
    setMeetingsLoading(true);
    try {
      const data = await apiFetch<MeetingDto[]>(`/api/meetings?from=${fromIso}&to=${toIso}`, { method: "GET" });
      setMeetings(Array.isArray(data) ? data : []);
    } catch {
      setMeetings([]);
    } finally {
      setMeetingsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      if (!user) {
        setUsers([]);
        setTAssigneeId("");
        return;
      }

      if (isAdmin) {
        const data = await apiFetch<UserDto[]>("/api/admin/users", { method: "GET" });
        const active = (Array.isArray(data) ? data : []).filter((u) => u.active !== false);
        setUsers(active);

        const pick = active.find((u) => u.id === user.id) || active[0];
        setTAssigneeId(pick ? pick.id : "");
      } else {
        const data = await apiFetch<UserDto[]>("/api/users/assignable", { method: "GET" });
        const list = Array.isArray(data) ? data : [];
        setUsers(list);

        const pick = list.find((u) => u.id === user.id) || list[0];
        setTAssigneeId(pick ? pick.id : "");
      }
    } catch {
      setUsers([]);
      setTAssigneeId("");
    }
  };

  useEffect(() => {
    void loadTasks();
    void loadUsers();
  }, [user?.id, isAdmin]);

  // Grid: هفته از شنبه شروع
  const gridStart = useMemo(() => {
    const first = monthStart;
    const offset = (first.day() + 1) % 7; // شنبه(6)->0 ، یکشنبه(0)->1 ...
    return first.subtract(offset, "day");
  }, [monthStart]);

  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day")), [gridStart]);

  useEffect(() => {
    const fromIso = dayjs(gridStart.toDate()).format("YYYY-MM-DD");
    const toIso = dayjs(gridStart.add(41, "day").toDate()).format("YYYY-MM-DD");
    void loadMeetings(fromIso, toIso);
  }, [gridStart]);

  // Deep link from notifications
  useEffect(() => {
    const midRaw = searchParams.get("meetingId");
    if (!midRaw) return;
    const mid = Number(midRaw);
    if (!Number.isFinite(mid)) return;
    const m = meetings.find((x) => x.id === mid);
    if (!m) return;
    openEditMeeting(m);
    const next = new URLSearchParams(searchParams);
    next.delete("meetingId");
    setSearchParams(next, { replace: true });
  }, [meetings, searchParams, setSearchParams]);

  const title = useMemo(() => monthStart.locale("fa").format("MMMM YYYY"), [monthStart]);
  const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

  const tasksByDayId = useMemo(() => {
    const m = new Map<string, TaskDto[]>();
    for (const t of tasks) {
      if (!t.date) continue;
      // تاریخ backend Gregorian است (YYYY-MM-DD)
      const id = jalaliDayId(dayjs(`${t.date}T12:00:00`));
      const arr = m.get(id) ?? [];
      arr.push(t);
      m.set(id, arr);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return (a.id ?? 0) - (b.id ?? 0);
      });
      m.set(k, arr);
    }
    return m;
  }, [tasks]);

  const meetingsByDayId = useMemo(() => {
    const m = new Map<string, MeetingDto[]>();
    for (const meet of meetings) {
      if (!meet?.date) continue;
      const id = jalaliDayId(dayjs(`${meet.date}T12:00:00`));
      const arr = m.get(id) ?? [];
      arr.push(meet);
      m.set(id, arr);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const at = a.allDay ? 1 : 0;
        const bt = b.allDay ? 1 : 0;
        if (at !== bt) return at - bt;
        const as = (a.startTime || "").localeCompare(b.startTime || "");
        if (as !== 0) return as;
        return (a.id || 0) - (b.id || 0);
      });
      m.set(k, arr);
    }
    return m;
  }, [meetings]);

  const selectedDayId = useMemo(() => (selectedDay ? jalaliDayId(selectedDay) : null), [selectedDay]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDayId) return [];
    return (tasksByDayId.get(selectedDayId) ?? []).slice();
  }, [tasksByDayId, selectedDayId]);

  const selectedDayMeetings = useMemo(() => {
    if (!selectedDayId) return [];
    return (meetingsByDayId.get(selectedDayId) ?? []).slice();
  }, [meetingsByDayId, selectedDayId]);

  const openDaySheet = (d: Dayjs) => {
    setSelectedDay(d.startOf("day"));
    setSheetOpen(true);

    setCreateErr(null);
    setTaskErr(null);
    setTTitle("");
    setTPriority("MEDIUM");
    if (users.length) setTAssigneeId(users[0].id);
  };

  const openCreateMeeting = (dateDay: Dayjs) => {
    const dateIso = dayjs(dateDay.toDate()).format("YYYY-MM-DD");
    setMeetingMode("create");
    setMeetingInitial({
      date: dateIso,
      title: "",
      allDay: true,
      startTime: "09:00",
      endTime: "",
      location: "",
      content: "",
      outcome: "",
      reminderMinutesBefore: [24 * 60],
    });
    setMeetingOpen(true);
  };

  const openEditMeeting = (m: MeetingDto) => {
    setMeetingMode("edit");
    setMeetingInitial({ ...m, date: m.date });
    setMeetingOpen(true);
  };

  const onMeetingSaved = (m: MeetingDto) => {
    setMeetings((prev) => {
      const idx = prev.findIndex((x) => x.id === m.id);
      if (idx === -1) return [m, ...prev];
      const copy = prev.slice();
      copy[idx] = m;
      return copy;
    });
  };

  const onMeetingDeleted = (id: number) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  const createTaskForSelectedDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;

    const title = tTitle.trim();
    if (!title) {
      setCreateErr("عنوان تسک را وارد کن.");
      return;
    }

    setCreateErr(null);

    if (tAssigneeId === "") {
      setCreateErr("مسئول تسک را انتخاب کن.");
      return;
    }

    setCreating(true);

    const date = gregorianDateForJalaliDay(selectedDay);

    try {
      const created = await apiFetch<TaskDto>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date,
          priority: tPriority,
          assignedTo: { id: tAssigneeId },
        }),
      });

      setTasks((prev) => [created, ...prev]);
      void loadTasks();

      setTTitle("");
      setTPriority("MEDIUM");
    } catch (err: any) {
      setCreateErr(err?.message || "خطا در ایجاد تسک");
    } finally {
      setCreating(false);
    }
  };

  const changeStatus = async (id: number, status: TaskStatus) => {
    setTaskErr(null);
    setSavingTaskId(id);

    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));

    try {
      await apiFetch<TaskDto>(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      void loadTasks();
    } catch (e: any) {
      setTasks(prev);
      setTaskErr(e?.message || "خطا در تغییر وضعیت");
    } finally {
      setSavingTaskId(null);
    }
  };

  // تعداد چیپ‌هایی که داخل هر روز نمایش می‌دیم (برای شیک بودن و شلوغ نشدن)
  const MAX_CHIPS_PER_DAY = 2;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold tracking-tight text-foreground">{title}</div>
          {loading ? (
            <Badge variant="outline" className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground">
              در حال دریافت تعطیلات…
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground">
              تعطیلات: {holidays.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
            onClick={() => setCursor((c) => c.calendar("jalali").subtract(1, "month"))}
          >
            <ChevronRight className="h-4 w-4 ml-2" />
            ماه قبل
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
            onClick={() => setCursor(dayjs().calendar("jalali").startOf("month"))}
          >
            امروز
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
            onClick={() => setCursor((c) => c.calendar("jalali").add(1, "month"))}
          >
            ماه بعد
            <ChevronLeft className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((d) => (
          <div key={d} className="text-xs text-muted-foreground px-2">
            {d}
          </div>
        ))}
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const inMonth = sameJMonth(d, monthStart);
            const isFriday = d.day() === 5;
            const id = jalaliDayId(d);
            const h = holidayMap.get(id);

            const isHoliday = !!h?.holiday;
            const isToday = d.isSame(dayjs(), "day");
            const dayNumber = String(d.calendar("jalali").date());

            const dayTasks = tasksByDayId.get(id) ?? [];
            const taskCount = dayTasks.length;

            const dayMeetings = meetingsByDayId.get(id) ?? [];
            const meetingCount = dayMeetings.length;

            const showMeetings = dayMeetings.slice(0, Math.min(1, MAX_CHIPS_PER_DAY));
            const remainingForTasks = Math.max(0, MAX_CHIPS_PER_DAY - showMeetings.length);
            const showTasks = dayTasks.slice(0, remainingForTasks);
            const rest = Math.max(0, meetingCount - showMeetings.length) + Math.max(0, taskCount - showTasks.length);

            const base = "relative rounded-2xl border p-3 h-24 overflow-hidden transition shadow-sm hover:shadow-md text-right";
            const faded = !inMonth ? "opacity-45" : "opacity-100";

            const offClass = isHoliday
              ? "bg-rose-500/10 border-rose-500/25"
              : isFriday
                ? "bg-amber-500/10 border-amber-500/20"
                : "bg-card/50 border-border/60 hover:bg-card/70";

            const numClass = isHoliday
              ? "text-rose-700 dark:text-rose-200"
              : isFriday
                ? "text-amber-800 dark:text-amber-200"
                : "text-foreground";

            const pill = isHoliday ? (
              <Badge variant="outline" className="rounded-xl bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-200">
                تعطیل
              </Badge>
            ) : isFriday ? (
              <Badge variant="outline" className="rounded-xl bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-200">
                جمعه
              </Badge>
            ) : null;

            const cellInner = (
              <button
                type="button"
                onClick={() => openDaySheet(d)}
                className={cn(base, offClass, faded, isToday && "ring-2 ring-primary/35", "w-full")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={cn("text-sm font-semibold", numClass)}>{dayNumber}</div>
                  {pill}
                </div>

                {/* چیپ‌های جلسه/تسک داخل روز */}
                {meetingCount > 0 || taskCount > 0 ? (
                  <div className="mt-2 space-y-1">
                    {showMeetings.map((m) => (
                      <button
                        key={`m-${m.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditMeeting(m);
                        }}
                        title={`جلسه • ${m.title}`}
                        className={cn(
                          "w-full text-right flex items-center gap-2 rounded-xl border px-2 py-1 text-[11px] leading-none backdrop-blur",
                          "border-violet-500/25 bg-violet-500/10 text-foreground"
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-violet-400/90" />
                        <span className="truncate">
                          {m.allDay ? "جلسه" : m.startTime ? `${m.startTime} •` : "جلسه"} {m.title}
                        </span>
                      </button>
                    ))}

                    {showTasks.map((t) => (
                      <div
                        key={t.id}
                        title={`${statusLabel(t.status)} • ${t.title}`}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-2 py-1 text-[11px] leading-none backdrop-blur",
                          chipClassByStatus(t.status)
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClassByStatus(t.status))} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}

                    {rest > 0 ? (
                      <div className="flex justify-end">
                        <Badge
                          variant="outline"
                          className="rounded-xl bg-background/40 border-border/60 text-muted-foreground text-[10px]"
                        >
                          +{rest}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {isHoliday && <div className="absolute left-3 bottom-3 h-2.5 w-2.5 rounded-full bg-rose-500/70" />}
                {!isHoliday && isFriday && <div className="absolute left-3 bottom-3 h-2.5 w-2.5 rounded-full bg-amber-400/70" />}

                {/* شمارنده گوشه پایین */}
                <div className="absolute right-3 bottom-3 text-[11px] text-muted-foreground">
                  {meetingCount > 0 && taskCount > 0
                    ? `${meetingCount} جلسه • ${taskCount} تسک`
                    : meetingCount > 0
                      ? `${meetingCount} جلسه`
                      : taskCount > 0
                        ? `${taskCount} تسک`
                        : ""}
                </div>
              </button>
            );

            // اگر تعطیلی علت دارد، Tooltip برای همان علت؛ داخل سلول چیپ‌ها tooltip ندارند تا تداخل ایجاد نشود.
            if (!h?.cause) return <div key={id}>{cellInner}</div>;

            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>{cellInner}</TooltipTrigger>
                <TooltipContent className="max-w-xs rounded-2xl border border-border/60 bg-popover text-popover-foreground shadow-lg px-3 py-2">
                  <div className="text-sm font-medium">{h.cause}</div>
                  {h.events?.length ? (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      {h.events.slice(0, 4).map((e, idx) => (
                        <div key={idx}>• {e}</div>
                      ))}
                    </div>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          تعطیل رسمی
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          جمعه
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-400/90" />
          جلسه
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-400/80" />
          TODO
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400/90" />
          DOING
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          DONE
        </span>
      </div>

      {/* Day Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setSelectedDay(null);
        }}
      >
        <SheetContent className="w-[420px] sm:w-[520px] p-0 overflow-hidden">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="h-dvh flex flex-col">
              <div className="shrink-0 p-4 border-b border-border/40">
                <h2 className="font-bold">جزئیات روز</h2>
              </div>

              <Separator className="my-4" />

              {/* Meetings */}
              <div className="text-right">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-medium">جلسات این روز</div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selectedDay}
                    onClick={() => selectedDay && openCreateMeeting(selectedDay)}
                    className="rounded-2xl border-violet-500/25 bg-violet-500/10 text-foreground hover:bg-violet-500/15"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    جلسه جدید
                  </Button>
                </div>

                <div className="rounded-2xl border bg-card/40">
                  <ScrollArea className="h-[220px]">
                    <div className="p-3 space-y-2">
                      {meetingsLoading ? (
                        <div className="text-sm text-muted-foreground py-6 text-center">در حال دریافت…</div>
                      ) : selectedDayMeetings.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6 text-center">برای این روز جلسه‌ای ثبت نشده.</div>
                      ) : (
                        selectedDayMeetings.map((m) => (
                          <div key={m.id} className="rounded-2xl border bg-background/40 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{m.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {m.allDay
                                    ? "تمام روز"
                                    : m.startTime
                                      ? `${m.startTime}${m.endTime ? ` تا ${m.endTime}` : ""}`
                                      : "—"}
                                  {m.location ? ` • ${m.location}` : ""}
                                  {m.reminderMinutesBefore?.length ? ` • ${m.reminderMinutesBefore.length} یادآوری` : ""}
                                </div>
                                {m.outcome ? (
                                  <div className="text-xs text-foreground/90 mt-2 line-clamp-2">{m.outcome}</div>
                                ) : null}
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openEditMeeting(m)}
                                className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                              >
                                ویرایش
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {taskErr ? (
                <div className="mb-3 text-sm text-rose-600 dark:text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-3 py-2 text-right">
                  {taskErr}
                </div>
              ) : null}

              <div className="text-right">
                <div className="text-sm font-medium mb-2">تسک‌های این روز</div>

                <div className="rounded-2xl border bg-card/40">
                  <ScrollArea className="h-[260px]">
                    <div className="p-3 space-y-2">
                      {tasksLoading ? (
                        <div className="text-sm text-muted-foreground py-6 text-center">در حال دریافت…</div>
                      ) : selectedDayTasks.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6 text-center">برای این روز تسکی ثبت نشده.</div>
                      ) : (
                        selectedDayTasks.map((t) => (
                          <div key={t.id} className="rounded-2xl border bg-background/40 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{t.title}</div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  مسئول: {t.assignedToName || "—"} • اولویت: {t.priority || "MEDIUM"} • ارجاع‌دهنده: {t.createdByName || "—"} • #{t.id}
                                  {t.followUpEnabled ? " • پیگیری فعال" : ""}
                                </div>
                              </div>

                              <div className="shrink-0 flex flex-col items-end gap-2">
                                <StatusPills
                                  value={t.status}
                                  disabled={savingTaskId === t.id}
                                  onChange={(v) => changeStatus(t.id, v)}
                                />
                                {savingTaskId === t.id ? (
                                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ذخیره…
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground">{statusLabel(t.status)}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-right">
                <div className="text-sm font-medium mb-2">ایجاد تسک</div>

                <form onSubmit={createTaskForSelectedDay} className="space-y-3">
                  <div className="space-y-2">
                    <Label>عنوان</Label>
                    <Input value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="مثلاً: پیگیری خرید…" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>اولویت</Label>
                      <select
                        value={tPriority}
                        onChange={(e) => setTPriority(e.target.value as TaskPriority)}
                        className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                      >
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>مسئول</Label>
                      <select
                        value={tAssigneeId}
                        onChange={(e) => setTAssigneeId(e.target.value ? Number(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                      >
                        <option value="">— انتخاب کن —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {createErr ? (
                    <div className="text-sm text-rose-600 dark:text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-3 py-2 text-right">
                      {createErr}
                    </div>
                  ) : null}

                  <Button type="submit" disabled={!selectedDay || creating} className="w-full rounded-2xl">
                    {creating ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        در حال ایجاد…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        ایجاد تسک برای همین روز
                      </span>
                    )}
                  </Button>

                  <div className="text-xs text-muted-foreground text-center">تاریخ به صورت Gregorian (YYYY-MM-DD) ذخیره می‌شود.</div>
                </form>
              </div>
            </div>
          </ScrollArea>

        </SheetContent>
      </Sheet>

      <MeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        mode={meetingMode}
        initial={meetingInitial}
        onSaved={onMeetingSaved}
        onDeleted={onMeetingDeleted}
      />
    </div>
  );
}

/** Status pills (inline) */
function StatusPills({
  value,
  onChange,
  disabled,
  className,
}: {
  value: TaskStatus;
  onChange: (v: TaskStatus) => void;
  disabled?: boolean;
  className?: string;
}) {
  const items: { key: TaskStatus; label: string; cls: string }[] = [
    { key: "TODO", label: "در انتظار", cls: "bg-zinc-500/10 text-foreground border-zinc-500/25" },
    { key: "DOING", label: "در حال انجام", cls: "bg-sky-500/10 text-foreground border-sky-500/25" },
    { key: "DONE", label: "انجام‌شده", cls: "bg-emerald-500/10 text-foreground border-emerald-500/25" },
  ];

  return (
    <div
      className={cn(
        "inline-flex rounded-2xl border border-border/60 bg-background/40 backdrop-blur p-1 gap-1",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "h-8 px-3 rounded-xl text-xs border transition",
              active
                ? cn("shadow-sm", it.cls)
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
