import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { ArrowLeft, Upload, X, Sparkles, Save, Loader2, Languages } from "lucide-react";
import { createArtifact, uploadArtifactImage, translateText } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/artifacts/new")({
  component: AddArtifactPage,
});

interface ImagePreview {
  file: File;
  preview: string;
  index: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function AddArtifactPage() {
  const nav = useNavigate();
  const { lang } = useI18n();
  const createFn = useServerFn(createArtifact);
  const uploadFn = useServerFn(uploadArtifactImage);
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
  const [slug, setSlug] = useState("");
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

  // Image uploads
  const [images, setImages] = useState<(ImagePreview | null)[]>([null, null, null]);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handleNameEnChange(value: string) {
    setNameEn(value);
    if (!slug || slug === slugify(nameEn)) {
      setSlug(slugify(value));
    }
  }

  function handleImageSelect(index: number, file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setImages((prev) => {
        const next = [...prev];
        // Cleanup old preview URL
        if (next[index]?.preview) URL.revokeObjectURL(next[index].preview);
        next[index] = { file, preview, index };
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  function removeImage(index: number) {
    const img = images[index];
    if (img?.preview) URL.revokeObjectURL(img.preview);
    setImages((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    if (fileInputRefs[index].current) fileInputRefs[index].current.value = "";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    // Validate BM fields are filled (required but hidden in main form)
    if (!nameBm.trim() || !eraBm.trim() || !originBm.trim() || !materialBm.trim() || !descBm.trim()) {
      setError('Please fill in BM fields via the Languages button before saving.');
      setSaving(false);
      return;
    }

    try {
      // 1. Upload images first
      const imageUrls: (string | null)[] = [null, null, null];
      for (let i = 0; i < 3; i++) {
        const img = images[i];
        if (img) {
          const result = await uploadFn({
            data: {
              artifactId: slug,
              fileIndex: i,
              fileName: img.file.name,
              fileBase64: img.preview,
            },
          });
          imageUrls[i] = result.url;
        }
      }

      // 2. Create the artifact
      await createFn({
        data: {
          id: slug,
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
          image_url: imageUrls[0],
          image_url_2: imageUrls[1],
          image_url_3: imageUrls[2],
        },
      });

      // 3. Redirect to artifacts list
      nav({ to: "/admin/artifacts" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create artifact");
    } finally {
      setSaving(false);
    }
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
          <h1 className="font-display text-2xl font-semibold text-ink">Add New Artifact</h1>
          <p className="text-sm text-muted-foreground">Fill in the details below to add a new museum artifact.</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6 rounded-xl border-2 border-border bg-card p-6">
        {/* ID / Slug */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Artifact ID
          </label>
          <div className="flex items-center gap-2">
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="auto-generated-from-name"
              className="flex-1 rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
              required
              pattern="^[a-z0-9-]+$"
            />
            <span className="text-xs text-muted-foreground">(kebab-case)</span>
          </div>
        </div>

        {/* Name — EN only in main form, BM via Languages modal */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Name (EN)
          </label>
          <input
            value={nameEn}
            onChange={(e) => handleNameEnChange(e.target.value)}
            placeholder="Name in English"
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
          >
            {categories.length === 0 && <option value="">Loading...</option>}
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.icon} {lang === "bm" ? c.name_bm : c.name_en}</option>
            ))}
          </select>
        </div>

        {/* Era — EN only in main form */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Era (EN)
          </label>
          <input
            value={eraEn}
            onChange={(e) => setEraEn(e.target.value)}
            placeholder="15th century"
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
            required
          />
        </div>

        {/* Origin — EN only in main form */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Origin (EN)
          </label>
          <input
            value={originEn}
            onChange={(e) => setOriginEn(e.target.value)}
            placeholder="Origin in English"
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
            required
          />
        </div>

        {/* Material — EN only in main form */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Material (EN)
          </label>
          <input
            value={materialEn}
            onChange={(e) => setMaterialEn(e.target.value)}
            placeholder="Material in English"
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
            required
          />
        </div>

        {/* Description — EN only in main form */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description (EN)
          </label>
          <textarea
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
            placeholder="Long description in English..."
            rows={4}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 resize-y"
            required
          />
        </div>
      </div>

      {/* Image Uploads */}
      <div className="space-y-4 rounded-xl border-2 border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Images</h2>
        <p className="text-xs text-muted-foreground">Upload up to 3 images (JPEG, PNG, or WebP, max 5MB each)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Image {index + 1}</p>
              {images[index] ? (
                <div className="relative aspect-[4/3] rounded-xl border-2 border-border bg-accent/40 overflow-hidden group">
                  <img
                    src={images[index]!.preview}
                    alt={`Upload ${index + 1}`}
                    className="h-full w-full object-contain p-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRefs[index].current?.click()}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-accent/20 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <Upload className="size-6" />
                  <span className="text-xs">Click to upload</span>
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
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Saving..." : "Save Artifact"}
        </button>
        <button
          type="button"
          onClick={() => nav({ to: "/admin/artifacts" })}
          className="rounded-xl border-2 border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setShowLanguages(true)}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-ink"
        >
          <Languages className="size-4" />
          Languages
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
    </form>
  );
}
