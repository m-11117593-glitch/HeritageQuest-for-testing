import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { User, UserPlus, UserX, Search, Clock, X, Check, Loader2, Users, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";
import {
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  searchUsers,
  type FriendUser,
} from "@/lib/museum.functions";

export const Route = createFileRoute("/_authenticated/friends")({
  component: FriendsPage,
});

function FriendsPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "pending" | "search">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string }> | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const getFriendsFn = useServerFn(getFriends);
  const sendReqFn = useServerFn(sendFriendRequest);
  const acceptReqFn = useServerFn(acceptFriendRequest);
  const declineReqFn = useServerFn(declineFriendRequest);
  const removeFn = useServerFn(removeFriend);
  const searchFn = useServerFn(searchUsers);

  const { data: friends } = useQuery({
    queryKey: ["friends"],
    queryFn: () => getFriendsFn(),
    refetchInterval: 15_000,
  });

  const allFriends = friends ?? [];
  const accepted = allFriends.filter((f) => f.status === "accepted");
  const pending = allFriends.filter((f) => f.status === "pending");
  const sent = allFriends.filter((f) => f.status === "sent");

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchFn({ data: { q: searchQuery.trim() } });
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(receiverId: string) {
    setBusyId(receiverId);
    try {
      const res = await sendReqFn({ data: { receiverId } });
      if (res.ok) {
        sfx.pop();
        qc.invalidateQueries({ queryKey: ["friends"] });
      } else {
        sfx.error();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleAccept(senderId: string) {
    setBusyId(senderId);
    try {
      await acceptReqFn({ data: { receiverId: senderId } });
      sfx.success();
      qc.invalidateQueries({ queryKey: ["friends"] });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(senderId: string) {
    setBusyId(senderId);
    try {
      await declineReqFn({ data: { receiverId: senderId } });
      sfx.pop();
      qc.invalidateQueries({ queryKey: ["friends"] });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(userId: string) {
    setBusyId(userId);
    try {
      await removeFn({ data: { receiverId: userId } });
      sfx.pop();
      qc.invalidateQueries({ queryKey: ["friends"] });
    } finally {
      setBusyId(null);
    }
  }

  function viewProfile(userId: string) {
    sfx.pop();
    navigate({ to: "/profile/$userId", params: { userId } });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("nav_friends")}</p>
            <h1 className="font-display text-3xl">{t("friends_title")}</h1>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => { setTab("all"); sfx.tap(); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              <Users className="mr-1 inline size-3.5" />
              {accepted.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-[10px]">{accepted.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setTab("pending"); sfx.tap(); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "pending" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              <Clock className="mr-1 inline size-3.5" />
              {pending.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive/20 px-1.5 text-[10px] text-destructive">{pending.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setTab("search"); sfx.tap(); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "search" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              <Search className="mr-1 inline size-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Search Tab ─── */}
      {tab === "search" && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t("friends_search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className="flex-1 rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/60"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="bounce-soft rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-50"
            >
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </button>
          </div>

          {searchResults !== null && (
            <div className="mt-4">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("friends_no_results")}</p>
              ) : (
                <ul className="space-y-2">
                  {searchResults.map((u) => {
                    const alreadySent = sent.some((f) => f.userId === u.id);
                    const alreadyAccepted = accepted.some((f) => f.userId === u.id);
                    const alreadyPending = pending.some((f) => f.userId === u.id);
                    return (
                      <li key={u.id} className="game-card flex items-center gap-3 p-3">
                        <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-accent to-secondary text-xs font-display text-ink shadow-sm">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <button
                          type="button"
                          onClick={() => viewProfile(u.id)}
                          className="flex-1 text-left font-display text-sm hover:text-primary transition-colors"
                        >
                          {u.username}
                        </button>
                        {alreadyAccepted ? (
                          <span className="chip border-jungle/40 bg-jungle/10 text-jungle text-[10px]">{t("friends_title")}</span>
                        ) : alreadyPending ? (
                          <span className="chip border-amber-400/40 bg-amber-50 text-amber-700 text-[10px]">{t("friends_pending")}</span>
                        ) : alreadySent ? (
                          <span className="chip border-muted-foreground/40 text-muted-foreground text-[10px]">{t("friends_sent")}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendRequest(u.id)}
                            disabled={busyId === u.id}
                            className="bounce-soft inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            {busyId === u.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <UserPlus className="size-3" />
                            )}
                            {t("friends_send_request")}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Pending Tab ─── */}
      {tab === "pending" && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {pending.length === 0 && sent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("friends_no_requests")}</p>
          ) : (
            <div className="space-y-4">
              {/* Incoming */}
              {pending.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("friends_requests")} ({pending.length})
                  </p>
                  <ul className="space-y-2">
                    {pending.map((f) => (
                      <li key={f.userId} className="game-card flex items-center gap-3 p-3">
                        <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-accent to-secondary text-xs font-display text-ink shadow-sm">
                          {f.username.charAt(0).toUpperCase()}
                        </div>
                        <button
                          type="button"
                          onClick={() => viewProfile(f.userId)}
                          className="flex-1 text-left font-display text-sm hover:text-primary transition-colors"
                        >
                          {f.username}
                        </button>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAccept(f.userId)}
                            disabled={busyId === f.userId}
                            className="bounce-soft inline-flex items-center gap-1 rounded-full bg-jungle px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                          >
                            <Check className="size-3" />
                            {t("friends_accept")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecline(f.userId)}
                            disabled={busyId === f.userId}
                            className="bounce-soft inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-[11px] font-semibold text-destructive-foreground disabled:opacity-50"
                          >
                            <X className="size-3" />
                            {t("friends_decline")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sent */}
              {sent.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("friends_sent")} ({sent.length})
                  </p>
                  <ul className="space-y-2">
                    {sent.map((f) => (
                      <li key={f.userId} className="game-card flex items-center gap-3 p-3 opacity-70">
                        <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-accent to-secondary text-xs font-display text-ink shadow-sm">
                          {f.username.charAt(0).toUpperCase()}
                        </div>
                        <button
                          type="button"
                          onClick={() => viewProfile(f.userId)}
                          className="flex-1 text-left font-display text-sm hover:text-primary transition-colors"
                        >
                          {f.username}
                        </button>
                        <span className="chip text-xs">{t("friends_pending")}</span>
                        <button
                          type="button"
                          onClick={() => handleDecline(f.userId)}
                          disabled={busyId === f.userId}
                          className="bounce-soft inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground disabled:opacity-50"
                        >
                          <X className="size-3" />
                          {t("friends_cancel")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── All Friends Tab ─── */}
      {tab === "all" && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {accepted.length === 0 ? (
            <div className="game-card flex flex-col items-center gap-4 p-10 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-accent/30">
                <Users className="size-8 text-primary" />
              </div>
              <div>
                <p className="font-display text-lg">{t("friends_no_friends")}</p>
                <button
                  type="button"
                  onClick={() => { setTab("search"); sfx.tap(); }}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Search className="size-3.5" />
                  {t("friends_search_placeholder")}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accepted.map((f) => (
                <div
                  key={f.userId}
                  className="game-card flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-indigo text-white text-sm font-display shadow-sm">
                    {f.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => viewProfile(f.userId)}
                      className="truncate font-display text-sm font-semibold hover:text-primary transition-colors"
                    >
                      {f.username}
                    </button>
                    <p className="text-[10px] text-muted-foreground">
                      {t("level")} {f.level} · {f.scanCount} {t("discovered_count").toLowerCase()} · {f.badgesCount} {t("nav_badges").toLowerCase()}
                    </p>
                    <button
                      type="button"
                      onClick={() => viewProfile(f.userId)}
                      className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline"
                    >
                      {t("view_all")}
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(f.userId)}
                    disabled={busyId === f.userId}
                    className="shrink-0 rounded-full border border-border p-2 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-50"
                    title={t("friends_remove")}
                  >
                    <UserX className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
