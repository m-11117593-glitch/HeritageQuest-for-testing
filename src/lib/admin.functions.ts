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

// ── Ensure storage bucket exists (auto-create if missing) ──
async function ensureBucket(sa: any): Promise<void> {
  const { data: buckets } = await sa.storage.listBuckets();
  if (!buckets?.find((b: any) => b.id === "artifact-images")) {
    await sa.storage.createBucket("artifact-images", {
      public: true,
      file_size_limit: 5242880,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    });
  }
}

// ── Upload Image to Supabase Storage ──

const uploadImageInput = z.object({
  artifactId: z.string().min(1),
  fileIndex: z.number().int().min(0).max(2),
  fileName: z.string().min(1),
  fileBase64: z.string().min(1),
});

export const uploadArtifactImage = createServerFn({ method: "POST" })
  .inputValidator((d) => uploadImageInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    // Auto-create bucket if missing
    await ensureBucket(sa);

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

// ── Update Artifact ──

const updateArtifactInput = z.object({
  id: z.string().min(1),
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

export const updateArtifact = createServerFn({ method: "POST" })
  .inputValidator((d) => updateArtifactInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    const { error } = await sa
      .from("artifacts")
      .update({
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
      })
      .eq("id", data.id);

    if (error) throw new Error(`Failed to update artifact: ${error.message}`);
    return { ok: true, id: data.id };
  });

// ── Delete Artifact ──

const deleteArtifactInput = z.object({
  id: z.string().min(1),
});

export const deleteArtifact = createServerFn({ method: "POST" })
  .inputValidator((d) => deleteArtifactInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    // 1. Delete storage images for this artifact folder
    const { data: files } = await sa.storage
      .from("artifact-images")
      .list(data.id);

    if (files && files.length > 0) {
      const paths = files.map((f: any) => `${data.id}/${f.name}`);
      await sa.storage.from("artifact-images").remove(paths);
    }

    // 2. Delete user_artifact_progress rows
    await sa.from("user_artifact_progress").delete().eq("artifact_id", data.id);

    // 3. Delete artifact quest progress if any
    await sa.from("user_artifact_quest_progress").delete().eq("artifact_id", data.id);

    // 4. Delete the artifact itself
    const { error } = await sa.from("artifacts").delete().eq("id", data.id);

    if (error) throw new Error(`Failed to delete artifact: ${error.message}`);
    return { ok: true };
  });

// ── Quiz Question CRUD ──

const quizQuestionSchema = z.object({
  id: z.string().uuid().optional(), // omitted = create, present = update
  artifact_id: z.string().min(1),
  prompt_bm: z.string().min(1),
  prompt_en: z.string().min(1),
  options_bm: z.array(z.string()).length(4),
  options_en: z.array(z.string()).length(4),
  correct_index: z.number().int().min(0).max(3),
  difficulty: z.number().int().min(1).max(5),
  sort_order: z.number().int().optional(),
});

export const saveQuizQuestion = createServerFn({ method: "POST" })
  .inputValidator((d) => quizQuestionSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    const payload = {
      artifact_id: data.artifact_id,
      prompt_bm: data.prompt_bm,
      prompt_en: data.prompt_en,
      options_bm: JSON.stringify(data.options_bm),
      options_en: JSON.stringify(data.options_en),
      correct_index: data.correct_index,
      difficulty: data.difficulty,
      sort_order: data.sort_order ?? 0,
    };

    if (data.id) {
      // Update existing
      const { error } = await sa
        .from("artifact_quiz_questions")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", data.id);

      if (error) throw new Error(`Failed to update question: ${error.message}`);
      return { ok: true, id: data.id };
    } else {
      // Create new
      const { data: inserted, error } = await sa
        .from("artifact_quiz_questions")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw new Error(`Failed to create question: ${error.message}`);
      return { ok: true, id: inserted.id };
    }
  });

export const deleteQuizQuestion = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    const { error } = await sa
      .from("artifact_quiz_questions")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(`Failed to delete question: ${error.message}`);
    return { ok: true };
  });

export const getQuizQuestions = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ artifactId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    const { data: questions, error } = await sa
      .from("artifact_quiz_questions")
      .select("*")
      .eq("artifact_id", data.artifactId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`Failed to fetch questions: ${error.message}`);
    return { ok: true, questions: questions ?? [] };
  });
