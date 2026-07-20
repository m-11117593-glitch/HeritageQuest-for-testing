import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  FolderKanban,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  to: "/admin" | "/admin/artifacts" | "/admin/artifacts/new";
  icon: typeof LayoutDashboard;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/artifacts", icon: Package, label: "Artifacts" },
  { to: "/admin/artifacts/new", icon: PlusCircle, label: "Add New" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={`${collapsed ? "w-16" : "w-56"} fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border/40 bg-[oklch(0.16_0.02_260)] text-[oklch(0.85_0.01_80)] transition-[width] duration-200 ease-[var(--ease-out)]`}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-white/5 px-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary text-sm font-bold">
            ⚔️
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 truncate">
              <p className="font-display text-sm font-semibold leading-tight tracking-tight">Admin</p>
              <p className="text-[10px] leading-tight text-white/40">HeritageQuest</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {NAV_ITEMS.map((item) => {
            const active = loc.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-primary/15 text-primary shadow-[inset_3px_0_0_var(--color-primary)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="size-4.5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          {/* Categories placeholder */}
          {!collapsed && (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/30 cursor-not-allowed">
              <FolderKanban className="size-4.5 shrink-0" />
              <span className="truncate">Categories</span>
            </div>
          )}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center gap-3 border-t border-white/5 px-3 py-3 text-xs text-white/40 transition-colors hover:text-white/70"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 border-t border-white/5 px-3 py-3 text-xs text-white/40 transition-colors hover:text-white/70"
        >
          <LogOut className="size-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className={`flex-1 ${collapsed ? "ml-16" : "ml-56"} transition-[margin] duration-200 ease-[var(--ease-out)]`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="size-3.5 text-primary" />
            <span className="font-medium text-ink">Admin Panel</span>
            <span className="text-muted-foreground/40">·</span>
            <span>v1.0</span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
