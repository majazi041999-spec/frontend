import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin, NotebookPen, Sparkles, Trash2, X } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import dayjs from "@/lib/day";
import { cn } from "@/lib/utils";

export type MeetingDto = {
  id?: number | null;
  title: string;
  date: string; // yyyy-MM-dd (Gregorian)
  allDay: boolean;
  startTime?: string | null; // HH:mm
  endTime?: string | null; // HH:mm
  location?: string | null;
  content?: string | null;
  outcome?: string | null;
  reminderMinutesBefore?: number[] | null;
  alarmEnabled?: boolean | null;
};

const PRESETS: { label: string; minutes: number }[] = [
  { label: "۲ روز قبل", minutes: 2 * 24 * 60 },
  { label: "۱ روز قبل", minutes: 24 * 60 },
  { label: "۳ ساعت قبل", minutes: 3 * 60 },
  { label: "۱ ساعت قبل", minutes: 60 },
  { label: "۳۰ دقیقه قبل", minutes: 30 },
];

function humanizeMinutes(m: number) {
  if (m % (24 * 60) === 0) return `${m / (24 * 60)} روز قبل`;
  if (m % 60 === 0) return `${m / 60} ساعت قبل`;
  return `${m} دقیقه قبل`;
}

function jalaliLabel(dateIso: string) {
  return dayjs(`${dateIso}T12:00:00`).calendar("jalali").locale("fa").format("D MMMM YYYY");
}

function normalizeReminders(input: number[]) {
  const set = new Set<number>();
  for (const v of input) {
    if (!Number.isFinite(v)) continue;
    if (v <= 0) continue;
    if (v > 365 * 24 * 60) continue;
    set.add(Math.floor(v));
  }
  return Array.from(set).sort((a, b) => b - a);
}

