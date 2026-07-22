import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createCategory } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/categories/new")({
  component: AddCategoryPage,
});

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function AddCategoryPage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const createFn = useServerFn(createCategory);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState("");
  const [nameBm, setNameBm] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [icon, setIcon] = useState("📦");

  function handleNameEnChange(value: string) {
    setNameEn(value);
    if (!id || id === slugify(nameEn)) {
      setId(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await createFn({ data: { id, name_bm: nameBm, name_en: nameEn, icon, sort_order: 99 } });
      nav({ to: "/admin/categories" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => nav({ to: "/admin/categories" })} className="grid size-9 place-items-center rounded-xl border-2 border-border text-muted-foreground hover:text-ink transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("admin_add_category")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin_add_category_sub")}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-4 rounded-xl border-2 border-border bg-card p-6">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_id")}</label>
          <input value={id} onChange={(e) => setId(slugify(e.target.value))} placeholder="kebab-case-id" className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required pattern="^[a-z0-9-]+$" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_name_bm")}</label>
            <input value={nameBm} onChange={(e) => setNameBm(e.target.value)} placeholder={t("admin_name_bm_placeholder")} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_name_en")}</label>
            <input value={nameEn} onChange={(e) => handleNameEnChange(e.target.value)} placeholder={t("admin_name_en_placeholder")} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_icon_emoji")}</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🗡️" className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? t("admin_saving") : t("admin_save")}
        </button>
        <button type="button" onClick={() => nav({ to: "/admin/categories" })} className="rounded-xl border-2 border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
          {t("admin_cancel")}
        </button>
      </div>
    </form>
  );
}
