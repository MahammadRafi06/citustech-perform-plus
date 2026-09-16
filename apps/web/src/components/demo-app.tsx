"use client";
import signIn from "./sign-in.module.css";
import { SignInCarousel } from "./sign-in-carousel";
import { RiskProvider, RiskContextBar, RiskOverview, useRiskContext } from "./risk-ui";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
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
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  LockKeyhole,
  Eye,
  EyeOff,
  Check,
  Activity,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  RefreshCw,
  Shield,
  HelpCircle,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { api, command, ApiError, label } from "@/lib/api";
import { HIDDEN_ROUTES, WORKFLOW_ENABLED, hiddenByScope } from "@/lib/workflow-flags";
import type { User, Snapshot, Command } from "@/lib/types";
import { Dashboard } from "./dashboard";
import { AnalyticsWorkspace } from "./analytics-workspace";
import { Workspaces } from "./workspaces";
import { FixtureAssistant } from "./fixture-assistant";
import { AiConfiguration } from "./ai-configuration";
import { Avatar, Drawer, Empty, Modal, Notice } from "./shared";

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
const workspaceName =
  process.env.NEXT_PUBLIC_WORKSPACE_NAME || "Northstar & Meridian";
const routes: { group: string; items: [string, string, LucideIcon][] }[] = [
  {
    group: "Analytics",
    items: [
      ["overview", "Risk overview", LayoutDashboard],
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
      ["members", "Member risk profiles", Users],
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
function Brand({ full = false, sidebar = false }: { full?: boolean; sidebar?: boolean }) {
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
      {sidebar ? <span className="sidebar-product"><span className="brand-product">Perform<span className="brand-plus">+</span></span><small>Risk intelligence</small></span> : <span className="brand-product">Perform<span className="brand-plus">+</span></span>}
    </div>
  );
}
function WorkspaceNavigation({
  user,
  route,
  collapsed = false,
  onNavigate,
}: {
  user: User;
  route: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const risk = useRiskContext();
  return (
    <nav id="workspace-navigation" aria-label="Workspace navigation">
      {routes.filter((group) => group.group !== "Settings").map((group) => {
        const items = group.items.filter(([id]) => id !== "reports" && user.screens.includes(id === "agents" ? "admin" : id === "reports" ? "analytics" : id) && !hiddenByScope(id));
        return items.length ? (
          <div className="nav-group" key={group.group}>
            <h3>{group.group}</h3>
            {items.map(([id, title, Icon]) => (
              <Tooltip key={id} delayDuration={200}><TooltipTrigger asChild><Link
                href={id === "agents" ? "/admin/ai/agents" : risk.href(`/${id}`)}
                aria-label={title}
                aria-current={route === id ? "page" : undefined}
                className={`nav-link ${route === id ? "active" : ""}`}
                onClick={onNavigate}
              >
                <Icon className="nav-icon" size={18} aria-hidden="true" />
                <span className="nav-label">{title}</span>
                {route === id && <ChevronRight className="nav-chevron" size={13} aria-hidden="true" />}
              </Link></TooltipTrigger>{collapsed && <TooltipContent side="right" sideOffset={12}>{title}</TooltipContent>}</Tooltip>
            ))}
          </div>
        ) : null;
      })}
    </nav>
  );
}
function signInPath() {
  if (window.location.pathname === "/login") return window.location.pathname + window.location.search;
  const returnTo = window.location.pathname + window.location.search + window.location.hash;
  return `/login?${new URLSearchParams({ returnTo }).toString()}`;
}
function signInDestination(user: User) {
  const fallback = `/${user.screens.find(screen => !hiddenByScope(screen)) || "overview"}`;
  const location = window.location;
  const requested = location.pathname === "/login"
    ? new URLSearchParams(location.search).get("returnTo")
    : location.pathname + location.search + location.hash;
  if (!requested || !requested.startsWith("/") || requested.startsWith("//") || requested.includes("\\")) return fallback;
  try {
    const destination = new URL(requested, location.origin);
    const screen = destination.pathname.split("/")[1];
    const knownScreen = routes.some((group) => group.items.some(([id]) => id === screen));
    return destination.origin === location.origin && knownScreen && user.screens.includes(screen === "reports" ? "analytics" : screen)
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
  const [help, setHelp] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("ct-sidebar-collapsed") === "true"); } catch { /* The navigation still works when browser storage is unavailable. */ }
  }, []);
  function toggleNavigation() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("ct-sidebar-collapsed", String(next)); } catch { /* Keep the current tab's selection. */ }
  }
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
  const routeName =
    routes.flatMap((g) => g.items).find((i) => i[0] === route)?.[1] ||
    "Overview";
  const actualRoute = route === "login" ? "overview" : route;
  return (
    <RiskProvider user={user}><div className={`app-layout ${collapsed ? "nav-collapsed" : ""}`}>
      <aside className="sidebar">
        <Link
          aria-label="CitiusTech Perform+ workspace"
          href={
            user.screens.includes("overview")
              ? "/overview"
              : `/${user.screens[0]}`
          }
        >
          <Brand sidebar />
        </Link>
        <div className="workspace-label" title={workspaceName}>
          <Image className="workspace-symbol" src="/branding/northstar-meridian-mark.png" alt="" width={32} height={32} loading="eager" />
          <div className="workspace-identity"><small>Organization workspace</small><strong>{workspaceName === "Northstar & Meridian" ? <><span>Northstar</span><span className="workspace-ampersand"> & </span><span className="workspace-meridian">Meridian</span></> : workspaceName}</strong></div>
        </div>
        <WorkspaceNavigation user={user} route={pathname.startsWith('/admin/ai') ? 'agents' : actualRoute} collapsed={collapsed} />
        <div className="sidebar-footer">
          <button className="sidebar-guide" onClick={() => setHelp(true)} aria-label="Workspace guide" title={collapsed ? "Workspace guide" : undefined}>
            <HelpCircle size={16} />
            <span>Workspace guide</span>
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="sidebar-collapse"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                aria-controls="workspace-navigation"
                onClick={toggleNavigation}
              >
                {collapsed ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              size="icon-sm"
              className="desktop-nav-toggle"
              aria-label="Toggle navigation"
              aria-expanded={!collapsed}
              onClick={toggleNavigation}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </Button>
            <span className="breadcrumb">{pathname.startsWith('/admin/ai') ? 'Agents configuration' : routeName}</span>
          </div>
          <div className="topbar-right">
            {snapshot.data && WORKFLOW_ENABLED && (
              <FixtureAssistant user={user} data={snapshot.data} act={act} />
            )}
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/suspects?grid_q=${encodeURIComponent(globalSearch)}`);
              }}
            >
              <Search size={15} />
              <Input
                aria-label="Search suspects"
                placeholder="Search suspects…"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            {WORKFLOW_ENABLED && <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Notifications"
              onClick={() => setNotifications(true)}
              className="notification-button"
            >
              <Bell size={18} />
              {!!snapshot.data?.events.length && <i />}
            </Button>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="profile" aria-label="Account menu">
                  <Avatar name={user.name.replace(/ demo$/i, "")} />
                  <ChevronDown size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="profile-menu">
                <DropdownMenuLabel>
                  {user.name.replace(/ demo$/i, "")}
                  <small>{user.email}</small>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Shield size={14} />
                  {label(user.role)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signout}>
                  <LogOut size={15} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {!pathname.startsWith('/admin/ai') && !['overview','analytics','suspects','reports','scenarios'].includes(actualRoute) && <RiskContextBar />}
        <main
          className={`page-canvas route-${actualRoute} ${actualRoute === "reviews" && pathname.split("/")[2] ? "workbench-canvas" : ""}`}
        >
          {!user.screens.includes(actualRoute === "reports" ? "analytics" : actualRoute) || hiddenByScope(actualRoute) ? (
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
                <Link href={`/${user.screens.find(screen => !hiddenByScope(screen)) || "overview"}`}>
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
            pathname.startsWith('/admin/ai') ? (hiddenByScope("agents") ? <Empty title="This page is not available in this workspace" description="Use Risk analytics or Reports to explore the available results." /> : <AiConfiguration key={user.id} user={user} />) : ["overview","analytics","suspects","reports","scenarios"].includes(actualRoute) ? <AnalyticsWorkspace user={user} route={actualRoute} /> : actualRoute === "analytics" ? (
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
        <div className={signIn.workspaceHeader}>
          <div className={signIn.workspaceIdentity}>
            <Image
              className={signIn.workspaceLogo}
              src="/branding/northstar-meridian-mark.png"
              alt=""
              width={56}
              height={56}
              loading="eager"
            />
            <div>
              <span>Organization workspace</span>
              <strong title={workspaceName}>
                {workspaceName === "Northstar & Meridian" ? (
                  <>
                    <span>Northstar</span>
                    <span className={signIn.workspaceAmpersand}> & </span>
                    <span className={signIn.workspaceMeridian}>Meridian</span>
                  </>
                ) : workspaceName}
              </strong>
            </div>
          </div>
        </div>
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
