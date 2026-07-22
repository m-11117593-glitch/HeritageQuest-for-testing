import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { ArrowLeft, Upload, Save, Loader2, Trash2, AlertTriangle, HelpCircle, Languages, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { updateArtifact, uploadArtifactImage, deleteArtifact, translateText } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/artifacts/$id")({
  component: EditArtifactPage,
});

function EditArtifactPage() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const updateFn = useServerFn(updateArtifact);
  const uploadFn = useServerFn(uploadArtifactImage);

  const deleteFn = useServerFn(deleteArtifact);
  const translateFn = useServerFn(translateText);

  // Fetch categories dynamically from DB
  const { data: catsData } = useQuery({
    queryKey: ["admin-categories-form"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      return data ?? [];
    },
  });
  const categories = catsData ?? [];

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationDone, setTranslationDone] = useState(false);

  // Form fields
  const [nameBm, setNameBm] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [category, setCategory] = useState("");
  const [eraBm, setEraBm] = useState("");
  const [eraEn, setEraEn] = useState("");
  const [originBm, setOriginBm] = useState("");
  const [originEn, setOriginEn] = useState("");
  const [materialBm, setMaterialBm] = useState("");
  const [materialEn, setMaterialEn] = useState("");
  const [descBm, setDescBm] = useState("");
  const [descEn, setDescEn] = useState("");
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([null, null, null]);

  // New image uploads (replacing existing)
  const [newImages, setNewImages] = useState<(File | null)[]>([null, null, null]);
  const [newImagePreviews, setNewImagePreviews] = useState<(string | null)[]>([null, null, null]);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Fetch artifact data
  const { isLoading } = useQuery({
    queryKey: ["artifact", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artifacts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Artifact not found");

      setNameBm(data.name_bm);
      setNameEn(data.name_en);
      setCategory(data.category);
      setEraBm(data.era_bm);
      setEraEn(data.era_en);
      setOriginBm(data.origin_bm);
      setOriginEn(data.origin_en);
      setMaterialBm(data.material_bm);
      setMaterialEn(data.material_en);
      setDescBm(data.description_bm);
      setDescEn(data.description_en);
      setImageUrls([data.image_url, data.image_url_2, data.image_url_3]);

      return data;
    },
  });

  function handleImageSelect(index: number, file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setNewImages((prev) => {
        const next = [...prev];
        next[index] = file;
        return next;
      });
      setNewImagePreviews((prev) => {
        const next = [...prev];
        next[index] = preview;
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  function removeNewImage(index: number) {
    setNewImages((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setNewImagePreviews((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    if (fileInputRefs[index].current) fileInputRefs[index].current.value = "";
  }

  function removeExistingImage(index: number) {
    setImageUrls((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  async function handleTranslateAll() {
    if (translating) return;
    setTranslating(true);
    setTranslationError(null);
    setTranslationDone(false);
    try {
      const pairs: [string, (v: string) => void][] = [
        [nameEn, setNameBm],
        [eraEn, setEraBm],
        [originEn, setOriginBm],
        [materialEn, setMaterialBm],
        [descEn, setDescBm],
      ];

      for (const [enText, setter] of pairs) {
        if (!enText.trim()) continue;
        const result = await translateFn({ data: { text: enText } });
        setter(result.translatedText);
      }
      setTranslationDone(true);
      setTimeout(() => setTranslationDone(false), 2500);
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslating(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteFn({ data: { id } });
      nav({ to: "/admin/artifacts" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete artifact");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validate BM fields are filled (required but hidden in main form)
    if (!nameBm.trim() || !eraBm.trim() || !originBm.trim() || !materialBm.trim() || !descBm.trim()) {
      setError('Please fill in BM fields via the Languages button before saving.');

      setSaving(false);
      return;
    }

    try {
      // Upload any new images
      const finalUrls = [...imageUrls];
      for (let i = 0; i < 3; i++) {
        const newImg = newImages[i];
        if (newImg && newImagePreviews[i]) {
          const result = await uploadFn({
            data: {
              artifactId: id,
              fileIndex: i,
              fileName: newImg.name,
              fileBase64: newImagePreviews[i]!,
            },
          });
          finalUrls[i] = result.url;
        }
      }

      // Update the artifact
      await updateFn({
        data: {
          id,
          category,
          name_bm: nameBm,
          name_en: nameEn,
          description_bm: descBm,
          description_en: descEn,
          era_bm: eraBm,
          era_en: eraEn,
          origin_bm: originBm,
          origin_en: originEn,
          material_bm: materialBm,
          material_en: materialEn,
          image_url: finalUrls[0],
          image_url_2: finalUrls[1],
          image_url_3: finalUrls[2],
        },
      });

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update artifact");
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => nav({ to: "/admin/artifacts" })}
          className="grid size-9 place-items-center rounded-xl border-2 border-border text-muted-foreground hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("admin_edit_artifact")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin_id_label")} <code className="rounded bg-accent px-1.5 py-0.5 text-xs">{id}</code></p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="rounded-xl border-2 border-jungle/40 bg-jungle/10 px-4 py-3 text-sm text-jungle font-medium">
          {t("admin_updated_success")}{" "}
          <button type="button" onClick={() => nav({ to: "/admin/artifacts" })} className="underline">
            {t("admin_back_to_artifacts")}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6 rounded-xl border-2 border-border bg-card p-6">
        {/* Name — EN only in main form */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_name_en")}</label>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_category")}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50">
            {categories.length === 0 && <option value="">{t("admin_loading")}</option>}
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {lang === "bm" ? c.name_bm : c.name_en}</option>)}
          </select>
        </div>

        {/* Era — EN only */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_era_en")}</label>
          <input value={eraEn} onChange={(e) => setEraEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
        </div>

        {/* Origin — EN only */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_origin_en")}</label>
          <input value={originEn} onChange={(e) => setOriginEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
        </div>

        {/* Material — EN only */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_material_en")}</label>
          <input value={materialEn} onChange={(e) => setMaterialEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
        </div>

        {/* Description — EN only */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin_desc_en")}</label>
          <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={4} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 resize-y" required />
        </div>
      </div>

      {/* Images */}
      <div className="space-y-4 rounded-xl border-2 border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-ink">{t("admin_images")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const existingUrl = imageUrls[index];
            const newPreview = newImagePreviews[index];
            const hasNew = newPreview !== null;
            const displayUrl = hasNew ? newPreview : existingUrl;

            return (
              <div key={index}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("admin_image_n").replace("{n}", String(index + 1))}</p>
                {displayUrl ? (
                  <div className="relative aspect-[4/3] rounded-xl border-2 border-border bg-accent/40 overflow-hidden group">
                    <img src={displayUrl} alt={`Image ${index + 1}`} className="h-full w-full object-contain p-2" />
                    <button
                      type="button"
                      onClick={() => hasNew ? removeNewImage(index) : removeExistingImage(index)}
                      className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs[index].current?.click()}
                    className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-accent/20 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <Upload className="size-6" />
                    <span className="text-xs">{t("admin_upload_image")}</span>
                  </button>
                )}
                <input
                  ref={fileInputRefs[index]}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(index, file);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? t("admin_saving") : t("admin_save_changes")}
        </button>
        <button type="button" onClick={() => nav({ to: "/admin/artifacts" })} className="rounded-xl border-2 border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
          {t("admin_cancel")}
        </button>
        <button
          type="button"
          onClick={() => setShowLanguages(true)}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-ink"
        >
          <Languages className="size-4" />
          {t("admin_languages")}
        </button>
        <Link
          to="/admin/artifacts/quizzes/$id"
          params={{ id }}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-ink"
        >
          <HelpCircle className="size-4" />
          {t("admin_quizzes")}
        </Link>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-destructive/30 px-6 py-3 text-sm font-semibold text-destructive transition-all hover:bg-destructive/10 active:scale-95"
        >
          <Trash2 className="size-4" />
          {t("admin_delete")}
        </button>
      </div>

      {/* Languages modal */}
      {showLanguages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLanguages(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-border bg-card p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                  <Languages className="size-5" />
                  Bilingual Content
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  View and edit both Bahasa Melayu and English side by side.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLanguages(false)}
                className="grid size-8 place-items-center rounded-lg border-2 border-border text-muted-foreground hover:text-ink transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Auto-translate button + status */}
            <div className="mb-6 rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <p className="flex-1 text-sm text-muted-foreground">
                  Fill in EN fields above and click to auto-translate to BM.
                </p>
                <button
                  type="button"
                  onClick={handleTranslateAll}
                  disabled={translating}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
                >
                  {translating ? <Loader2 className="size-3.5 animate-spin" /> : <Languages className="size-3.5" />}
                  {translating ? "Translating..." : "Auto-translate to BM"}
                </button>
              </div>
              {translationDone && (
                <p className="mt-2 text-xs font-medium text-jungle animate-in slide-in-from-top-1 fade-in duration-200">
                  ✓ BM fields translated successfully!
                </p>
              )}
              {translationError && (
                <p className="mt-2 text-xs font-medium text-destructive animate-in slide-in-from-top-1 fade-in duration-200">
                  ⚠ {translationError}
                </p>
              )}
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-indigo">BM</label>
                  <input value={nameBm} onChange={(e) => setNameBm(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-jungle">EN</label>
                  <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                </div>
              </div>

              {/* Era */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-indigo">Era (BM)</label>
                  <input value={eraBm} onChange={(e) => setEraBm(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-jungle">Era (EN)</label>
                  <input value={eraEn} onChange={(e) => setEraEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                </div>
              </div>

              {/* Origin */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-indigo">Origin (BM)</label>
                  <input value={originBm} onChange={(e) => setOriginBm(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-jungle">Origin (EN)</label>
                  <input value={originEn} onChange={(e) => setOriginEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                </div>
              </div>

              {/* Material */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-indigo">Material (BM)</label>
                  <input value={materialBm} onChange={(e) => setMaterialBm(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-jungle">Material (EN)</label>
                  <input value={materialEn} onChange={(e) => setMaterialEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-indigo">Description (BM)</label>
                  <textarea value={descBm} onChange={(e) => setDescBm(e.target.value)} rows={4} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 resize-y" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-jungle">Description (EN)</label>
                  <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={4} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 resize-y" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowLanguages(false)}
                className="rounded-xl border-2 border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border-2 border-destructive/30 bg-card p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15">
                <AlertTriangle className="size-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{t("admin_delete_artifact")}</h3>
                <p className="text-sm text-muted-foreground">{t("admin_delete_confirm_desc")}</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              {lang === "bm" ? `Adakah anda pasti mahu memadam ${nameEn}? Tindakan ini akan memadamkan artifak, gambar, dan semua data kemajuan pengguna secara kekal.` : `Are you sure you want to delete ${nameEn}? This will permanently remove the artifact, its images, and all user progress data.`}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
              >
                {t("admin_cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition-all hover:bg-destructive/90 active:scale-95 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {deleting ? t("admin_deleting") : t("admin_delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
