import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { exportArtifactsAsJson, bulkUpdateArtifacts } from "@/lib/admin.functions";
import {
  PlusCircle,
  Package,
  Search,
  Download,
  CheckSquare,
  Square,
  X,
  Loader2,
  ArrowUpDown,
} from "lucide-react";

export const Route = createFileRoute("/admin/artifacts/")({
  component: AdminArtifactsList,
});

async function fetchAllArtifacts() {
  const { data } = await supabase
    .from("artifacts")
    .select("id, name_en, name_bm, category")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

async function fetchCategories() {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

function AdminArtifactsList() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const exportFn = useServerFn(exportArtifactsAsJson);
  const bulkUpdateFn = useServerFn(bulkUpdateArtifacts);

  const { data: artifacts, isLoading } = useQuery({
    queryKey: ["admin-all-artifacts"],
    queryFn: fetchAllArtifacts,
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchCategories,
  });

  // Search
  const [search, setSearch] = useState("");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk edit modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Export
  const [exporting, setExporting] = useState(false);

  // Build category lookup
  const categoryLookup = useMemo(() => {
    const map: Record<string, { icon: string; name_bm: string; name_en: string }> = {};
    for (const c of categories ?? []) {
      map[(c as any).id] = { icon: (c as any).icon, name_bm: (c as any).name_bm, name_en: (c as any).name_en };
    }
    return map;
  }, [categories]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!artifacts) return [];
    if (!search.trim()) return artifacts;
    const q = search.toLowerCase();
    return artifacts.filter(
      (a) =>
        a.name_en.toLowerCase().includes(q) ||
        a.name_bm.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );
  }, [artifacts, search]);

  const allSelected =
    filtered.length > 0 && selected.size === filtered.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportFn();
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heritagequest-artifacts-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  async function handleBulkSave() {
    if (bulkSaving || !bulkCategory) return;
    setBulkSaving(true);
    setBulkError(null);
    try {
      await bulkUpdateFn({
        data: { ids: Array.from(selected), category: bulkCategory },
      });
      setSelected(new Set());
      setShowBulkModal(false);
      setBulkCategory("");
      qc.invalidateQueries({ queryKey: ["admin-all-artifacts"] });
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {t("admin_artifacts")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {artifacts?.length ?? 0} {t("admin_artifacts_count")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-ink disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {t("admin_export")}
          </button>
          <Link
            to="/admin/artifacts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
          >
            <PlusCircle className="size-4" />
            {t("admin_add_new_short")}
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(new Set()); // clear selection on search
          }}
          placeholder={t("admin_search_placeholder")}
          className="w-full rounded-xl border-2 border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/50"
        />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 animate-in slide-in-from-top-2 fade-in duration-200">
          <span className="text-sm font-medium text-ink">
            {selected.size} {t("admin_selected_count")}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
          >
            <ArrowUpDown className="size-3" />
            {t("admin_change_category")}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-ink transition-colors"
          >
            <X className="size-3" />
            {t("admin_clear_selection")}
          </button>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Select-all card */}
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground hover:border-primary/30 hover:text-ink transition-all"
          >
            {allSelected ? (
              <CheckSquare className="size-5 shrink-0 text-primary" />
            ) : (
              <Square className="size-5 shrink-0" />
            )}
            <span className="font-medium">
              {allSelected ? t("admin_deselect_all") : t("admin_select_all")}
            </span>
          </button>

          {filtered.map((a) => {
            const isSelected = selected.has(a.id);
            return (
              <div
                key={a.id}
                className={`group relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all hover:shadow-sm ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card hover:border-primary/30 hover:-translate-y-0.5"
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleOne(a.id);
                  }}
                  className="shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="size-5 text-primary" />
                  ) : (
                    <Square className="size-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  )}
                </button>

                {/* Link to edit */}
                <Link
                  to="/admin/artifacts/$id"
                  params={{ id: a.id }}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-lg">
                    {categoryLookup[a.category]?.icon ?? "📦"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">
                      {lang === "bm" ? a.name_bm : a.name_en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLookup[a.category]
                        ? lang === "bm"
                          ? categoryLookup[a.category].name_bm
                          : categoryLookup[a.category].name_en
                        : a.category}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 shrink-0">
                    {a.id}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Package className="size-12 text-muted-foreground/30" />
          <div>
            <p className="font-display text-lg text-ink">
              {search ? t("admin_no_search_results") : t("admin_no_artifacts")}
            </p>
            <p className="text-sm text-muted-foreground">
              {search ? t("admin_no_search_results_desc") : t("admin_no_artifacts_desc")}
            </p>
          </div>
          {!search && (
            <Link
              to="/admin/artifacts/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <PlusCircle className="size-4" />
              {t("admin_add_artifact")}
            </Link>
          )}
        </div>
      )}

      {/* Bulk edit modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowBulkModal(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border-2 border-border bg-card p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">
                {t("admin_change_category")}
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="grid size-8 place-items-center rounded-lg border-2 border-border text-muted-foreground hover:text-ink transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("admin_change_category_for")} {selected.size} {t("admin_artifacts_lc")}
            </p>

            {bulkError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {bulkError}
              </div>
            )}

            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="mb-4 w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            >
              <option value="">
                {t("admin_select_category")}
              </option>
              {(categories ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {lang === "bm" ? c.name_bm : c.name_en}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="flex-1 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
              >
                {t("admin_cancel")}
              </button>
              <button
                type="button"
                onClick={handleBulkSave}
                disabled={bulkSaving || !bulkCategory}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
              >
                {bulkSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUpDown className="size-4" />
                )}
                {bulkSaving ? t("admin_saving") : t("admin_change")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
