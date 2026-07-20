import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Plus, Save, Trash2, Loader2, HelpCircle, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getQuizQuestions, saveQuizQuestion, deleteQuizQuestion } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/artifacts/$id/quizzes")({
  component: QuizManagerPage,
});

interface QuestionForm {
  id?: string;
  prompt_bm: string;
  prompt_en: string;
  options_bm: string[];
  options_en: string[];
  correct_index: number;
  difficulty: number;
  sort_order?: number;
}

const DIFFICULTIES = [
  { value: 1, label: "1 - Easy" },
  { value: 2, label: "2 - Medium-Easy" },
  { value: 3, label: "3 - Medium" },
  { value: 4, label: "4 - Medium-Hard" },
  { value: 5, label: "5 - Hard" },
];

const EMPTY_FORM: QuestionForm = {
  prompt_bm: "",
  prompt_en: "",
  options_bm: ["", "", "", ""],
  options_en: ["", "", "", ""],
  correct_index: 0,
  difficulty: 3,
};

function QuizManagerPage() {
  const { id: artifactId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getQuizQuestions);
  const saveFn = useServerFn(saveQuizQuestion);
  const deleteFn = useServerFn(deleteQuizQuestion);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch artifact name for the header
  const { data: artifact } = useQuery({
    queryKey: ["artifact-name", artifactId],
    queryFn: async () => {
      const { data } = await supabase
        .from("artifacts")
        .select("name_en, name_bm")
        .eq("id", artifactId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch quiz questions
  const { data: quizData, isLoading } = useQuery({
    queryKey: ["quiz-questions", artifactId],
    queryFn: () => getFn({ data: { artifactId } }),
  });

  const questions = quizData?.questions ?? [];

  function startNew() {
    const nextOrder = questions.length > 0 ? Math.max(...questions.map((q: any) => q.sort_order ?? 0)) + 1 : 0;
    setForm({ ...EMPTY_FORM, sort_order: nextOrder });
    setEditingId("new");
    setError(null);
  }

  function startEdit(q: any) {
    setForm({
      id: q.id,
      prompt_bm: q.prompt_bm,
      prompt_en: q.prompt_en,
      options_bm: q.options_bm,
      options_en: q.options_en,
      correct_index: q.correct_index,
      difficulty: q.difficulty,
    });
    setEditingId(q.id);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function updateForm(field: keyof QuestionForm, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateOption(lang: "bm" | "en", index: number, value: string) {
    const key = lang === "bm" ? "options_bm" : "options_en";
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((opt, i) => (i === index ? value : opt)),
    }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      await saveFn({
        data: {
          artifact_id: artifactId,
          prompt_bm: form.prompt_bm,
          prompt_en: form.prompt_en,
          options_bm: form.options_bm,
          options_en: form.options_en,
          correct_index: form.correct_index,
          difficulty: form.difficulty,
          sort_order: form.sort_order ?? 0,
          ...(form.id ? { id: form.id } : {}),
        },
      });
      await qc.invalidateQueries({ queryKey: ["quiz-questions", artifactId] });
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(questionId: string) {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    try {
      await deleteFn({ data: { id: questionId } });
      await qc.invalidateQueries({ queryKey: ["quiz-questions", artifactId] });
      if (editingId === questionId) cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete question");
    }
  }

  const name = artifact?.name_en ?? artifactId;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => nav({ to: "/admin/artifacts/$id", params: { id: artifactId } })}
          className="grid size-9 place-items-center rounded-xl border-2 border-border text-muted-foreground hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-ink">Quiz Questions</h1>
          <p className="text-sm text-muted-foreground">
            For: <Link to="/admin/artifacts/$id" params={{ id: artifactId }} className="underline hover:text-ink">{name}</Link>
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          disabled={editingId !== null}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40"
        >
          <Plus className="size-4" />
          Add Question
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground flex items-start gap-3">
        <HelpCircle className="size-5 shrink-0 mt-0.5 text-primary" />
        <div>
          <p className="font-medium text-ink">How quiz questions work</p>
          <p className="mt-1">
            When an artifact has saved questions here, users will see these instead of the auto-generated ones.
            If no questions are saved, the default auto-generated questions will be used.
          </p>
        </div>
      </div>

      {/* Edit/Create Form */}
      {editingId !== null && (
        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <h2 className="font-display text-lg font-semibold text-ink">
            {form.id ? "Edit Question" : "New Question"}
          </h2>

          {/* Prompt */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question (BM)</label>
              <textarea
                value={form.prompt_bm}
                onChange={(e) => updateForm("prompt_bm", e.target.value)}
                rows={2}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 resize-y"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question (EN)</label>
              <textarea
                value={form.prompt_en}
                onChange={(e) => updateForm("prompt_en", e.target.value)}
                rows={2}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 resize-y"
                required
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Answer Options
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold ${i === form.correct_index ? "bg-jungle text-white" : "bg-muted text-muted-foreground"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {i === form.correct_index ? "✓ Correct" : `Option ${i + 1}`}
                    </span>
                    {i !== form.correct_index && (
                      <button
                        type="button"
                        onClick={() => updateForm("correct_index", i)}
                        className="ml-auto text-[10px] font-medium text-primary hover:underline"
                      >
                        Mark correct
                      </button>
                    )}
                  </div>
                  <input
                    value={form.options_bm[i]}
                    onChange={(e) => updateOption("bm", i, e.target.value)}
                    placeholder={`BM option ${i + 1}`}
                    className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                    required
                  />
                  <input
                    value={form.options_en[i]}
                    onChange={(e) => updateOption("en", i, e.target.value)}
                    placeholder={`EN option ${i + 1}`}
                    className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => updateForm("difficulty", parseInt(e.target.value))}
              className="w-full max-w-xs rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving..." : "Save Question"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-xl border-2 border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : questions.length === 0 && editingId === null ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <HelpCircle className="size-12 text-muted-foreground/30" />
          <div>
            <p className="font-display text-lg text-ink">No custom questions yet</p>
            <p className="text-sm text-muted-foreground">
              Users will see auto-generated questions based on the artifact's data.
            </p>
          </div>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" />
            Add First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q: any, idx: number) => (
            <div
              key={q.id}
              className={`rounded-xl border-2 bg-card transition-all ${
                editingId === q.id ? "border-primary/30" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4 p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-xs font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{q.prompt_en}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.prompt_bm}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-accent px-2 py-0.5 text-muted-foreground">
                        Lv. {q.difficulty}
                      </span>
                    </div>
                  </div>
                  {/* Options preview */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {(q.options_en as string[]).map((opt: string, i: number) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] ${
                          i === q.correct_index
                            ? "bg-jungle/10 text-jungle font-medium"
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <span className={`grid size-4 place-items-center rounded text-[9px] font-bold ${
                          i === q.correct_index ? "bg-jungle text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(q)}
                    className="grid size-8 place-items-center rounded-lg border-2 border-border text-muted-foreground hover:text-ink transition-colors"
                    title="Edit"
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    className="grid size-8 place-items-center rounded-lg border-2 border-border text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
