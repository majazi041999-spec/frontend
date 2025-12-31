import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CalendarDays, BellRing, ListTodo } from "lucide-react";

export function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("admin@taskchi.local");
  const [password, setPassword] = useState("admin1234");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (ex: any) {
      setErr(ex?.message || "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg relative flex items-center justify-center p-6 overflow-hidden">
      {/* Watermark / Left brand layer */}
      <div className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 hidden xl:block z-0">
        <div className="text-[140px] leading-none font-semibold tracking-tight text-zinc-50/5 select-none">
          Taskchi
        </div>
        <div className="mt-3 text-sm text-zinc-200/15 select-none">
          تقویم شمسی • تسک • تیم
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl 2xl:max-w-[1480px] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Left hero panel */}
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-[32px] border border-zinc-800/60 bg-zinc-950/25 backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.45)] p-10">
            {/* Decorative gradients */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
              <div className="absolute top-10 -right-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 border border-zinc-800/70 bg-zinc-950/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,.6)]" />
                  <span className="text-sm text-zinc-200">Taskchi Workspace</span>
                </div>

                <Badge className="bg-zinc-950/40 border border-zinc-800 text-zinc-200 rounded-xl">
                  v0.1
                </Badge>
              </div>

              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-50 leading-snug">
                مدیریت تسک‌ها + تقویم شمسی،
                <br />
                ساده برای استفاده، حرفه‌ای در نتیجه
              </h2>

              <p className="mt-3 text-sm text-zinc-400 leading-6 max-w-md">
                برای تیم‌های کوچک: ارجاع شفاف، سوابق دقیق، و اعلان‌های داخل سیستم.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
                <Feature icon={<CalendarDays size={18} />} text="تقویم جلالی" />
                <Feature icon={<BellRing size={18} />} text="اعلان داخل سیستم" />
                <Feature icon={<ListTodo size={18} />} text="کارها و وضعیت‌ها" />
                <Feature icon={<CheckCircle2 size={18} />} text="سوابق انجام کار" />
              </div>

              <div className="mt-8 rounded-3xl border border-zinc-800/60 bg-zinc-950/20 p-6">
                <Illustration />
              </div>
            </div>
          </div>
        </div>

        {/* Right login */}
        <div className="w-full max-w-md lg:max-w-none lg:justify-self-end">
          <div className="mb-6 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 border border-zinc-800/70 bg-zinc-950/30 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,.6)]" />
              <span className="text-sm text-zinc-200">Taskchi</span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-50 leading-tight">
              ورود به پنل مدیریت تسک
            </h1>
            <p className="mt-2 text-sm text-zinc-400">فقط وارد شو و شروع کن.</p>
          </div>

          <Card className="rounded-3xl border-zinc-800/70 bg-zinc-950/35 backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-50">ورود</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">ایمیل</Label>
                  <Input
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="h-11 rounded-2xl bg-zinc-950/25 border-zinc-800 focus-visible:ring-0 focus-visible:border-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">رمز عبور</Label>
                  <Input
                    dir="ltr"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 rounded-2xl bg-zinc-950/25 border-zinc-800 focus-visible:ring-0 focus-visible:border-zinc-600"
                  />
                </div>

                {err && (
                  <div className="text-sm text-red-200 bg-red-950/30 border border-red-900/60 rounded-2xl px-3 py-2">
                    {err}
                  </div>
                )}

                <Button
                  disabled={loading}
                  className="w-full h-11 rounded-2xl font-medium
                  bg-gradient-to-r from-emerald-400/90 to-cyan-300/90 text-zinc-950
                  hover:from-emerald-400 hover:to-cyan-300
                  shadow-[0_12px_40px_rgba(16,185,129,0.22)]"
                >
                  {loading ? "در حال ورود..." : "ورود"}
                </Button>

                <div className="text-xs text-zinc-500 text-center">
                  اگر یوزر/پسورد نداری، از ادمین شرکت بگیر.
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/60 bg-zinc-950/20 px-3 py-2">
      <div className="text-emerald-200/90">{icon}</div>
      <div className="text-sm text-zinc-200">{text}</div>
    </div>
  );
}

function Illustration() {
  return (
    <svg viewBox="0 0 640 220" className="w-full h-auto">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(16,185,129,0.9)" />
          <stop offset="1" stopColor="rgba(34,211,238,0.85)" />
        </linearGradient>
      </defs>

      <rect
        x="0"
        y="0"
        width="640"
        height="220"
        rx="22"
        fill="rgba(9,9,11,0.4)"
        stroke="rgba(63,63,70,0.7)"
      />

      <rect
        x="38"
        y="36"
        width="190"
        height="150"
        rx="18"
        fill="rgba(24,24,27,0.6)"
        stroke="rgba(63,63,70,0.8)"
      />
      <rect x="38" y="36" width="190" height="34" rx="18" fill="rgba(63,63,70,0.35)" />
      <circle cx="78" cy="53" r="6" fill="url(#g)" />
      <circle cx="110" cy="53" r="6" fill="url(#g)" />

      <g fill="rgba(244,244,245,0.10)">
        {Array.from({ length: 18 }).map((_, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          return (
            <rect key={i} x={60 + col * 26} y={86 + row * 26} width="18" height="18" rx="6" />
          );
        })}
      </g>

      <path
        d="M86 140l14 14 32-36"
        stroke="url(#g)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <rect
        x="270"
        y="54"
        width="332"
        height="34"
        rx="14"
        fill="rgba(24,24,27,0.6)"
        stroke="rgba(63,63,70,0.8)"
      />
      <rect
        x="270"
        y="102"
        width="332"
        height="34"
        rx="14"
        fill="rgba(24,24,27,0.55)"
        stroke="rgba(63,63,70,0.8)"
      />
      <rect
        x="270"
        y="150"
        width="332"
        height="34"
        rx="14"
        fill="rgba(24,24,27,0.5)"
        stroke="rgba(63,63,70,0.8)"
      />

      <circle cx="292" cy="71" r="8" fill="url(#g)" />
      <circle cx="292" cy="119" r="8" fill="rgba(244,244,245,0.18)" />
      <circle cx="292" cy="167" r="8" fill="rgba(244,244,245,0.18)" />

      <rect x="310" y="63" width="220" height="14" rx="7" fill="rgba(244,244,245,0.16)" />
      <rect x="310" y="111" width="180" height="14" rx="7" fill="rgba(244,244,245,0.12)" />
      <rect x="310" y="159" width="260" height="14" rx="7" fill="rgba(244,244,245,0.10)" />

      <circle cx="590" cy="50" r="10" fill="rgba(24,24,27,0.7)" stroke="rgba(63,63,70,0.8)" />
      <circle cx="590" cy="50" r="5" fill="url(#g)" />
    </svg>
  );
}
