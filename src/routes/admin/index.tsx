import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  FolderKanban,
  FileQuestion,
  PlusCircle,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

async function fetchStats() {
  const [{ count: artifactCount }] = await Promise.all([
    supabase.from("artifacts").select("*", { count: "exact", head: true }),
  ]);

  const { data: categories } = await supabase.from("artifacts").select("category");
  const uniqueCategories = new Set((categories ?? []).map((a) => a.category)).size;

  const { count: quizCount } = await supabase
    .from("artifact_quiz_questions")
    .select("*", { count: "exact", head: true });

  return {
    artifactCount: artifactCount ?? 0,
    categoryCount: uniqueCategories,
    quizCount: quizCount ?? 0,
  };
}

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome to the HeritageQuest admin panel. Manage artifacts, quizzes, and categories.
        </p>
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Package}
            label="Total Artifacts"
            value={stats?.artifactCount ?? 0}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={FolderKanban}
            label="Categories"
            value={stats?.categoryCount ?? 0}
            color="bg-indigo/10 text-indigo"
          />
          <StatCard
            icon={FileQuestion}
            label="Quiz Questions"
            value={stats?.quizCount ?? 0}
            color="bg-jungle/10 text-jungle"
          />
        </div>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/admin/artifacts/new"
            className="group flex items-center gap-4 rounded-xl border-2 border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <PlusCircle className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-ink">Add New Artifact</p>
              <p className="text-xs text-muted-foreground">Create a new museum artifact with images</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/admin/artifacts"
            className="group flex items-center gap-4 rounded-xl border-2 border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-indigo/10 text-indigo">
              <Package className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-ink">Manage Artifacts</p>
              <p className="text-xs text-muted-foreground">View, edit, and manage the artifact collection</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* Recent artifacts */}
      <RecentArtifacts />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border-2 border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`grid size-10 place-items-center rounded-lg ${color}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-display text-2xl font-semibold text-ink">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function RecentArtifacts() {
  const { data: artifacts } = useQuery({
    queryKey: ["admin-recent-artifacts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("artifacts")
        .select("id, name_en, category")
        .order("sort_order", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  if (!artifacts || artifacts.length === 0) return null;

  const categoryEmoji: Record<string, string> = {
    weapons: "🗡️",
    regalia: "👑",
    music: "🎵",
    crafts: "🧵",
    toys: "🪀",
  };

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Recent Artifacts</h2>
      <div className="space-y-2">
        {artifacts.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-xl border-2 border-border bg-card px-4 py-3"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-sm">
              {categoryEmoji[a.category] ?? "📦"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{a.name_en}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{a.category}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
