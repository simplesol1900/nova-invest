import { useCallback, useEffect, useMemo, useState } from "react";
import {
  allocateSandboxInvestment,
  bootstrapAdmin,
  getAdminProfile,
  getAdminOverview,
  hasAdminSession,
  loginAdmin,
  logoutAdmin,
  reviewSandboxRequest,
  settleSandboxInvestment,
  updateSandboxKyc,
  type SandboxInvestment,
  type SandboxRequest,
  type UserProfile,
} from "./lib/api";

type View = "overview" | "requests" | "users" | "investments";
type IconName =
  | "activity"
  | "arrow"
  | "briefcase"
  | "check"
  | "clock"
  | "dashboard"
  | "logout"
  | "refresh"
  | "search"
  | "shield"
  | "users"
  | "wallet"
  | "x";

const MARKETS = [
  "NYSE / NASDAQ",
  "Tokyo Stock Exchange",
  "London Stock Exchange",
  "London Metal Exchange",
];
const ADMIN_EMAIL = "solution2026@gmail.com";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    activity: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
    refresh: <><path d="M20 11a8 8 0 1 0-2 5.5" /><path d="M20 4v7h-7" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    shield: <><path d="M12 3 4.5 6v5c0 4.8 3.2 8.2 7.5 10 4.3-1.8 7.5-5.2 7.5-10V6L12 3Z" /><path d="m9 12 2 2 4-5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    wallet: <><path d="M4 5h14a2 2 0 0 1 2 2v13H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M2 8h18M16 13h6v4h-6a2 2 0 0 1 0-4Z" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20">
        <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true">
          <polygon points="20,4 36,32 4,32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="20,14 28,28 12,28" fill="currentColor" opacity=".48" />
        </svg>
      </div>
      {!compact && (
        <div>
          <p className="text-sm font-extrabold tracking-[0.16em] text-white">NOVA INVEST</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Command Center</p>
        </div>
      )}
    </div>
  );
}

function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Enter a valid administrator email address.");
  }
  return normalized;
}

