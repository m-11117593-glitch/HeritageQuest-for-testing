import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Create Artifact ──

const createArtifactInput = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be kebab-case"),
  category: z.string().min(1),
  name_bm: z.string().min(1),
  name_en: z.string().min(1),
  description_bm: z.string().min(1),
  description_en: z.string().min(1),
  era_bm: z.string().min(1),
  era_en: z.string().min(1),
  origin_bm: z.string().min(1),
  origin_en: z.string().min(1),
  material_bm: z.string().min(1),
  material_en: z.string().min(1),
  image_url: z.string().nullable().optional(),
  image_url_2: z.string().nullable().optional(),
  image_url_3: z.string().nullable().optional(),
});

export const createArtifact = createServerFn({ method: "POST" })
  .inputValidator((d) => createArtifactInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    // Get the next sort_order
    const { data: maxOrder } = await sa
      .from("artifacts")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (maxOrder?.sort_order ?? 0) + 1;

    const { error } = await sa.from("artifacts").insert({
      id: data.id,
      category: data.category,
      name_bm: data.name_bm,
      name_en: data.name_en,
      description_bm: data.description_bm,
      description_en: data.description_en,
      era_bm: data.era_bm,
      era_en: data.era_en,
      origin_bm: data.origin_bm,
      origin_en: data.origin_en,
      material_bm: data.material_bm,
      material_en: data.material_en,
      image_url: data.image_url ?? null,
      image_url_2: data.image_url_2 ?? null,
      image_url_3: data.image_url_3 ?? null,
      sort_order: nextSortOrder,
      icon: "archive",
    });

    if (error) throw new Error(`Failed to create artifact: ${error.message}`);
    return { ok: true, id: data.id };
  });

// ── Upload Image to Supabase Storage ──

const uploadImageInput = z.object({
  artifactId: z.string().min(1),
  fileIndex: z.number().int().min(0).max(2),
  fileName: z.string().min(1),
  fileBase64: z.string().min(1), // base64-encoded image data
});

export const uploadArtifactImage = createServerFn({ method: "POST" })
  .inputValidator((d) => uploadImageInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    // Decode base64 to buffer
    const base64Data = data.fileBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const ext = data.fileName.split(".").pop() ?? "jpg";
    const storagePath = `${data.artifactId}/image-${data.fileIndex + 1}.${ext}`;

    const { error: uploadErr } = await sa.storage
      .from("artifact-images")
      .upload(storagePath, buffer, {
        contentType: `image/${ext === "png" ? "png" : ext === "webp" ? "webp" : "jpeg"}`,
        upsert: true,
      });

    if (uploadErr) throw new Error(`Failed to upload image: ${uploadErr.message}`);

    // Get public URL
    const { data: publicUrl } = sa.storage
      .from("artifact-images")
      .getPublicUrl(storagePath);

    return { ok: true, url: publicUrl.publicUrl };
  });

// ── Generate Quiz Questions (Phase 6 placeholder) ──
export const generateQuizQuestions = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ artifactId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    const { data: artifact } = await sa
      .from("artifacts")
      .select("id, name_bm, name_en, category, era_bm, era_en, origin_bm, origin_en, material_bm, material_en, description_bm, description_en")
      .eq("id", data.artifactId)
      .maybeSingle();

    if (!artifact) throw new Error("Artifact not found");

    // Phase 6: Integrate OpenRouter AI here
    return {
      ok: true,
      message: "AI generation coming in Phase 6",
      questions: [],
    };
  });
