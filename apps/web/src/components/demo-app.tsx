"use client";
import signIn from "./sign-in.module.css";
import { SignInCarousel } from "./sign-in-carousel";
import { RiskProvider, RiskContextBar, RiskOverview, useRiskContext } from "./risk-ui";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  LayoutDashboard,
  ChartNoAxesCombined,
  ScanLine,
  Layers3,
  Users,
  FileSearch,
  Upload,
  ClipboardCheck,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Calculator,
  Send,
  FolderCheck,
  Database,
  Settings,
  Bot,
  Bell,
  Mail,
  UserRound,
  LogOut,
  LockKeyhole,
  Eye,
  EyeOff,
  Check,
  Activity,
  LoaderCircle,
  Sparkles,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { api, command, ApiError, label } from "@/lib/api";
import { HIDDEN_ROUTES, WORKFLOW_ENABLED, hiddenByScope } from "@/lib/workflow-flags";
import type { User, Snapshot, Command } from "@/lib/types";
import { Dashboard } from "./dashboard";
import { AnalyticsWorkspace } from "./analytics-workspace";
import { Member360Workspace } from "./member360-workspace";
import { Workspaces } from "./workspaces";
import { FixtureAssistant } from "./fixture-assistant";
import { AiConfiguration } from "./ai-configuration";
import { Drawer, Empty, Modal, Notice } from "./shared";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 15000, refetchOnWindowFocus: false },
  },
});
export default function DemoApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Application />
        <Toaster position="top-right" offset={72} richColors closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