function Login({ onAuthenticated }: { onAuthenticated: (profile: UserProfile) => void }) {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const normalizedEmail = normalizeEmail(email);
      if (normalizedEmail !== ADMIN_EMAIL) {
        throw new Error("This account is not authorized for administrator access.");
      }
      await bootstrapAdmin();
      const profile = await loginAdmin(normalizedEmail, password);
      onAuthenticated(profile);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0c0d] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.13),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <section className="relative w-full max-w-[430px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#181a1d] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.55)] sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#24272b] text-emerald-400">
              <Icon name="shield" className="h-6 w-6" />
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-emerald-400">Administrator only</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Control center</h1>
            <p className="mt-2 text-sm leading-6 text-[#8d9299]">Enter your password to manage NOVA INVEST.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#b8bcc2]">Username / Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="username"
                className="h-12 w-full rounded-xl border border-white/10 bg-[#101214] px-4 text-sm font-semibold text-[#d9dce0] outline-none transition focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#b8bcc2]">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter administrator password"
                type="password"
                autoComplete="current-password"
                autoFocus
                className="h-12 w-full rounded-xl border border-white/10 bg-[#101214] px-4 text-sm text-white outline-none transition placeholder:text-[#555a61] focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
              />
            </label>
            {error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs font-semibold leading-5 text-rose-200">{error}</p>}
            <button
              disabled={loading || !password}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d7d9dc] text-sm font-extrabold text-[#111315] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#2a2d31] disabled:text-[#666b72]"
            >
              {loading ? "Verifying access…" : "Sign in"}
              {!loading && <Icon name="arrow" className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/8 pt-5 text-[11px] font-semibold text-[#666b72]">
            <Icon name="shield" className="h-3.5 w-3.5" />
            Protected administrator access
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4f5358]">NOVA INVEST operations</p>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = status === "approved" || status === "open"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
    : status === "rejected"
      ? "bg-rose-50 text-rose-700 ring-rose-600/10"
      : status === "settled"
        ? "bg-slate-100 text-slate-600 ring-slate-500/10"
        : "bg-amber-50 text-amber-700 ring-amber-600/10";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ring-inset ${styles}`}>{status.replace("_", " ")}</span>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon name="check" /></div>
      <p className="text-sm font-extrabold text-slate-800">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function AdminDashboard({ profile }: { profile: UserProfile }) {
  const [view, setView] = useState<View>("overview");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<SandboxRequest[]>([]);
  const [investments, setInvestments] = useState<SandboxInvestment[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [allocation, setAllocation] = useState({ userId: "", amount: "", market: MARKETS[0] });
  const [returns, setReturns] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await getAdminOverview();
      setProfiles(data.profiles);
      setRequests([...data.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setInvestments([...data.investments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setAllocation((current) => ({ ...current, userId: current.userId || data.profiles.find((item) => item.role !== "admin")?.id || "" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Admin data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, work: () => Promise<unknown>, success: string) {
    setBusyId(id);
    setMessage("");
    setError("");
    try {
      await work();
      setMessage(success);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The operation could not be completed.");
    } finally {
      setBusyId("");
    }
  }

  const filteredProfiles = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return profiles;
    return profiles.filter((item) => `${item.fullName} ${item.phone} ${item.referralCode}`.toLowerCase().includes(query));
  }, [profiles, search]);

  const pendingRequests = requests.filter((item) => item.status === "pending");
  const openInvestments = investments.filter((item) => item.status === "open");
  const approvedUsers = profiles.filter((item) => item.kycStatus === "approved").length;
  const allocatedCapital = openInvestments.reduce((total, item) => total + item.principal, 0);
  const memberProfiles = profiles.filter((item) => item.role !== "admin");

  const navigation: Array<{ id: View; label: string; icon: IconName; count?: number }> = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "requests", label: "Requests", icon: "wallet", count: pendingRequests.length },
    { id: "users", label: "Customers", icon: "users" },
    { id: "investments", label: "Investments", icon: "briefcase", count: openInvestments.length },
  ];

  async function logout() {
    await logoutAdmin();
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-950 px-4 py-6 lg:flex">
        <div className="px-2"><Logo /></div>
        <nav className="mt-10 flex-1 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${view === item.id ? "bg-emerald-400 text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {!!item.count && <span className={`rounded-full px-2 py-0.5 text-[10px] ${view === item.id ? "bg-slate-950 text-white" : "bg-white/10 text-slate-300"}`}>{item.count}</span>}
            </button>
          ))}
        </nav>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-xs font-black text-emerald-300">{profile.fullName.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{profile.fullName}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Administrator</p>
            </div>
            <button onClick={logout} aria-label="Sign out" className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"><Icon name="logout" className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-7xl items-center gap-4">
            <div className="lg:hidden"><Logo compact /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold capitalize text-slate-950">{view}</p>
              <p className="hidden text-xs text-slate-500 sm:block">Live operations for the NOVA INVEST sandbox</p>
            </div>
            <div className="relative hidden sm:block">
              <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" className="h-9 w-56 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium outline-none focus:border-emerald-400 focus:bg-white" />
            </div>
            <button onClick={load} disabled={loading} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-50">
              <Icon name="refresh" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={logout} className="rounded-lg border border-slate-200 p-2 text-slate-500 lg:hidden" aria-label="Sign out"><Icon name="logout" className="h-4 w-4" /></button>
          </div>
          <div className="mx-auto mt-3 flex max-w-7xl gap-1 overflow-x-auto lg:hidden">
            {navigation.map((item) => (
              <button key={item.id} onClick={() => setView(item.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${view === item.id ? "bg-slate-950 text-white" : "text-slate-500"}`}>{item.label}{item.count ? ` ${item.count}` : ""}</button>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {(message || error) && (
            <div className={`mb-6 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-xs font-semibold ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              <span>{error || message}</span>
              <button onClick={() => { setMessage(""); setError(""); }} aria-label="Dismiss"><Icon name="x" className="h-4 w-4" /></button>
            </div>
          )}

          {view === "overview" && (
            <>
              <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-600">Operations snapshot</p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight">Good day, {profile.fullName.split(" ")[0]}</h1>
                  <p className="mt-2 text-sm text-slate-500">Here is what needs attention across your investment network.</p>
                </div>
                <button onClick={() => setAllocationOpen(true)} className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white transition hover:bg-emerald-500 hover:text-slate-950">Allocate investment</button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total customers", value: memberProfiles.length, detail: `${approvedUsers} KYC approved`, icon: "users" as IconName },
                  { label: "Pending requests", value: pendingRequests.length, detail: "Awaiting review", icon: "clock" as IconName },
                  { label: "Open investments", value: openInvestments.length, detail: "Across global markets", icon: "briefcase" as IconName },
                  { label: "Allocated capital", value: `${allocatedCapital.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, detail: "TUSDT sandbox balance", icon: "activity" as IconName },
                ].map((item) => (
                  <section key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-bold text-slate-500">{item.label}</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-emerald-400"><Icon name={item.icon} className="h-4 w-4" /></div>
                    </div>
                    <p className="mt-5 font-mono text-3xl font-black tracking-tight">{item.value}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">{item.detail}</p>
                  </section>
                ))}
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div><p className="text-sm font-extrabold">Priority queue</p><p className="mt-0.5 text-xs text-slate-400">Requests that require a decision</p></div>
                    <button onClick={() => setView("requests")} className="text-xs font-extrabold text-emerald-600">View all</button>
                  </div>
                  {pendingRequests.length === 0 ? <EmptyState title="Queue cleared" detail="There are no pending deposit or withdrawal requests." /> : pendingRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${request.type === "deposit" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}><Icon name="wallet" className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{request.userName}</p><p className="mt-0.5 truncate text-xs capitalize text-slate-400">{request.type} · {request.detail || "No reference"}</p></div>
                      <div className="text-right"><p className="font-mono text-sm font-black">{request.amount.toLocaleString()} TUSDT</p><p className="mt-0.5 text-[10px] text-slate-400">{new Date(request.createdAt).toLocaleDateString()}</p></div>
                    </div>
                  ))}
                </section>

                <section className="overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/30">
                  <div className="flex items-center justify-between"><p className="text-sm font-extrabold">Admin referral</p><Icon name="shield" className="h-5 w-5 text-emerald-400" /></div>
                  <p className="mt-8 font-mono text-2xl font-black tracking-[0.16em] text-emerald-400">{profile.referralCode}</p>
                  <p className="mt-3 text-xs leading-5 text-slate-400">Use this generated code when onboarding the next authorized member. Referral codes are unique to each account.</p>
                  <button onClick={() => navigator.clipboard.writeText(profile.referralCode)} className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-extrabold text-white transition hover:bg-white/10">Copy referral code</button>
                </section>
              </div>
            </>
          )}

          {view === "requests" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:flex sm:items-center sm:justify-between">
                <div><h1 className="text-xl font-black">Funding requests</h1><p className="mt-1 text-xs text-slate-500">Approve deposits and Binance-only withdrawals after verification.</p></div>
                <StatusBadge status={`${pendingRequests.length} pending`} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Request</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Decision</th></tr></thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id} className="border-t border-slate-100">
                        <td className="px-5 py-4"><p className="text-sm font-bold">{request.userName}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(request.createdAt).toLocaleString()}</p></td>
                        <td className="px-5 py-4"><p className="text-xs font-bold capitalize">{request.type}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-400">{request.detail || "No reference supplied"}</p></td>
                        <td className="px-5 py-4 font-mono text-sm font-black">{request.amount.toLocaleString()} TUSDT</td>
                        <td className="px-5 py-4"><StatusBadge status={request.status} /></td>
                        <td className="px-5 py-4">
                          {request.status === "pending" ? <div className="flex justify-end gap-2">
                            <button disabled={!!busyId} onClick={() => act(request.id, () => reviewSandboxRequest(request.id, "rejected"), "Request rejected.")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-extrabold text-rose-600 disabled:opacity-40">Reject</button>
                            <button disabled={!!busyId} onClick={() => act(request.id, () => reviewSandboxRequest(request.id, "approved"), "Request approved and ledger updated.")} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-extrabold text-slate-950 disabled:opacity-40">{busyId === request.id ? "Working…" : "Approve"}</button>
                          </div> : <p className="text-right text-xs text-slate-400">Completed</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!requests.length && <EmptyState title="No requests yet" detail="Customer funding requests will appear here." />}
              </div>
            </section>
          )}

          {view === "users" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5"><h1 className="text-xl font-black">Customer directory</h1><p className="mt-1 text-xs text-slate-500">{filteredProfiles.length} profiles connected to NOVA INVEST.</p></div>
              <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProfiles.map((item) => (
                  <article key={item.id} className="bg-white p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-emerald-400">{item.fullName.slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{item.fullName}</p><p className="mt-1 truncate text-xs text-slate-400">{item.phone}</p></div>
                      <StatusBadge status={item.kycStatus} />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                      <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Referral code</p><p className="mt-1 font-mono text-xs font-bold">{item.referralCode}</p></div>
                      <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Role</p><p className="mt-1 text-xs font-bold capitalize">{item.role}</p></div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {item.kycStatus !== "approved" && <button disabled={!!busyId} onClick={() => act(item.id, () => updateSandboxKyc(item.id, "approved"), "KYC status approved.")} className="flex-1 rounded-lg bg-emerald-400 py-2 text-xs font-extrabold text-slate-950 disabled:opacity-40">Approve KYC</button>}
                      {item.kycStatus === "approved" && <button disabled={!!busyId} onClick={() => act(item.id, () => updateSandboxKyc(item.id, "pending"), "KYC status returned to pending.")} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-extrabold text-slate-600 disabled:opacity-40">Return to review</button>}
                      {item.kycStatus !== "rejected" && <button disabled={!!busyId} onClick={() => act(item.id, () => updateSandboxKyc(item.id, "rejected"), "KYC status rejected.")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-extrabold text-rose-600 disabled:opacity-40">Reject</button>}
                    </div>
                  </article>
                ))}
              </div>
              {!filteredProfiles.length && <EmptyState title="No customers found" detail="Try a different name, phone number, or referral code." />}
            </section>
          )}

          {view === "investments" && (
            <>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div><h1 className="text-2xl font-black">Investment allocations</h1><p className="mt-1 text-xs text-slate-500">Deploy test balances to supported market pools and post returns.</p></div>
                <button onClick={() => setAllocationOpen(true)} className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-extrabold text-white">New allocation</button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {investments.map((investment) => {
                  const user = profiles.find((item) => item.id === investment.userId);
                  return (
                    <article key={investment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-emerald-400"><Icon name="briefcase" className="h-4 w-4" /></div><div><p className="text-sm font-extrabold">{user?.fullName || "Customer"}</p><p className="mt-0.5 text-xs text-slate-400">{investment.market}</p></div></div>
                        <StatusBadge status={investment.status} />
                      </div>
                      <div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-5">
                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Principal</p><p className="mt-1 font-mono text-2xl font-black">{investment.principal.toLocaleString()} <span className="text-xs text-slate-400">TUSDT</span></p></div>
                        <p className="text-[10px] text-slate-400">{new Date(investment.createdAt).toLocaleDateString()}</p>
                      </div>
                      {investment.status === "open" && <div className="mt-5 flex gap-2">
                        <input value={returns[investment.id] || ""} onChange={(event) => setReturns((current) => ({ ...current, [investment.id]: event.target.value.replace(/[^\d.-]/g, "") }))} placeholder="Profit or loss" inputMode="decimal" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs outline-none focus:border-emerald-400" />
                        <button disabled={!!busyId || returns[investment.id] === undefined || returns[investment.id] === ""} onClick={() => act(investment.id, () => settleSandboxInvestment(investment.id, Number(returns[investment.id])), "Investment settled and return posted.")} className="rounded-lg bg-emerald-400 px-4 text-xs font-extrabold text-slate-950 disabled:opacity-40">{busyId === investment.id ? "Posting…" : "Settle"}</button>
                      </div>}
                    </article>
                  );
                })}
              </div>
              {!investments.length && <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState title="No investments yet" detail="Create the first customer allocation to begin tracking performance." /></div>}
            </>
          )}
        </main>
      </div>

      {allocationOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.currentTarget === event.target && setAllocationOpen(false)}>
          <section className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-600">New position</p><h2 className="mt-2 text-2xl font-black">Allocate investment</h2></div><button onClick={() => setAllocationOpen(false)} className="rounded-lg bg-slate-100 p-2 text-slate-500"><Icon name="x" className="h-4 w-4" /></button></div>
            <div className="mt-7 space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Customer</span><select value={allocation.userId} onChange={(event) => setAllocation((current) => ({ ...current, userId: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-400">{memberProfiles.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.referralCode}</option>)}</select></label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Amount in TUSDT</span><input value={allocation.amount} onChange={(event) => setAllocation((current) => ({ ...current, amount: event.target.value.replace(/[^\d.]/g, "") }))} inputMode="decimal" placeholder="0.00" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-sm outline-none focus:border-emerald-400" /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Market pool</span><select value={allocation.market} onChange={(event) => setAllocation((current) => ({ ...current, market: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-400">{MARKETS.map((market) => <option key={market}>{market}</option>)}</select></label>
            </div>
            <div className="mt-7 flex gap-3"><button onClick={() => setAllocationOpen(false)} className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-extrabold text-slate-600">Cancel</button><button disabled={!!busyId || !allocation.userId || !Number(allocation.amount)} onClick={() => act("allocation", () => allocateSandboxInvestment(allocation.userId, Number(allocation.amount), allocation.market), "Investment allocated successfully.").then(() => { setAllocationOpen(false); setAllocation((current) => ({ ...current, amount: "" })); })} className="h-11 flex-1 rounded-xl bg-slate-950 text-sm font-extrabold text-white disabled:opacity-40">{busyId === "allocation" ? "Allocating…" : "Confirm allocation"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      if (!hasAdminSession()) {
        if (active) setCheckingSession(false);
        return;
      }
      try {
        const currentProfile = await getAdminProfile();
        if (currentProfile.role !== "admin") {
          await logoutAdmin();
        } else if (active) {
          setProfile(currentProfile);
        }
      } catch {
        await logoutAdmin();
      } finally {
        if (active) setCheckingSession(false);
      }
    }
    restore();
    return () => { active = false; };
  }, []);

  if (checkingSession) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" aria-label="Checking session" /></main>;
  }
  return profile ? <AdminDashboard profile={profile} /> : <Login onAuthenticated={setProfile} />;
}
