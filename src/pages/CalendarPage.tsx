import { useEffect, useMemo, useState } from "react";
import dayjs from "@/lib/day";
import type { Dayjs } from "dayjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HolidayDto = {
  dayId: string; // 14040101
  holiday: boolean;
  cause?: string;
  events?: string[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function jalaliDayId(d: Dayjs) {
  const jj = d.calendar("jalali");
  const y = jj.year();
  const m = jj.month() + 1;
  const dd = jj.date();
  return `${y}${pad2(m)}${pad2(dd)}`; // مثل 14041005
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

async function fetchHolidaysRange(start: string, end: string): Promise<HolidayDto[]> {
  const xsrf = getCookie("XSRF-TOKEN");
  const res = await fetch(`/api/calendar/holidays/range?start=${start}&end=${end}`, {
    credentials: "include",
    headers: xsrf ? { "X-XSRF-TOKEN": xsrf } : {},
  });
  if (!res.ok) return [];
  return res.json();
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => dayjs().calendar("jalali").startOf("month"));
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [loading, setLoading] = useState(false);

  const monthStart = useMemo(() => cursor.calendar("jalali").startOf("month"), [cursor]);
  const monthEnd = useMemo(() => cursor.calendar("jalali").endOf("month"), [cursor]);

    const startId = jalaliDayId(monthStart);
    const endId   = jalaliDayId(monthEnd);

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

  // Grid: هفته از شنبه شروع
  const gridStart = useMemo(() => {
    const first = monthStart;
    const offset = (first.day() + 1) % 7; // شنبه(6)->0 ، یکشنبه(0)->1 ...
    return first.subtract(offset, "day");
  }, [monthStart]);

  const days = useMemo(() => {
    return Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day"));
  }, [gridStart]);

  const title = useMemo(() => monthStart.locale("fa").format("MMMM YYYY"), [monthStart]);

  const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">{title}</div>
          {loading ? (
            <Badge className="rounded-xl bg-zinc-950/30 border border-zinc-800 text-zinc-300">در حال دریافت تعطیلات…</Badge>
          ) : (
            <Badge className="rounded-xl bg-zinc-950/30 border border-zinc-800 text-zinc-300">
              تعطیلات: {holidays.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-2xl border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/35"
            onClick={() => setCursor((c) => c.calendar("jalali").subtract(1, "month"))}
          >
            <ChevronRight className="h-4 w-4 ml-2" />
            ماه قبل
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/35"
            onClick={() => setCursor(dayjs().calendar("jalali").startOf("month"))}
          >
            امروز
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/35"
            onClick={() => setCursor((c) => c.calendar("jalali").add(1, "month"))}
          >
            ماه بعد
            <ChevronLeft className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((d) => (
          <div key={d} className="text-xs text-zinc-400 px-2">
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

            const isHoliday = !!h;
            const isToday = d.isSame(dayjs(), "day");

            const dayNumber = String(d.calendar("jalali").date());


            const offClass = isHoliday
              ? "bg-rose-500/10 border-rose-500/30"
              : isFriday
                ? "bg-amber-500/10 border-amber-500/25"
                : "bg-zinc-950/15 border-zinc-800/60";

            const textClass = isHoliday
              ? "text-rose-100"
              : isFriday
                ? "text-amber-100"
                : "text-zinc-100";

            const faded = !inMonth ? "opacity-40" : "";

            const cell = (
              <div
                className={cn(
                  "relative rounded-2xl border p-3 h-24 overflow-hidden transition shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
                  offClass,
                  faded,
                  isToday && "ring-1 ring-emerald-400/60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={cn("text-sm font-semibold", textClass)}>{dayNumber}</div>

                  {isHoliday ? (
                    <Badge className="rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-100">
                      تعطیل
                    </Badge>
                  ) : isFriday ? (
                    <Badge className="rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-100">
                      جمعه
                    </Badge>
                  ) : null}
                </div>

                {/* نقطه کوچک برای تعطیل */}
                {isHoliday && <div className="absolute left-3 bottom-3 h-2.5 w-2.5 rounded-full bg-rose-400/80" />}

                {/* فضای آینده: نمایش تعداد تسک‌های آن روز */}
                <div className="absolute right-3 bottom-3 text-[11px] text-zinc-400">
                  {/* بعداً: 3 تسک */}
                </div>
              </div>
            );

            if (!h?.cause) return <div key={id}>{cell}</div>;

            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>{cell}</TooltipTrigger>
                <TooltipContent className="max-w-xs rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-200">
                  <div className="text-sm font-medium">{h.cause}</div>
                  {h.events?.length ? (
                    <div className="mt-2 text-xs text-zinc-400 space-y-1">
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

      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          تعطیل رسمی
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
          جمعه
        </span>
      </div>
    </div>
  );
}
