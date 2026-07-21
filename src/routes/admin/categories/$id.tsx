import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { updateCategory } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/categories/$id")({
  component: EditCategoryPage,
});

function EditCategoryPage() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const updateFn = useServerFn(updateCategory);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nameBm, setNameBm] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const { isLoading } = useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Category not found");
      setNameBm(data.name_bm);
      setNameEn(data.name_en);
      setIcon(data.icon);
      setSortOrder(data.sort_order);
      return data;
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateFn({ data: { id, name_bm: nameBm, name_en: nameEn, icon, sort_order: sortOrder } });
      nav({ to: "/admin/categories" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => nav({ to: "/admin/categories" })} className="grid size-9 place-items-center rounded-xl border-2 border-border text-muted-foreground hover:text-ink transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{lang === "bm" ? "Sunting Kategori" : "Edit Category"}</h1>
          <p className="text-sm text-muted-foreground">ID: <code className="rounded bg-accent px-1.5 py-0.5 text-xs">{id}</code></p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-4 rounded-xl border-2 border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name (BM)</label>
            <input value={nameBm} onChange={(e) => setNameBm(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name (EN)</label>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Icon (emoji)</label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{lang === "bm" ? "Susunan" : "Sort Order"}</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving..." : (lang === "bm" ? "Simpan" : "Save Changes")}
        </button>
        <button type="button" onClick={() => nav({ to: "/admin/categories" })} className="rounded-xl border-2 border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
          {lang === "bm" ? "Batal" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
