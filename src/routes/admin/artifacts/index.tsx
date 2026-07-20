import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, Package } from "lucide-react";

export const Route = createFileRoute("/admin/artifacts/")({
  component: AdminArtifactsList,
});

const CATEGORY_EMOJI: Record<string, string> = {
  weapons: "🗡️",
  regalia: "👑",
  music: "🎵",
  crafts: "🧵",
  toys: "🪀",
};

async function fetchAllArtifacts() {
  const { data } = await supabase
    .from("artifacts")
    .select("id, name_en, name_bm, category")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

function AdminArtifactsList() {
  const { data: artifacts, isLoading } = useQuery({
    queryKey: ["admin-all-artifacts"],
    queryFn: fetchAllArtifacts,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Artifacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {artifacts?.length ?? 0} artifacts in the collection
          </p>
        </div>
        <Link
          to="/admin/artifacts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          <PlusCircle className="size-4" />
          Add New
        </Link>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {artifacts?.map((a) => (
            <Link
              key={a.id}
              to="/admin/artifacts/$id"
              params={{ id: a.id }}
              className="flex items-center gap-3 rounded-xl border-2 border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-lg">
                {CATEGORY_EMOJI[a.category] ?? "📦"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{a.name_en}</p>
                <p className="text-xs text-muted-foreground capitalize">{a.category}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">{a.id}</span>
            </Link>
          ))}
          {(!artifacts || artifacts.length === 0) && (
            <div className="col-span-full flex flex-col items-center gap-4 py-16 text-center">
              <Package className="size-12 text-muted-foreground/30" />
              <div>
                <p className="font-display text-lg text-ink">No artifacts yet</p>
                <p className="text-sm text-muted-foreground">Create your first artifact to get started.</p>
              </div>
              <Link
                to="/admin/artifacts/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <PlusCircle className="size-4" />
                Add Artifact
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
