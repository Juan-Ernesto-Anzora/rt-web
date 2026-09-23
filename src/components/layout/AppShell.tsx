import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminPermission, hasAdminAccess, type AdminPermissionContext } from "../../auth/adminPermissions";
import { useAuth } from "../../auth/useAuth";
import { getCurrentUserProfile } from "../../auth/userProfile";
import { ADMIN_SECTIONS } from "../../navigation/adminSections";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { focusStyle } from "../ui/styles";

const linkClass = (active: boolean) => `block rounded-small px-3 py-2 text-sm font-semibold ${focusStyle} ${active ? "border-l-2 border-border-strong bg-surface-active text-foreground" : "border-l-2 border-transparent text-text-muted hover:bg-surface-hover hover:text-foreground"}`;

function AdminLinks({ context, onNavigate }: { context: AdminPermissionContext; onNavigate?(): void }) {
  const permissions = context.permissions;
  const sections = ADMIN_SECTIONS.filter(section =>
    (!section.permission && !section.anyPermissions) ||
    (section.permission ? permissions.includes(section.permission) : false) ||
    Boolean(section.anyPermissions?.some(permission => permissions.includes(permission))),
  );
  return <nav aria-label="Administration navigation" className="space-y-1">
    <div className="px-3 pb-1 text-xs font-semibold text-text-muted">Administration</div>
    {sections.map(section => <NavLink key={section.key} end to={section.path} onClick={onNavigate} className={({ isActive }) => linkClass(isActive)}>{section.label}</NavLink>)}
  </nav>;
}

function ShellNavigation({ context, onNavigate }: { context: AdminPermissionContext | null; onNavigate?(): void }) {
  return <div className="space-y-5">
    <nav aria-label="Workspace navigation" className="space-y-1">
      <div className="px-3 pb-1 text-xs font-semibold text-text-muted">Workspace</div>
      <NavLink end to="/" onClick={onNavigate} className={({ isActive }) => linkClass(isActive)}>Home</NavLink>
      <NavLink end to="/search" onClick={onNavigate} className={({ isActive }) => linkClass(isActive)}>Search</NavLink>
    </nav>
    <nav aria-label="Requests navigation" className="space-y-1">
      <div className="px-3 pb-1 text-xs font-semibold text-text-muted">Requests</div>
      <NavLink end to="/requests/new" onClick={onNavigate} className={({ isActive }) => linkClass(isActive)}>New Request</NavLink>
    </nav>
    {context && hasAdminAccess(context) ? <AdminLinks context={context} onNavigate={onNavigate} /> : null}
  </div>;
}

function UserDisclosure({ userName, logout }: { userName: string; logout(): void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const initials = (userName.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("")) || "U";
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    const pointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", pointer);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", pointer); };
  }, [open]);
  return <div ref={root} className="relative col-start-2 row-start-1 sm:col-auto sm:row-auto">
    <Button ref={trigger} variant="ghost" aria-label={`User actions for ${userName || "User"}`} aria-expanded={open} aria-controls="user-actions" onClick={() => setOpen(value => !value)} className="min-w-0 !px-2">
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-small bg-surface-active text-xs text-foreground">{initials}</span>
      <span className="hidden max-w-24 truncate sm:inline">{userName || "User"}</span>
    </Button>
    {open ? <div id="user-actions" role="group" aria-label="User actions" className="absolute right-0 top-full z-30 mt-1 w-48 rounded-medium border border-border bg-surface p-1 shadow-lg">
      <Link to="/profile/preferences" className={`block rounded-small px-3 py-2 text-sm text-foreground hover:bg-surface-hover ${focusStyle}`}>Preferences</Link>
      <button type="button" onClick={() => { setOpen(false); logout(); navigate("/login", { replace: true }); }} className={`block w-full rounded-small px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger-surface ${focusStyle}`}>Sign out</button>
    </div> : null}
  </div>;
}

export default function AppShell() {
  const { token, tenant, logout } = useAuth();
  const { context } = useAdminPermission(token, tenant);
  const user = getCurrentUserProfile(token);
  const location = useLocation();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);

  useEffect(() => { setNavigationOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const heading = main.current?.querySelector<HTMLElement>("h1, h2");
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
        else main.current?.focus({ preventScroll: true });
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [location.pathname]);

  return <div className="flex min-h-screen min-w-0 flex-col bg-background text-foreground">
    <a href="#main-content" className={`sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-small focus:border focus:border-border-strong focus:bg-surface focus:px-3 focus:py-2 focus:text-foreground ${focusStyle}`}>Skip to main content</a>
    <header className="sticky top-0 z-20 grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-surface px-3 py-2 sm:flex sm:flex-wrap sm:justify-between sm:px-5">
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:col-auto sm:row-auto">
        <Button variant="secondary" size="sm" className="lg:hidden" aria-label="Open navigation" onClick={() => setNavigationOpen(true)}>Menu</Button>
        <span className="truncate text-base font-semibold">Request Tracker</span>
      </div>
      <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center justify-end gap-1 sm:col-auto sm:row-auto sm:ml-auto sm:gap-2">
        <Link to="/search" className={`rounded-small px-2 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover ${focusStyle}`}>Search</Link>
        <Link to="/requests/new" className={`rounded-small bg-action-primary px-3 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary-hover ${focusStyle}`}>New Request</Link>
        <span className="hidden max-w-32 truncate text-xs text-text-muted sm:block">Tenant: {tenant ?? "-"}</span>
      </div>
      <UserDisclosure userName={user.displayName} logout={logout} />
    </header>
    <div className="flex min-w-0 flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface-subtle p-3 lg:block" aria-label="Application navigation">
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto"><ShellNavigation context={context} /></div>
      </aside>
      <main id="main-content" ref={main} tabIndex={-1} aria-label="Main content" className="min-w-0 flex-1 outline-none"><Outlet /></main>
    </div>
    <Dialog open={navigationOpen} title="Navigation" onClose={() => setNavigationOpen(false)}>
      <ShellNavigation context={context} onNavigate={() => setNavigationOpen(false)} />
    </Dialog>
  </div>;
}