export function MeetingDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit" | "view";
  initial: Partial<MeetingDto> & { date: string };
  onSaved?: (m: MeetingDto) => void;
  onDeleted?: (id: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [outcome, setOutcome] = useState("");
  const [reminders, setReminders] = useState<number[]>([]);
  const [alarmEnabled, setAlarmEnabled] = useState(true);

  const [customValue, setCustomValue] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<"day" | "hour" | "minute">("day");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dateIso = initial.date;
  const jalali = useMemo(() => jalaliLabel(dateIso), [dateIso]);

  const isReadOnly = mode === "view";
  const isEdit = mode === "edit";
  const canEdit = mode === "create" || mode === "edit";

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTitle(initial.title ?? "");
    setAllDay(initial.allDay ?? true);
    setStartTime((initial.startTime ?? "09:00").slice(0, 5));
    setEndTime((initial.endTime ?? "").slice(0, 5));
    setLocation(initial.location ?? "");
    setContent(initial.content ?? "");
    setOutcome(initial.outcome ?? "");
    setReminders(normalizeReminders((initial.reminderMinutesBefore ?? []) as number[]));
    setAlarmEnabled(initial.alarmEnabled ?? true);
  }, [open, initial]);

  const togglePreset = (minutes: number) => {
    setReminders((prev) => {
      const has = prev.includes(minutes);
      const next = has ? prev.filter((x) => x !== minutes) : [...prev, minutes];
      return normalizeReminders(next);
    });
  };

  const addCustom = () => {
    const v = Math.max(1, Math.floor(customValue || 1));
    const minutes = customUnit === "day" ? v * 24 * 60 : customUnit === "hour" ? v * 60 : v;
    setReminders((prev) => normalizeReminders([...prev, minutes]));
  };

  const removeReminder = (minutes: number) => {
    setReminders((prev) => prev.filter((x) => x !== minutes));
  };

  const submit = async () => {
    if (!canEdit) return;
    setErr(null);

    const t = title.trim();
    if (!t) {
      setErr("عنوان جلسه را وارد کن.");
      return;
    }

    if (!allDay) {
      if (!startTime || startTime.trim().length < 4) {
        setErr("برای جلسه غیر تمام‌روز، ساعت شروع لازم است.");
        return;
      }
    }

    const payload: MeetingDto = {
      id: initial.id ?? null,
      title: t,
      date: dateIso,
      allDay,
      startTime: allDay ? null : startTime.trim(),
      endTime: allDay ? null : (endTime.trim() ? endTime.trim() : null),
      location: location.trim() ? location.trim() : null,
      content: content.trim() ? content.trim() : null,
      outcome: outcome.trim() ? outcome.trim() : null,
      reminderMinutesBefore: reminders,
      alarmEnabled,
    };

    setSaving(true);
    try {
      const saved =
        mode === "create"
          ? await apiFetch<MeetingDto>("/api/meetings", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          : await apiFetch<MeetingDto>(`/api/meetings/${initial.id}`, {
              method: "PUT",
              body: JSON.stringify(payload),
            });

      onSaved?.(saved);
      onOpenChange(false);
    } catch (e: any) {
      setErr(e?.message || "خطا در ذخیره جلسه");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!isEdit || !initial.id) return;
    setErr(null);
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/meetings/${initial.id}`, { method: "DELETE" });
      onDeleted?.(initial.id);
      onOpenChange(false);
    } catch (e: any) {
      setErr(e?.message || "خطا در حذف جلسه");
    } finally {
      setDeleting(false);
    }
  };

  const headerTitle =
    mode === "create" ? "جلسه جدید" : mode === "edit" ? "ویرایش جلسه" : "جزئیات جلسه";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center justify-between gap-3">
            <span>{headerTitle}</span>
            <Badge variant="outline" className="rounded-xl bg-background/40 border-border/60 text-muted-foreground">
              {jalali}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-3 rounded-3xl border border-border/60 bg-background/30 overflow-hidden">
          <div className="p-4 bg-gradient-to-l from-primary/15 via-blue-500/10 to-violet-500/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>{jalali}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-xl bg-background/40 border-border/60",
                    allDay ? "text-emerald-600 dark:text-emerald-300" : "text-sky-600 dark:text-sky-300"
                  )}
                >
                  {allDay ? "تمام‌روز" : "ساعتی"}
                </Badge>
                <Badge variant="outline" className="rounded-xl bg-background/40 border-border/60 text-muted-foreground">
                  {dateIso}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {err ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-right">
                {err}
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground flex items-center justify-end gap-2">
                  <Sparkles className="h-4 w-4" />
                  عنوان جلسه
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: جلسه فروش / جلسه هفتگی"
                  disabled={isReadOnly}
                  className="rounded-2xl bg-background/40 border-border/60"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground flex items-center justify-end gap-2">
                  <MapPin className="h-4 w-4" />
                  مکان (اختیاری)
                </div>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="مثلاً: دفتر مرکزی / آنلاین"
                  disabled={isReadOnly}
                  className="rounded-2xl bg-background/40 border-border/60"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="h-4 w-4" />
                  زمان‌بندی
                </div>

                <label className={cn("flex items-center gap-2 text-sm", isReadOnly && "opacity-70")}
                  title="اگر تیک بخورد، ساعت نیاز نیست و یادآوری‌ها روی 09:00 محاسبه می‌شوند.">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    disabled={isReadOnly}
                    className="h-4 w-4 rounded border-border/60 accent-[color:var(--primary)]"
                  />
                  تمام‌روز
                </label>
              </div>

              {!allDay ? (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground text-right">شروع</div>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={isReadOnly}
                      className="rounded-2xl bg-background/40 border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground text-right">پایان (اختیاری)</div>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={isReadOnly}
                      className="rounded-2xl bg-background/40 border-border/60"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-muted-foreground text-right">
                  جلسه «تمام‌روز» است. (برای محاسبه یادآوری، ساعت 09:00 در نظر گرفته می‌شود)
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <NotebookPen className="h-4 w-4" />
                  یادداشت و نتیجه‌گیری
                </div>
                <Badge variant="outline" className="rounded-xl bg-background/40 border-border/60 text-muted-foreground">
                  قابل جستجو
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground text-right">محتوا / صورت جلسه</div>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="شرح کامل جلسه، نکات مطرح‌شده…"
                    className="min-h-[120px] rounded-2xl bg-background/40 border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground text-right">نتیجه‌گیری / اقدام‌ها</div>
                  <Textarea
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="جمع‌بندی، تصمیم‌ها، Action Items…"
                    className="min-h-[120px] rounded-2xl bg-background/40 border-border/60"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-foreground">یادآوری‌ها</div>
                <div className="text-xs text-muted-foreground">زمان ارسال قبل از شروع جلسه</div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground text-right">
                  آلارم اجباری همان‌روز + یادآوری‌های کاستوم
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={alarmEnabled}
                    onChange={(e) => setAlarmEnabled(e.target.checked)}
                    disabled={isReadOnly}
                    className="h-4 w-4 rounded border-border/60"
                  />
                  <span>آلارم فعال</span>
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                {PRESETS.map((p) => {
                  const active = reminders.includes(p.minutes);
                  return (
                    <button
                      key={p.minutes}
                      type="button"
                      disabled={isReadOnly || !alarmEnabled}
                      onClick={() => togglePreset(p.minutes)}
                      className={cn(
                        "h-9 px-3 rounded-2xl border text-xs transition",
                        active
                          ? "bg-primary/12 border-primary/25 text-foreground shadow-sm"
                          : "bg-background/30 border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={customValue}
                    onChange={(e) => setCustomValue(Number(e.target.value))}
                    disabled={isReadOnly || !alarmEnabled}
                    className="w-24 rounded-2xl bg-background/40 border-border/60"
                    min={1}
                  />

                  <div className="inline-flex rounded-2xl border border-border/60 bg-background/30 p-1 gap-1">
                    {(
                      [
                        { k: "day", label: "روز" },
                        { k: "hour", label: "ساعت" },
                        { k: "minute", label: "دقیقه" },
                      ] as const
                    ).map((u) => (
                      <button
                        key={u.k}
                        type="button"
                        disabled={isReadOnly || !alarmEnabled}
                        onClick={() => setCustomUnit(u.k)}
                        className={cn(
                          "h-8 px-3 rounded-xl text-xs border transition",
                          customUnit === u.k
                            ? "bg-primary/12 border-primary/25 text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60"
                        )}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isReadOnly || !alarmEnabled}
                    onClick={addCustom}
                    className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                  >
                    اضافه کن
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-right">
                  هر تعداد یادآوری می‌تونی داشته باشی (مثلاً ۲ روز + ۱ ساعت قبل)
                </div>
              </div>

              <Separator className="my-4 bg-border/60" />

              {!alarmEnabled ? (
                <div className="text-xs text-muted-foreground text-right leading-6">
                  آلارم خاموش است؛ هیچ یادآوری‌ای ارسال نمی‌شود (حتی اجباری همان‌روز).
                  {reminders.length > 0 ? " یادآوری‌های انتخاب‌شده ذخیره می‌مانند." : ""}
                </div>
              ) : reminders.length === 0 ? (
                <div className="text-xs text-muted-foreground text-right">یادآوری فعلاً تنظیم نشده است.</div>
              ) : (
                <div className="flex flex-wrap gap-2 justify-end">
                  {reminders.map((m) => (
                    <Badge
                      key={m}
                      variant="outline"
                      className="rounded-2xl bg-background/40 backdrop-blur border-border/60 text-foreground"
                    >
                      {humanizeMinutes(m)}
                      {!isReadOnly && alarmEnabled ? (
                        <button
                          type="button"
                          onClick={() => removeReminder(m)}
                          className="mr-2 inline-flex items-center justify-center rounded-full hover:bg-accent/60 p-1"
                          aria-label="remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          {isEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void doDelete()}
              disabled={deleting}
              className="rounded-2xl border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              {deleting ? "در حال حذف…" : "حذف"}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
          >
            بستن
          </Button>

          {canEdit ? (
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="rounded-2xl"
            >
              {saving ? "در حال ذخیره…" : "ذخیره"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
