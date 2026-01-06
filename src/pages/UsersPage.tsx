import {useEffect, useMemo, useState} from "react";
import {
    KeyRound,
    Loader2,
    Lock,
    Plus,
    RefreshCcw,
    Search,
    ShieldCheck,
    UserCheck,
    UserCog,
    UserX,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Separator} from "@/components/ui/separator";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";

import {apiFetch} from "@/lib/api";
import {useAuth} from "@/features/auth/auth";
import {ConfirmDialog} from "@/components/common/ConfirmDialog";

type Role = "ADMIN" | "STAFF";

type AdminUserView = {
    id: number;
    fullName: string;
    email: string;
    role: Role;
    active: boolean;
    managerId?: number | null;
};

type CreateUserResponse = {
    user: AdminUserView;
    initialPassword: string;
};

type ResetPasswordResponse = { newPassword: string };

export default function UsersPage() {
    const {user} = useAuth();
    const isAdmin = !!user?.roles?.includes("ROLE_ADMIN");

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [users, setUsers] = useState<AdminUserView[]>([]);

    const [q, setQ] = useState("");

    // Create
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [cFullName, setCFullName] = useState("");
    const [cEmail, setCEmail] = useState("");
    const [cRole, setCRole] = useState<Role>("STAFF");
    const [createResult, setCreateResult] = useState<{ user: AdminUserView; password: string } | null>(null);

    // Reset password
    const [resetOpen, setResetOpen] = useState(false);
    const [resetFor, setResetFor] = useState<AdminUserView | null>(null);
    const [resetPwd, setResetPwd] = useState<string>("");

    // Manager
    const [mgrOpen, setMgrOpen] = useState(false);
    const [mgrFor, setMgrFor] = useState<AdminUserView | null>(null);
    const [mgrId, setMgrId] = useState<number | "">("");
    const [mgrSaving, setMgrSaving] = useState(false);

    //Confirm
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState("");
    const [confirmDesc, setConfirmDesc] = useState<string | undefined>(undefined);
    const [confirmAction, setConfirmAction] = useState<(() => void | Promise<void>) | null>(null);

    const load = async () => {
        if (!isAdmin) return;
        setLoading(true);
        setErr(null);
        try {
            const list = await apiFetch<AdminUserView[]>("/api/admin/users", {method: "GET"});
            setUsers(Array.isArray(list) ? list : []);
        } catch (e: any) {
            setErr(e?.message || "خطا در دریافت کاربران");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const byId = useMemo(() => {
        const m = new Map<number, AdminUserView>();
        for (const u of users) m.set(u.id, u);
        return m;
    }, [users]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return users;
        return users.filter((u) => `${u.fullName} ${u.email} ${u.role}`.toLowerCase().includes(qq));
    }, [users, q]);

    const openCreate = () => {
        setCreateResult(null);
        setCFullName("");
        setCEmail("");
        setCRole("STAFF");
        setCreateOpen(true);
    };

    const create = async () => {
        const fullName = cFullName.trim();
        const email = cEmail.trim();
        if (!fullName || !email) return;

        setCreating(true);
        setErr(null);
        try {
            const res = await apiFetch<CreateUserResponse>("/api/admin/users", {
                method: "POST",
                body: JSON.stringify({fullName, email, role: cRole}),
            });

            setUsers((prev) => [res.user, ...prev]);
            setCreateResult({user: res.user, password: res.initialPassword});
        } catch (e: any) {
            setErr(e?.message || "خطا در ایجاد کاربر");
        } finally {
            setCreating(false);
        }
    };

    const setActive = async (u: AdminUserView, active: boolean) => {
        try {
            await apiFetch<void>(`/api/admin/users/${u.id}/activate`, {
                method: "PATCH",
                body: JSON.stringify({active}),
            });
            setUsers((prev) => prev.map((x) => (x.id === u.id ? {...x, active} : x)));
        } catch {
            // ignore
        }
    };

    const resetPassword = async (u: AdminUserView) => {
        try {
            const res = await apiFetch<ResetPasswordResponse>(`/api/admin/users/${u.id}/reset-password`, {
                method: "PATCH",
            });
            setResetFor(u);
            setResetPwd(res.newPassword);
            setResetOpen(true);
        } catch {
            // ignore
        }
    };

    const openManager = (u: AdminUserView) => {
        setMgrFor(u);
        setMgrId(typeof u.managerId === "number" ? u.managerId : "");
        setMgrOpen(true);
    };

    const saveManager = async () => {
        if (!mgrFor) return;
        setMgrSaving(true);
        try {
            await apiFetch<void>(`/api/admin/users/${mgrFor.id}/manager`, {
                method: "PATCH",
                body: JSON.stringify({managerId: mgrId === "" ? null : mgrId}),
            });

            setUsers((prev) =>
                prev.map((x) => (x.id === mgrFor.id ? {...x, managerId: mgrId === "" ? null : (mgrId as number)} : x))
            );
            setMgrOpen(false);
        } catch {
            // ignore
        } finally {
            setMgrSaving(false);
        }
    };

    const askConfirm = (title: string, desc: string | undefined, action: () => void | Promise<void>) => {
        setConfirmTitle(title);
        setConfirmDesc(desc);
        setConfirmAction(() => action);
        setConfirmOpen(true);
    };

    if (!isAdmin) {
        return (
            <Card className="glass">
                <CardHeader>
                    <CardTitle className="flex items-center justify-end gap-2">
                        <Lock className="h-5 w-5"/>
                        مدیریت کاربران
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-right text-sm text-muted-foreground">
                    این بخش فقط برای مدیر سیستم (ADMIN) فعال است.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-right">
                    <div className="text-xl font-semibold">کاربران</div>
                    <div className="text-sm text-muted-foreground">ایجاد کاربر، تعیین مدیر، فعال/غیرفعال، ریست پسورد
                    </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                    <Button
                        variant="outline"
                        onClick={() => void load()}
                        className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                    >
                        <RefreshCcw className="h-4 w-4 ml-2"/>
                        رفرش
                    </Button>
                    <Button onClick={openCreate} className="rounded-2xl">
                        <Plus className="h-4 w-4 ml-2"/>
                        کاربر جدید
                    </Button>
                </div>
            </div>

            <Card className="glass">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-right">لیست کاربران</CardTitle>
                        <div className="relative w-full sm:w-[360px]">
                            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"/>
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…"
                                   className="pl-10 rounded-2xl"/>
                        </div>
                    </div>
                </CardHeader>

                <Separator/>

                <CardContent className="pt-4">
                    {err ? (
                        <div
                            className="mb-3 text-sm text-rose-600 dark:text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-3 py-2 text-right">
                            {err}
                        </div>
                    ) : null}

                    <div className="rounded-2xl border bg-card/40">
                        <ScrollArea className="h-[560px]">
                            <div className="p-3 space-y-2">
                                {loading ? (
                                    <div
                                        className="text-sm text-muted-foreground py-10 text-center inline-flex items-center gap-2 justify-center">
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                        در حال دریافت…
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="text-sm text-muted-foreground py-10 text-center">کاربری پیدا
                                        نشد.</div>
                                ) : (
                                    filtered.map((u) => {
                                        const managerName =
                                            typeof u.managerId === "number" ? byId.get(u.managerId)?.fullName || `#${u.managerId}` : "—";

                                        return (
                                            <div key={u.id} className="rounded-2xl border bg-background/40 p-3">
                                                <div
                                                    className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0 text-right">
                                                        <div
                                                            className="text-sm font-semibold truncate">{u.fullName}</div>
                                                        <div
                                                            className="text-xs text-muted-foreground mt-1 truncate">{u.email}</div>

                                                        <div className="mt-2 flex flex-wrap gap-2 justify-end">
                                                            <Badge variant="outline"
                                                                   className="rounded-xl bg-background/40 backdrop-blur border-border/60">
                                                                {u.role === "ADMIN" ? (
                                                                    <span className="inline-flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5"/> ADMIN
                                  </span>
                                                                ) : (
                                                                    "STAFF"
                                                                )}
                                                            </Badge>

                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    u.active
                                                                        ? "rounded-xl bg-emerald-500/10 border-emerald-500/25 text-foreground"
                                                                        : "rounded-xl bg-rose-500/10 border-rose-500/25 text-foreground"
                                                                }
                                                            >
                                                                {u.active ? (
                                                                    <span className="inline-flex items-center gap-1">
                                    <UserCheck className="h-3.5 w-3.5"/> فعال
                                  </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1">
                                    <UserX className="h-3.5 w-3.5"/> غیرفعال
                                  </span>
                                                                )}
                                                            </Badge>

                                                            <Badge variant="outline"
                                                                   className="rounded-xl bg-background/40 backdrop-blur border-border/60 text-muted-foreground">
                                                                مدیر: {managerName}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 flex items-end flex-col gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                                                            onClick={() => openManager(u)}
                                                        >
                                                            <UserCog className="h-4 w-4 ml-2"/>
                                                            تعیین مدیر
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                                                            onClick={() =>
                                                                askConfirm(
                                                                    u.active ? "غیرفعال‌سازی کاربر" : "فعال‌سازی کاربر",
                                                                    u.active ? `مطمئنی می‌خوای کاربر «${u.fullName}» غیرفعال بشه؟` : `کاربر «${u.fullName}» فعال بشه؟`,
                                                                    () => setActive(u, !u.active)
                                                                )
                                                            }
                                                        >
                                                            {u.active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                                                        </Button>

                                                        <Button
                                                            variant="destructive"
                                                            onClick={() =>
                                                                askConfirm(
                                                                    "حذف کاربر",
                                                                    `مطمئنی می‌خوای کاربر «${u.fullName}» حذف/غیرفعال بشه؟`,
                                                                    async () => {
                                                                        await apiFetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
                                                                        setUsers(prev => prev.filter(x => x.id !== u.id)); // یا دوباره fetchUsers()
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            حذف
                                                        </Button>


                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="rounded-2xl border-border/60 bg-background/40 backdrop-blur hover:bg-accent/60"
                                                            onClick={() =>
                                                                askConfirm(
                                                                    "ریست پسورد",
                                                                    `مطمئنی می‌خوای پسورد کاربر «${u.fullName}» ریست بشه؟`,
                                                                    () => resetPassword(u)
                                                                )
                                                            }

                                                        >
                              <span className="inline-flex items-center gap-2">
                                <RefreshCcw className="h-4 w-4"/>
                                ریست پسورد
                              </span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            {/* Create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-[720px]">
                    <DialogHeader className="text-right">
                        <DialogTitle className="flex items-center justify-end gap-2">
                            <KeyRound className="h-5 w-5 text-primary"/>
                            ایجاد کاربر جدید
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 text-right">
                                <Label>نام و نام خانوادگی</Label>
                                <Input value={cFullName} onChange={(e) => setCFullName(e.target.value)}
                                       placeholder="مثلاً: محمد…"/>
                            </div>
                            <div className="space-y-2 text-right">
                                <Label>ایمیل (username)</Label>
                                <Input value={cEmail} onChange={(e) => setCEmail(e.target.value)}
                                       placeholder="name@company.com"/>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 text-right">
                                <Label>نقش</Label>
                                <select
                                    value={cRole}
                                    onChange={(e) => setCRole(e.target.value as Role)}
                                    className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                                >
                                    <option value="STAFF">STAFF</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <div className="text-right text-xs text-muted-foreground leading-6 flex items-center">
                                پسورد اولیه به صورت خودکار توسط سیستم ساخته می‌شود.
                            </div>
                        </div>

                        {createResult ? (
                            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-right">
                                <div className="text-sm font-semibold">کاربر ساخته شد ✅</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    ایمیل: {createResult.user.email} • نقش: {createResult.user.role}
                                </div>
                                <div className="mt-2 text-sm">
                                    <span className="text-muted-foreground">پسورد اولیه: </span>
                                    <span className="font-mono">{createResult.password}</span>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">این مقدار را برای کاربر ارسال کن.
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="rounded-2xl" onClick={() => setCreateOpen(false)}
                                disabled={creating}>
                            بستن
                        </Button>
                        <Button
                            className="rounded-2xl"
                            onClick={create}
                            disabled={creating || !cFullName.trim() || !cEmail.trim()}
                        >
                            {creating ? (
                                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin"/>
                  در حال ایجاد…
                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4"/>
                  ایجاد
                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset password dialog */}
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogContent className="max-w-[520px]">
                    <DialogHeader className="text-right">
                        <DialogTitle className="flex items-center justify-end gap-2">
                            <KeyRound className="h-5 w-5 text-primary"/>
                            پسورد جدید
                        </DialogTitle>
                    </DialogHeader>

                    <div className="text-right space-y-2">
                        <div className="text-sm text-muted-foreground">کاربر: {resetFor?.fullName || "—"}</div>
                        <div
                            className="rounded-2xl border bg-background/40 p-3 font-mono text-center text-base">{resetPwd}</div>
                        <div className="text-xs text-muted-foreground">این مقدار را برای کاربر ارسال کن.</div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="rounded-2xl" onClick={() => setResetOpen(false)}>
                            بستن
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manager dialog */}
            <Dialog open={mgrOpen} onOpenChange={setMgrOpen}>
                <DialogContent className="max-w-[560px]">
                    <DialogHeader className="text-right">
                        <DialogTitle className="flex items-center justify-end gap-2">
                            <UserCog className="h-5 w-5 text-primary"/>
                            تعیین مدیر
                        </DialogTitle>
                    </DialogHeader>

                    <div className="text-right space-y-3">
                        <div className="text-sm text-muted-foreground">
                            کاربر: <span className="text-foreground">{mgrFor?.fullName || "—"}</span>
                        </div>

                        <div className="space-y-2">
                            <Label>مدیر</Label>
                            <select
                                value={mgrId}
                                onChange={(e) => setMgrId(e.target.value ? Number(e.target.value) : "")}
                                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                            >
                                <option value="">— بدون مدیر —</option>
                                {users
                                    .filter((u) => u.active !== false)
                                    .filter((u) => (mgrFor ? u.id !== mgrFor.id : true))
                                    .map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.fullName} ({u.role})
                                        </option>
                                    ))}
                            </select>
                            <div className="text-xs text-muted-foreground leading-6">
                                نکته: سیستم از ایجاد حلقه در ساختار سلسله‌مراتب جلوگیری می‌کند.
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => setMgrOpen(false)}
                            disabled={mgrSaving}
                        >
                            بستن
                        </Button>
                        <Button className="rounded-2xl" onClick={saveManager} disabled={mgrSaving || !mgrFor}>
                            {mgrSaving ? (
                                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin"/>
                  در حال ذخیره…
                </span>
                            ) : (
                                "ذخیره"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
