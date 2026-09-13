"use client";
import "./assessment-workspaces.css";
import "./risk-ui.css";
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
  Search,
  Bell,
  ChevronDown,
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { api, command, ApiError, label } from "@/lib/api";
import type { User, Snapshot, Command } from "@/lib/types";
import { Dashboard } from "./dashboard";
import { Workspaces } from "./workspaces";
import { FixtureAssistant } from "./fixture-assistant";
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
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
const workspaceName =
  process.env.NEXT_PUBLIC_WORKSPACE_NAME || "Northstar & Meridian";
const routes: { group: string; items: [string, string, LucideIcon][] }[] = [
  {
    group: "Monitoring",
    items: [
      ["overview", "Risk overview", LayoutDashboard],
      ["analytics", "Risk analytics", ChartNoAxesCombined],
      ["scenarios", "RAF & model lab", Calculator],
    ],
  },
  {
    group: "Review operations",
    items: [
      ["suspects", "Suspect registry", ScanLine],
      ["reviews", "Chart review", ClipboardCheck],
      ["qa", "Coding QA", ShieldCheck],
      ["campaigns", "Campaigns", Layers3],
      ["chase", "Chart chase", FileSearch],
      ["intake", "Document intake", Upload],
    ],
  },
  {
    group: "Members and providers",
    items: [
      ["members", "Member risk profiles", Users],
      ["providers", "Provider portfolio", Building2],
      ["previsit", "Pre-visit", CalendarCheck],
    ],
  },
  {
    group: "Governance",
    items: [
      ["submissions", "Submissions", Send],
      ["audit", "Audit workspace", FolderCheck],
      ["data", "Models & data", Database],
      ["admin", "Administration", Settings],
    ],
  },
];
function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="brand">
      <strong>CitusTech</strong>
      <span>
        Perform<span className="brand-plus">+</span>
      </span>
    </div>
  );
}
function WorkspaceNavigation({
  user,
  route,
  onNavigate,
}: {
  user: User;
  route: string;
  onNavigate?: () => void;
}) {
  const risk = useRiskContext();
  return (
    <nav aria-label="Workspace navigation">
      {routes.map((group) => {
        const items = group.items.filter(([id]) => user.screens.includes(id));
        return items.length ? (
          <div className="nav-group" key={group.group}>
            <h3>{group.group}</h3>
            {items.map(([id, title, Icon]) => (
              <Link
                key={id}
                href={risk.href(`/${id}`)}
                aria-current={route === id ? "page" : undefined}
                className={`nav-link ${route === id ? "active" : ""}`}
                onClick={onNavigate}
              >
                <Icon size={18} />
                <span>{title}</span>
              </Link>
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
  const fallback = user.screens.includes("overview") ? "/overview" : `/${user.screens[0]}`;
  const location = window.location;
  const requested = location.pathname === "/login"
    ? new URLSearchParams(location.search).get("returnTo")
    : location.pathname + location.search + location.hash;
  if (!requested || !requested.startsWith("/") || requested.startsWith("//") || requested.includes("\\")) return fallback;
  try {
    const destination = new URL(requested, location.origin);
    const screen = destination.pathname.split("/")[1];
    const knownScreen = routes.some((group) => group.items.some(([id]) => id === screen));
    return destination.origin === location.origin && knownScreen && user.screens.includes(screen)
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
  const [mobileMenu, setMobileMenu] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
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
          aria-label="CitusTech Perform+ workspace"
          href={
            user.screens.includes("overview")
              ? "/overview"
              : `/${user.screens[0]}`
          }
        >
          <Brand />
        </Link>
        <div className="workspace-label">
          <Building2 size={16} />
          <span title={workspaceName}>{workspaceName}</span>
        </div>
        <WorkspaceNavigation user={user} route={actualRoute} />
        <div className="sidebar-footer">
          <button onClick={() => setHelp(true)}>
            <HelpCircle size={16} />
            <span>Workspace guide</span>
            <ArrowUpRight size={14} />
          </button>
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
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="mobile-menu-trigger"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <PanelLeftOpen size={20} />
            </Button>
            <span className="mobile-brand">CitusTech Perform+</span>
            <span className="breadcrumb">{routeName}</span>
          </div>
          <div className="topbar-right">
            {snapshot.data && (
              <FixtureAssistant user={user} data={snapshot.data} act={act} />
            )}
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/members?q=${encodeURIComponent(globalSearch)}`);
              }}
            >
              <Search size={15} />
              <Input
                aria-label="Search members"
                placeholder="Search members…"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Notifications"
              onClick={() => setNotifications(true)}
              className="notification-button"
            >
              <Bell size={18} />
              {!!snapshot.data?.events.length && <i />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="profile">
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
        <RiskContextBar />
        <main
          className={`page-canvas route-${actualRoute} ${actualRoute === "reviews" && pathname.split("/")[2] ? "workbench-canvas" : ""}`}
        >
          {!user.screens.includes(actualRoute) ? (
            <div className="access-denied">
              <LockKeyhole size={40} />
              <h1>This workspace needs a different role</h1>
              <p>
                You’re signed in as {label(user.role)}. Your account can access{" "}
                {user.screens.map(label).join(", ")}.
              </p>
              <Button asChild>
                <Link href={`/${user.screens[0]}`}>
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
            actualRoute === "overview" ? <RiskOverview user={user} /> : actualRoute === "analytics" ? (
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
          <span>© 2026 CitusTech · Perform+</span>
          <button onClick={() => setHelp(true)}>
            Workspace guide <ArrowUpRight size={12} />
          </button>
        </footer>
      </div>
      <Drawer
        open={mobileMenu}
        onOpenChange={setMobileMenu}
        title="CitusTech Perform+"
        description={workspaceName}
      >
        <WorkspaceNavigation
          user={user}
          route={actualRoute}
          onNavigate={() => setMobileMenu(false)}
        />
      </Drawer>
      <Drawer
        open={notifications}
        onOpenChange={setNotifications}
        title="Workspace activity"
        description="Recent decisions and workflow updates."
      >
        {!snapshot.data?.events.length ? (
          <Empty
            title="Your activity starts here"
            description="Decisions, tasks and workflow updates will appear here."
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
        description="Find source evidence, review findings and follow each outcome."
      >
        <div className="tour-list">
          {snapshot.data?.members
            .filter((m) => m.showcase)
            .map((m, i) => (
              <Link
                href={`/members/${m.id}`}
                onClick={() => setHelp(false)}
                key={m.id}
              >
                <span>0{i + 1}</span>
                {m.name} · {label(m.opportunity_type)}
                <ArrowRight size={15} />
              </Link>
            ))}
        </div>
        <Notice>
          <span>
            <strong>About this workspace.</strong> Records and reference results
            are illustrative. Analysis uses prepared findings. External delivery
            is simulated. Model results use the selected configuration and retained input snapshots.
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
    <div className="login-page">
      <section className="login-form-side">
        <div className="login-form-wrap">
          <Brand />
          <h1>Sign in</h1>
          <p>{workspaceName}</p>
          <form onSubmit={submit}>
            <div className="form-field">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-field">
              <Label htmlFor="password">Password</Label>
              <div className="password-field">
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
            <Button type="submit" disabled={busy} className="login-submit">
              {busy ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={17} />
                </>
              )}
            </Button>
          </form>
        </div>
        <span className="login-footer">
          Need access? Contact your workspace administrator.
        </span>
      </section>
    </div>
  );
}
