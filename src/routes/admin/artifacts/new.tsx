import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { ArrowLeft, Upload, X, Sparkles, Save, Loader2 } from "lucide-react";
import { createArtifact, uploadArtifactImage } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/artifacts/new")({
  component: AddArtifactPage,
});

const CATEGORIES = [
  { value: "weapons", label: "Weapons" },
  { value: "regalia", label: "Regalia" },
  { value: "music", label: "Music" },
  { value: "crafts", label: "Crafts" },
  { value: "toys", label: "Toys" },
];

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
  const createFn = useServerFn(createArtifact);
  const uploadFn = useServerFn(uploadArtifactImage);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");

  // Form fields
  const [nameBm, setNameBm] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

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

        {/* Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name (BM)
            </label>
            <input
              value={nameBm}
              onChange={(e) => setNameBm(e.target.value)}
              placeholder="Nama dalam Bahasa Melayu"
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
              required
            />
          </div>
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
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Era */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Era (BM)
            </label>
            <input
              value={eraBm}
              onChange={(e) => setEraBm(e.target.value)}
              placeholder="Abad ke-15"
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
              required
            />
          </div>
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
        </div>

        {/* Origin */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Origin (BM)
            </label>
            <input
              value={originBm}
              onChange={(e) => setOriginBm(e.target.value)}
              placeholder="Asal dalam BM"
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
              required
            />
          </div>
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
        </div>

        {/* Material */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Material (BM)
            </label>
            <input
              value={materialBm}
              onChange={(e) => setMaterialBm(e.target.value)}
              placeholder="Bahan dalam BM"
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
              required
            />
          </div>
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
        </div>

        {/* Description */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description (BM)
            </label>
            <textarea
              value={descBm}
              onChange={(e) => setDescBm(e.target.value)}
              placeholder="Penerangan panjang dalam Bahasa Melayu..."
              rows={4}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 resize-y"
              required
            />
          </div>
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
      </div>
    </form>
  );
}
