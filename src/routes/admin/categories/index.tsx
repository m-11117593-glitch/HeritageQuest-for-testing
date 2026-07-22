import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PlusCircle, Edit3, Trash2, AlertTriangle, Loader2, Package } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getCategoriesWithCounts, deleteCategory } from "@/lib/admin.functions";
import { useState } from "react";

export const Route = createFileRoute("/admin/categories/")({
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteCategory);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories-with-counts"],
    queryFn: () => getCategoriesWithCounts(),
  });

  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const categories = data?.categories ?? [];

  async function handleDelete(id: string) {
    if (deleting) return;
    setDeleting(id);
    setDeleteErr(null);
    try {
      await deleteFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["admin-categories-with-counts"] });
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("admin_categories")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.length} {t("admin_categories_count").replace("{n}", String(categories.length))}
          </p>
        </div>
        <Link
          to="/admin/categories/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          <PlusCircle className="size-4" />
          {t("admin_add_new")}
        </Link>
      </div>

      {deleteErr && (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {deleteErr}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat: any) => (
            <div
              key={cat.id}
              className="group relative rounded-xl border-2 border-border bg-card p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-lg">
                  {cat.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-ink truncate">
                    {lang === "bm" ? cat.name_bm : cat.name_en}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cat.artifactCount} {lang === "bm" ? "artifak" : "artifacts"}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
                  {cat.id}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => nav({ to: "/admin/categories/$id", params: { id: cat.id } })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-ink transition-colors"
                >
                  <Edit3 className="size-3" />                    {t("admin_edit")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id)}
                  disabled={deleting === cat.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
                >
                  {deleting === cat.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  {t("admin_delete")}
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-4 py-16 text-center">
              <Package className="size-12 text-muted-foreground/30" />
              <div>
                <p className="font-display text-lg text-ink">
                  {t("admin_no_categories")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("admin_no_categories_desc")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
