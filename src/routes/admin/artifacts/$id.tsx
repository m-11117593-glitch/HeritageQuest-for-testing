import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { ArrowLeft, Upload, Save, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateArtifact, uploadArtifactImage } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/artifacts/$id")({
  component: EditArtifactPage,
});

const CATEGORIES = [
  { value: "weapons", label: "Weapons" },
  { value: "regalia", label: "Regalia" },
  { value: "music", label: "Music" },
  { value: "crafts", label: "Crafts" },
  { value: "toys", label: "Toys" },
];

function EditArtifactPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const updateFn = useServerFn(updateArtifact);
  const uploadFn = useServerFn(uploadArtifactImage);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

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
          <h1 className="font-display text-2xl font-semibold text-ink">Edit Artifact</h1>
          <p className="text-sm text-muted-foreground">ID: <code className="rounded bg-accent px-1.5 py-0.5 text-xs">{id}</code></p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="rounded-xl border-2 border-jungle/40 bg-jungle/10 px-4 py-3 text-sm text-jungle font-medium">
          Artifact updated successfully!{" "}
          <button type="button" onClick={() => nav({ to: "/admin/artifacts" })} className="underline">
            Back to artifacts
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
        {/* Name */}
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

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Era */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Era (BM)</label>
            <input value={eraBm} onChange={(e) => setEraBm(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Era (EN)</label>
            <input value={eraEn} onChange={(e) => setEraEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
        </div>

        {/* Origin */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origin (BM)</label>
            <input value={originBm} onChange={(e) => setOriginBm(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origin (EN)</label>
            <input value={originEn} onChange={(e) => setOriginEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
        </div>

        {/* Material */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material (BM)</label>
            <input value={materialBm} onChange={(e) => setMaterialBm(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material (EN)</label>
            <input value={materialEn} onChange={(e) => setMaterialEn(e.target.value)} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50" required />
          </div>
        </div>

        {/* Description */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (BM)</label>
            <textarea value={descBm} onChange={(e) => setDescBm(e.target.value)} rows={4} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 resize-y" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (EN)</label>
            <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={4} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 resize-y" required />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="space-y-4 rounded-xl border-2 border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Images</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const existingUrl = imageUrls[index];
            const newPreview = newImagePreviews[index];
            const hasNew = newPreview !== null;
            const displayUrl = hasNew ? newPreview : existingUrl;

            return (
              <div key={index}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Image {index + 1}</p>
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
                    <span className="text-xs">Upload image</span>
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
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" onClick={() => nav({ to: "/admin/artifacts" })} className="rounded-xl border-2 border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
