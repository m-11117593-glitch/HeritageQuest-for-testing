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
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

interface NavItem {
  to: "/admin" | "/admin/artifacts" | "/admin/artifacts/new" | "/admin/categories";
  icon: typeof LayoutDashboard;
  labelEn: string;
  labelBm: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, labelEn: "Dashboard", labelBm: "Papan Pemuka" },
  { to: "/admin/artifacts", icon: Package, labelEn: "Artifacts", labelBm: "Artifak" },
  { to: "/admin/artifacts/new", icon: PlusCircle, labelEn: "Add New", labelBm: "Tambah Baru" },
  { to: "/admin/categories", icon: FolderKanban, labelEn: "Categories", labelBm: "Kategori" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
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
        className={`${
          collapsed ? "w-16" : "w-52"
        } fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border/40 bg-[oklch(0.34_0.022_52)] dark:bg-[oklch(0.24_0.015_265)] text-[oklch(0.88_0.015_60)] dark:text-[oklch(0.88_0.01_80)] transition-all duration-[350ms] ease-[var(--ease-out)]`}
      >
        {/* Brand — clickable link to dashboard */}
        <Link
          to="/admin"
          className="flex h-14 items-center gap-2.5 border-b border-white/8 px-3 overflow-hidden hover:bg-white/5 transition-colors"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/25 text-primary text-base font-bold">
            ⚔️
          </div>
          <div className={`min-w-0 flex-1 truncate transition-all duration-300 ease-[var(--ease-out)] ${!collapsed ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0 overflow-hidden"}`}>
            <p className="font-display text-base font-semibold leading-tight tracking-tight">Admin</p>
            <p className="text-xs leading-tight text-[oklch(0.88_0.015_60/0.65)] font-medium">HeritageQuest</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-4 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            const active = loc.pathname === item.to;
            const Icon = item.icon;
            const label = lang === "bm" ? item.labelBm : item.labelEn;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-primary/15 text-primary shadow-[inset_3px_0_0_var(--color-primary)]"
                    : "text-[oklch(0.88_0.015_60/0.75)] hover:bg-white/7 hover:text-[oklch(0.88_0.015_60/0.92)]"
                }`}
                title={collapsed ? label : undefined}
              >
                <Icon className="size-5 shrink-0" />
                <span
                  className={`truncate transition-all duration-300 ease-[var(--ease-out)] ${
                    !collapsed
                      ? "opacity-100 max-w-[180px]"
                      : "opacity-0 max-w-0 overflow-hidden"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}

        </nav>

        {/* Language toggle */}
        <div
          className={`flex items-center justify-center border-t border-white/8 px-3 py-3 overflow-hidden transition-all duration-300 ease-[var(--ease-out)] ${
            !collapsed ? "max-h-16 opacity-100" : "max-h-0 opacity-0 py-0"
          }`}
        >
          <LanguageToggle variant="sidebar" />
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center gap-3 border-t border-white/8 px-3 py-3 text-sm text-[oklch(0.88_0.015_60/0.6)] transition-colors hover:text-[oklch(0.88_0.015_60/0.85)]"
        >
          {collapsed ? <ChevronRight className="size-4.5 shrink-0" /> : <ChevronLeft className="size-4.5 shrink-0" />}
          <span
            className={`transition-all duration-300 ease-[var(--ease-out)] ${
              !collapsed ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0 overflow-hidden"
            }`}
          >
            {lang === "bm" ? "Runtuhkan" : "Collapse"}
          </span>
        </button>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 border-t border-white/8 px-3 py-3 text-sm text-[oklch(0.88_0.015_60/0.6)] transition-colors hover:text-[oklch(0.88_0.015_60/0.85)]"
        >
          <LogOut className="size-4.5 shrink-0" />
          <span
            className={`transition-all duration-300 ease-[var(--ease-out)] ${
              !collapsed ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0 overflow-hidden"
            }`}
          >
            {t("signout")}
          </span>
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className={`flex-1 ${collapsed ? "ml-16" : "ml-52"} transition-[margin] duration-[350ms] ease-[var(--ease-out)]`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="size-3.5 text-primary" />
            <span className="font-bold text-base text-ink">{t("admin_panel")}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground/60">v1.0</span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