const routes: { group: string; items: [string, string, LucideIcon][] }[] = [
  {
    group: "Analytics",
    items: [
      ["overview", "Dashboard", LayoutDashboard],
      ["analytics", "Risk analytics", ChartNoAxesCombined],
      ["reports", "Reports", FileSearch],
    ],
  },
  {
    group: "Conditions",
    items: [
      ["suspects", "Suspected conditions", ScanLine],
      ...(WORKFLOW_ENABLED
        ? ([
            ["reviews", "Chart review", ClipboardCheck],
            ["qa", "Coding QA", ShieldCheck],
            ["campaigns", "Campaigns", Layers3],
            ["chase", "Chart chase", FileSearch],
            ["intake", "Document intake", Upload],
          ] as [string, string, LucideIcon][])
        : []),
    ],
  },
  {
    group: "Population",
    items: [
      ["member360", "Member 360", Users],
      ...(WORKFLOW_ENABLED
        ? ([
            ["providers", "Provider portfolio", Building2],
            ["previsit", "Pre-visit", CalendarCheck],
          ] as [string, string, LucideIcon][])
        : []),
    ],
  },
  {
    group: "Settings",
    items: [
      ...(WORKFLOW_ENABLED
        ? ([
            ["submissions", "Submissions", Send],
            ["audit", "Audit workspace", FolderCheck],
          ] as [string, string, LucideIcon][])
        : []),
      ["data", "Models & data", Database],
      ...(WORKFLOW_ENABLED ? ([["agents", "Agents", Bot]] as [string, string, LucideIcon][]) : []),
      ["admin", "Administration", Settings],
    ],
  },
];
function Brand({ full = false }: { full?: boolean }) {
  return (
    <div className={`brand${full ? " brand-full" : ""}`}>
      <span className={full ? "brand-wordmark" : "brand-mark"}>
        <img
          src={full ? "/brand/citiustech-wordmark.png" : "/brand/citiustech-mark.jpeg"}
          alt="CitiusTech"
          width={full ? 795 : 200}
          height={full ? 251 : 200}
        />
      </span>
      <span className="brand-product">Perform<span className="brand-plus">+</span></span>
    </div>
  );
}
function WorkspaceNavigation({ user, route }: { user: User; route: string }) {
  const risk = useRiskContext();
  const items = routes
    .filter((group) => group.group !== "Settings")
    .flatMap((group) => group.items)
    .filter(([id]) => id !== "reports" && id !== "member360" && user.screens.includes(id === "agents" ? "admin" : id === "member360" ? "members" : id) && !hiddenByScope(id));
  return (
    <nav id="workspace-navigation" className="workspace-nav" aria-label="Workspace navigation">
      {items.map(([id, title]) => (
        <Link key={id} href={id === "agents" ? "/admin/ai/agents" : risk.href(`/${id}`)}
          aria-current={route === id ? "page" : undefined}
          className="workspace-nav-link">
          {title}
        </Link>
      ))}
    </nav>
  );
}
function signInPath() {
  if (window.location.pathname === "/login") return window.location.pathname + window.location.search;
  const returnTo = window.location.pathname + window.location.search + window.location.hash;
  return `/login?${new URLSearchParams({ returnTo }).toString()}`;
}
function signInDestination(user: User) {
  const fallback = `/${user.screens.find(screen => !hiddenByScope(screen)) || (user.screens.includes("members") ? "member360" : "overview")}`;
  const location = window.location;
  const requested = location.pathname === "/login"
    ? new URLSearchParams(location.search).get("returnTo")
    : location.pathname + location.search + location.hash;
  if (!requested || !requested.startsWith("/") || requested.startsWith("//") || requested.includes("\\")) return fallback;
  try {
    const destination = new URL(requested, location.origin);
    const screen = destination.pathname.split("/")[1];
    const knownScreen = routes.some((group) => group.items.some(([id]) => id === screen));
    return destination.origin === location.origin && knownScreen && user.screens.includes(screen === "reports" ? "analytics" : screen === "member360" ? "members" : screen)
      ? destination.pathname + destination.search + destination.hash
      : fallback;
  } catch {
    return fallback;
  }
}
function Application() {
  const client = useQueryClient();
  const pathname = usePathname() || "/overview";
  const router = useRouter();
  const route = pathname.split("/")[1] || "overview";
  const [notifications, setNotifications] = useState(false);
  const [messages, setMessages] = useState(false);
  const [help, setHelp] = useState(false);
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<User>("/auth/session"),
  });
  useEffect(() => {
    const expired = () => {
      for (const key of Object.keys(sessionStorage))
        if (key.startsWith("ct-campaign-")) sessionStorage.removeItem(key);
      client.clear();
      client.setQueryData(["session"], null);
      router.replace(signInPath());
    };
    window.addEventListener("ct-session-expired", expired);
    return () => window.removeEventListener("ct-session-expired", expired);
  }, [client, router]);
  const user = session.data;
  const snapshot = useQuery({
    queryKey: ["snapshot", user?.id],
    queryFn: () => api<Snapshot>("/bootstrap"),
    enabled: !!user,
  });
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["snapshot"] }), client.invalidateQueries({ queryKey: ["risk"] })]);
  const act = async (body: Command) => {
    if (!user) return;
    try {
      const result = await command(body, user.csrf_token);
      toast.success(result.message);
      await refresh();
      await client.invalidateQueries({ queryKey: ["member"] });
      await client.invalidateQueries({ queryKey: ["members"] });
      await client.invalidateQueries({ queryKey: ["risk"] });
      return result;
    } catch (error) {
      toast.error((error as Error).message);
      if (error instanceof ApiError && error.status === 401) {
        client.clear();
        session.refetch();
      }
      throw error;
    }
  };
  const signout = async () => {
    try {
      await api("/auth/session", { method: "DELETE" }, user?.csrf_token);
      for (const key of Object.keys(sessionStorage))
        if (key.startsWith("ct-campaign-")) sessionStorage.removeItem(key);
      client.clear();
      router.replace(signInPath());
      session.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (session.isPending)
    return (
      <div className="initial-loading">
        <Brand />
        <LoaderCircle className="animate-spin" size={24} />
        <span>Opening your workspace…</span>
      </div>
    );
  if (!user)
    return (
      <Login
        onLogin={(u) => {
          client.clear();
          client.setQueryData(["session"], u);
          router.replace(signInDestination(u));
        }}
        apiError={
          session.error instanceof ApiError && session.error.status !== 401
            ? session.error.message
            : undefined
        }
      />
    );
  const actualRoute = route === "login" ? "overview" : route;
  return (
    <RiskProvider user={user}><div className="app-layout">
      <a className="app-skip-link" href="#main-content">Skip to main content</a>
      <header className="app-header">
        <div className="topbar">
          <div className="topbar-left">
            <Link aria-label="CitiusTech Perform+ workspace" href={user.screens.includes("overview") ? "/overview" : user.screens.includes("members") ? "/member360" : `/${user.screens.find(screen => !hiddenByScope(screen)) || "overview"}`}>
              <Brand full />
            </Link>
          </div>
          <div className="topbar-right">
            {snapshot.data && WORKFLOW_ENABLED && (
              <FixtureAssistant user={user} data={snapshot.data} act={act} />
            )}
            <div className="header-utilities" aria-label="Account controls">
              <span className="header-organization">Citiustech</span>
              <button className="header-utility-icon" aria-label="Messages" title="Messages" onClick={() => setMessages(true)}><Mail size={15} strokeWidth={1.6} /></button>
              <button className="header-utility-icon" aria-label="Notifications" title="Notifications" onClick={() => setNotifications(true)}><Bell size={15} fill="currentColor" strokeWidth={1.5} /></button>
              <button className="header-utility-icon header-help" aria-label="Workspace guide" title="Workspace guide" onClick={() => setHelp(true)}>?</button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="header-account" aria-label="Account menu">
                    <UserRound size={15} fill="currentColor" strokeWidth={1.5} />
                    <span>{user.name.replace(/ demo$/i, "")}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="profile-menu">
                  <DropdownMenuLabel>{user.name.replace(/ demo$/i, "")}<small>{user.email}</small></DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled><Shield size={14} />{label(user.role)}</DropdownMenuItem>
                  <DropdownMenuItem onClick={signout}><LogOut size={15} />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="header-utility-divider" aria-hidden="true">|</span>
              <button className="header-logout" onClick={signout}>Logout</button>
            </div>
          </div>
        </div>
        <WorkspaceNavigation user={user} route={pathname.startsWith('/admin/ai') ? 'agents' : actualRoute} />
      </header>
      <div className="main-shell">
        {!pathname.startsWith('/admin/ai') && !['overview','analytics','suspects','reports','scenarios','member360'].includes(actualRoute) && <RiskContextBar />}
        <main id="main-content" tabIndex={-1}
          className={`page-canvas route-${actualRoute} ${actualRoute === "reviews" && pathname.split("/")[2] ? "workbench-canvas" : ""}`}
        >
          {!user.screens.includes(actualRoute === "reports" ? "analytics" : actualRoute === "member360" ? "members" : actualRoute) || hiddenByScope(actualRoute) ? (
            <div className="access-denied">
              <LockKeyhole size={40} />
              <h1>{hiddenByScope(actualRoute) ? "This page is not available in this workspace" : "This workspace needs a different role"}</h1>
              <p>
                {hiddenByScope(actualRoute)
                  ? "This Perform+ deployment focuses on risk analytics and suspecting. Workflow workspaces remain available in the full product build."
                  : <>You’re signed in as {label(user.role)}. Your account can access{" "}
                {user.screens.filter((screen) => !HIDDEN_ROUTES.has(screen)).map(label).join(", ")}.</>}
              </p>
              <Button asChild>
                <Link href={`/${user.screens.find(screen => !hiddenByScope(screen)) || (user.screens.includes("members") ? "member360" : "overview")}`}>
                  Return to my workspace
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          ) : snapshot.isPending ? (
            <div className="page-skeleton">
              <div />
              <section />
              <section />
            </div>
          ) : snapshot.error ? (
            <div className="error-panel">
              <h2>Unable to load the workspace</h2>
              <p>{snapshot.error.message}</p>
              <Button onClick={() => snapshot.refetch()}>
                <RefreshCw size={16} />
                Try again
              </Button>
            </div>
          ) : snapshot.data ? (
            pathname.startsWith('/admin/ai') ? (hiddenByScope("agents") ? <Empty title="This page is not available in this workspace" description="Use Risk analytics or Reports to explore the available results." /> : <AiConfiguration key={user.id} user={user} />) : actualRoute === "member360" ? <Member360Workspace user={user} /> : ["overview","analytics","suspects","reports","scenarios"].includes(actualRoute) ? <AnalyticsWorkspace user={user} route={actualRoute} /> : actualRoute === "analytics" ? (
              <Dashboard
                data={snapshot.data}
                user={user}
                analytics={actualRoute === "analytics"}
              />
            ) : (
              <Workspaces
                route={actualRoute}
                path={pathname}
                user={user}
                data={snapshot.data}
                act={act}
                refresh={refresh}
              />
            )
          ) : null}
        </main>
        <footer className="app-footer">
          <span>© 2026 CitiusTech · Perform+</span>
          <button onClick={() => setHelp(true)}>
            Workspace guide <ArrowUpRight size={12} />
          </button>
        </footer>
      </div>
      <Modal open={messages} onOpenChange={setMessages} title="Messages" description="Your workspace messages.">
        <Empty title="No messages" description="You have no messages in this workspace." />
      </Modal>
      <Drawer
        open={notifications}
        onOpenChange={setNotifications}
        title="Workspace activity"
        description="Recent activity saved in this workspace."
      >
        {!snapshot.data?.events.length ? (
          <Empty
            title="Your activity starts here"
            description="Saved reports and recent activity will appear here."
          />
        ) : (
          <div className="timeline">
            {snapshot.data.events.map((e) => (
              <div key={e.id}>
                <span className="timeline-icon">
                  <Activity size={15} />
                </span>
                <strong>{label(e.action)}</strong>
                <p>{e.detail}</p>
                <small>
                  {label(e.actor.split("@")[0].replace(/\.demo$/, ""))} ·{" "}
                  {new Date(e.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
                {e.resource.startsWith("MB-") && (
                  <Link
                    href={`/members/${e.resource}`}
                    onClick={() => setNotifications(false)}
                  >
                    {e.resource}
                    <ArrowUpRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>
      <Modal
        open={help}
        onOpenChange={setHelp}
        title="Workspace guide"
        description="Explore risk scores, suspected conditions and revenue estimates."
      >
        <div className="tour-list">
          {[
            { href: '/overview', title: 'Risk scores and trends' },
            { href: '/analytics?view=geography', title: 'County and practice comparisons' },
            { href: '/suspects', title: 'Suspected conditions and evidence' },
            { href: '/analytics?view=financial', title: 'Revenue forecasts' },
            { href: '/reports', title: 'Reports and saved copies' },
          ].map((item, i) => (
            <Link href={item.href} onClick={() => setHelp(false)} key={item.href}>
              <span>0{i + 1}</span>{item.title}<ArrowRight size={15} />
            </Link>
          ))}
        </div>
        <Notice>
          <span>
            <strong>About this workspace.</strong> Reports bring together population scores and planning scenarios. Document quotes stay linked to their
            original sources. Rules find possible gaps; AI explanations help
            explain the evidence. Neither confirms a diagnosis or changes a medical record.
          </span>
        </Notice>
      </Modal>
    </div></RiskProvider>
  );
}
function Login({
  onLogin,
  apiError,
}: {
  onLogin: (u: User) => void;
  apiError?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usingLogin, setUsingLogin] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(
        await api<User>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={signIn.page}>
      <header className={signIn.masthead}>
        <Brand full />
      </header>
      <SignInCarousel pauseForLogin={usingLogin} />
      <section
        className={signIn.formSide}
        aria-labelledby="sign-in-heading"
        onFocusCapture={() => setUsingLogin(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setUsingLogin(false);
        }}
      >
        <div className={signIn.formWrap}>
          <h1 id="sign-in-heading">Welcome back</h1>
          <p className={signIn.intro}>Sign in to your Perform+ workspace.</p>
          <form onSubmit={submit}>
            <div className="form-field">
              <Label htmlFor="email">Email address</Label>
              <div className={signIn.inputField}>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="you@organization.com"
                  required
                />
              </div>
            </div>
            <div className="form-field">
              <Label htmlFor="password">Password</Label>
              <div className={`${signIn.inputField} ${signIn.passwordField}`}>
                <Input
                  id="password"
                  type={visible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            {(error || apiError) && (
              <div className="form-error" role="alert">
                {error || apiError}
              </div>
            )}
            <Button type="submit" disabled={busy} className={signIn.submit}>
              {busy ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <div className={signIn.providerPanel}>
            <p className={signIn.providerLabel} id="identity-provider-heading">Sign in with</p>
            <div className={signIn.identityProviders} role="group" aria-labelledby="identity-provider-heading">
              <img src="/identity/entra.svg" alt="Microsoft Entra" width={32} height={32} />
              <img src="/identity/okta-symbol.svg" alt="Okta" width={32} height={32} />
            </div>
          </div>
        </div>
        <p className={signIn.help}><strong>Need access?</strong>Your workspace administrator can help.</p>
      </section>
    </div>
  );
}
