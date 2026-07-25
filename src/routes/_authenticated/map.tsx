import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Lock, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { artifactImageUrl } from "@/lib/artifact-images";
import { sfx } from "@/lib/sfx";
import { ArtifactModal } from "@/components/ArtifactModal";
import type { ScanResult } from "@/lib/museum.functions";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  PIN_POSITIONS,
  ZONE_LAYOUT,
  TOTAL_ARTIFACTS,
  ROUTE_ORDER,
  ENTRANCE_POSITION,
  ROUTE_INDEX,
  type CategoryKey,
} from "@/lib/museum";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

type MapArtifact = {
  id: string;
  category: string;
  name_bm: string;
  name_en: string;
  description_bm: string;
  description_en: string;
  era_bm: string;
  era_en: string;
  origin_bm: string;
  origin_en: string;
  material_bm: string;
  material_en: string;
  image_url: string | null;
  sort_order: number;
};

async function fetchMap() {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  const [{ data: artifacts }, { data: progress }] = await Promise.all([
    supabase
      .from("artifacts")
      .select(
        "id, category, name_bm, name_en, description_bm, description_en, era_bm, era_en, origin_bm, origin_en, material_bm, material_en, image_url, sort_order",
      )
      .order("sort_order"),
    supabase.from("user_artifact_progress").select("*").eq("user_id", uid ?? ""),
  ]);

  const progressMap = new Map((progress ?? []).map((p) => [p.artifact_id, p]));
  const scannedSet = new Set((progress ?? []).map((r) => r.artifact_id));

  return {
    artifacts: (artifacts ?? []) as MapArtifact[],
    scannedSet,
    progressMap,
  };
}

function toReadOnlyResult(a: MapArtifact, progress?: any): ScanResult {
  return {
    alreadyScanned: true,
    expGained: 0,
    totalExp: 0,
    level: 0,
    levelUps: 0,
    pointsGained: 0,
    totalPoints: 0,
    newBadges: [],
    newQuests: [],
    newAchievements: [],
    quizCorrectCount: progress?.quiz_correct_count ?? null,
    quizTotalQuestions: progress?.quiz_total_questions ?? null,
    hardCorrectBonus: false,
    uniqueQuest: null,
    offeredUniqueQuest: null,
    artifact: a,
  };
}

function MapPage() {
  const { t, lang } = useI18n();
  const { data } = useQuery({ queryKey: ["map"], queryFn: fetchMap });
  const artifacts = data?.artifacts ?? [];
  const scannedSet = data?.scannedSet ?? new Set<string>();
  const progressMap = data?.progressMap ?? new Map();
  const totalScanned = scannedSet.size;
  const pct = Math.round((totalScanned / TOTAL_ARTIFACTS) * 100);

  // Compute all unique categories from the DB, preserving CATEGORY_ORDER first
  const categoryEntries = useMemo(() => {
    const seen = new Set<string>();
    const entries: { cat: string; isKnown: boolean }[] = [];
    // Known categories first, in order
    for (const cat of CATEGORY_ORDER) {
      seen.add(cat);
      entries.push({ cat, isKnown: true });
    }
    // Custom categories from DB, appended after known ones
    for (const a of artifacts) {
      if (!seen.has(a.category)) {
        seen.add(a.category);
        entries.push({ cat: a.category, isKnown: false });
      }
    }
    return entries;
  }, [artifacts]);

  // Generate fallback meta for custom categories
  function categoryMeta(cat: string, customIndex?: number): { emoji: string; color: string; bg: string } {
    if (cat in CATEGORY_META) {
      return CATEGORY_META[cat as CategoryKey];
    }
    // Reserve hues well-separated from known ones (known: 25, 60, 165, 265, 330)
    const reserveHues = [95, 200, 140, 300, 240, 310, 110, 230, 350, 80, 175, 285];
    const idx = typeof customIndex === 'number' ? customIndex : cat.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hue = reserveHues[idx % reserveHues.length];
    return {
      emoji: "📦",
      color: `oklch(0.55 0.10 ${hue})`,
      bg: `oklch(0.93 0.04 ${hue})`,
    };
  }

  const [selected, setSelected] = useState<MapArtifact | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  /** Find the next unscanned artifact along the suggested route. */
  const nextRouteArtifact = useMemo(() => {
    for (const id of ROUTE_ORDER) {
      if (!scannedSet.has(id)) {
        return artifacts.find((a) => a.id === id) ?? null;
      }
    }
    return null;
  }, [artifacts, scannedSet]);

  function openArtifact(a: MapArtifact) {
    if (!scannedSet.has(a.id)) {
      sfx.error();
      setLockedNote(a.id);
      window.setTimeout(() => setLockedNote((cur) => (cur === a.id ? null : cur)), 1600);
      return;
    }
    sfx.pop();
    setPulseId(a.id);
    window.setTimeout(() => setPulseId((cur) => (cur === a.id ? null : cur)), 420);
    setSelected(a);
  }

  // Custom category names (for lookups)
  const customCatNames = useMemo(
    () => categoryEntries.filter(({ isKnown }) => !isKnown).map(({ cat }) => cat),
    [categoryEntries]
  );

  // ─── Equal-height zone layout for ALL categories ───
  // Categories arranged in rows of 2. When total is odd the last category spans full width.
  // This ensures the 5th (toys) and 6th (custom) share the same row at equal height.
  const allZoneRects = useMemo(() => {
    const cats = categoryEntries.map(({ cat }) => cat);
    const total = cats.length;
    const rows = Math.ceil(total / 2);
    const gap = 4;
    const topPad = 4;
    const zoneH = Math.floor((100 - topPad - 2 - (rows - 1) * gap) / rows);

    return cats.map((cat, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const isLastOdd = total % 2 !== 0 && i === total - 1;
      const isKnown = cat in CATEGORY_META;
      const knownSrc = isKnown ? ZONE_LAYOUT[cat as CategoryKey] : null;
      return {
        cat,
        meta: isKnown ? CATEGORY_META[cat as CategoryKey] : categoryMeta(cat, i - 5),
        z: {
          x: isLastOdd ? 4 : 4 + col * 48,
          y: topPad + row * (zoneH + gap),
          w: isLastOdd ? 92 : 46,
          h: zoneH,
          label_bm: knownSrc?.label_bm,
          label_en: knownSrc?.label_en,
        },
        isKnown,
      };
    });
  }, [categoryEntries]);

  // ─── Pin positions: original for known, dynamic for custom ───
  // If a known pin falls outside its zone (e.g. toys halved), snap it inside.
  const allPinPositions = useMemo(() => {
    const pos = { ...PIN_POSITIONS };

    // Snap any known pin that falls outside its zone — distribute evenly
    for (const zr of allZoneRects) {
      if (!zr.isKnown) continue;
      const { x, y, w } = zr.z;
      const margin = 2.5;
      const toSnap: { id: string; origIdx: number }[] = [];
      for (const [id, p] of Object.entries(PIN_POSITIONS)) {
        const art = artifacts.find((a) => a.id === id);
        if (!art || art.category !== zr.cat) continue;
        if (p.x < x + margin || p.x > x + w - margin) {
          toSnap.push({ id, origIdx: ROUTE_INDEX[id] ?? 0 });
        }
      }
      toSnap.sort((a, b) => a.origIdx - b.origIdx);
      toSnap.forEach(({ id }, i) => {
        const step = w / (toSnap.length + 1);
        pos[id] = { x: x + step * (i + 1), y: PIN_POSITIONS[id].y };
      });
    }

    // Dynamic pins for custom artifacts
    const customZones = allZoneRects.filter((r) => !r.isKnown);
    for (const zone of customZones) {
      const items = artifacts.filter((a) => a.category === zone.cat);
      const total = items.length;
      if (!total) continue;
      const cols = Math.min(total, 4);
      const spacing = zone.z.w / (cols + 1);
      const cy = zone.z.y + zone.z.h / 2;
      items.forEach((a, i) => {
        pos[a.id] = {
          x: zone.z.x + spacing * (i % cols + 1),
          y: cy,
        };
      });
    }

    return pos;
  }, [allZoneRects, artifacts]);

  // Dynamic route path — follows the actual pin positions (including snapped ones)
  const dynamicRoutePathD = useMemo(() => {
    const points = ROUTE_ORDER.map((id) => allPinPositions[id]).filter(Boolean);
    if (!points.length) return '';
    let d = `M ${ENTRANCE_POSITION.x} ${ENTRANCE_POSITION.y}`;
    for (const p of points) {
      d += ` L ${p.x} ${p.y}`;
    }
    return d;
  }, [allPinPositions]);

  // Quick map from category → meta, so pins use the same colors as their zone
  const categoryMetaMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof categoryMeta>>();
    for (const zr of allZoneRects) m.set(zr.cat, zr.meta);
    return m;
  }, [allZoneRects]);

  const artifactCount = artifacts.length;
  const pctTotal = Math.round((totalScanned / Math.max(artifactCount, TOTAL_ARTIFACTS)) * 100);
  const allDone = totalScanned >= artifactCount;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* ─── Left: Floorplan Map ─── */}
      <section className="game-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              {t("tagline")}
            </p>
            <h1 className="font-display text-2xl">{t("nav_map")}</h1>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl text-primary">
              {totalScanned}
              <span className="text-sm text-muted-foreground">/{artifactCount}</span>
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("discovered_count")}
            </p>
          </div>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full border border-border bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-500 ease-out"
            style={{ width: `${pctTotal}%` }}
          />
        </div>

        {/* ─── SVG Floorplan ─── */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-parchment">
          <svg viewBox="0 0 100 100" className="block h-auto w-full">
            {/* Subtle grid pattern */}
            <defs>
              <pattern id="map-grid" patternUnits="userSpaceOnUse" width="5" height="5">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="oklch(0.6 0.02 50 / 0.06)" strokeWidth="0.15" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#map-grid)" />

            {allZoneRects.map(({ cat, meta, z, isKnown }) => {
              const items = artifacts.filter((a) => a.category === cat);
              const done = items.filter((a) => scannedSet.has(a.id)).length;
              const zonePct = items.length ? done / items.length : 0;
              const isHovered = hoveredZone === cat;

              return (
                <g
                  key={cat}
                  onMouseEnter={() => setHoveredZone(cat)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ cursor: "default" }}
                >
                  {/* Zone body */}
                  <rect
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx={2.5}
                    fill={isHovered ? meta.bg : "oklch(1 0 0 / 0.3)"}
                    stroke={meta.color}
                    strokeOpacity={isHovered ? 0.8 : 0.35}
                    strokeWidth={isHovered ? 0.5 : 0.3}
                    style={{ transition: "fill 200ms ease, stroke-opacity 200ms ease, stroke-width 200ms ease" }}
                  />
                  {/* Zone progress fill */}
                  <rect
                    x={z.x}
                    y={z.y + z.h * (1 - zonePct)}
                    width={z.w}
                    height={z.h * zonePct}
                    rx={2.5}
                    fill={meta.color}
                    fillOpacity={isHovered ? 0.15 : 0.08}
                    style={{ transition: "fill-opacity 200ms ease" }}
                  />
                  {/* Zone label — same font size for all */}
                  <text
                    x={z.x + z.w / 2}
                    y={z.y + (z.h < 10 ? 3 : 5)}
                    fontSize={2.4}
                    textAnchor="middle"
                    fill={meta.color}
                    fontFamily="Fredoka, sans-serif"
                    fontWeight={600}
                    opacity={isHovered ? 1 : 0.8}
                    style={{ transition: "opacity 200ms ease" }}
                  >
                    {isKnown
                      ? (lang === "bm" ? (z.label_bm ?? cat) : (z.label_en ?? cat))
                      : `${meta.emoji} ${cat}`}
                  </text>
                  {/* Zone progress count */}
                  <text
                    x={z.x + z.w - 2}
                    y={z.y + z.h - 2}
                    fontSize={2}
                    textAnchor="end"
                    fill={meta.color}
                    fontFamily="Nunito, sans-serif"
                    fontWeight={500}
                    fillOpacity={0.5}
                  >
                    {done}/{items.length}
                  </text>
                </g>
              );
            })}

            {/* Dynamically compute route path + extension to custom zones */}
            {(() => {
              const customZonesBelow = allZoneRects.filter((r) => !r.isKnown).map((r) => r.z);
              const extD = customZonesBelow.length > 0
                ? (() => {
                    const lastRouteId = ROUTE_ORDER[ROUTE_ORDER.length - 1];
                    const lastPin = allPinPositions[lastRouteId];
                    if (!lastPin) return '';
                    // Connect to center of first custom zone
                    const firstCustom = customZonesBelow[0];
                    const cx = firstCustom.x + firstCustom.w / 2;
                    const cy = firstCustom.y + firstCustom.h / 2;
                    return ` M ${lastPin.x} ${lastPin.y} L ${cx} ${cy}`;
                  })()
                : '';
              const fullD = dynamicRoutePathD + extD;
              return (
                <>
                  <path
                    d={fullD}
                    fill="none"
                    stroke="oklch(0.55 0.08 25 / 0.55)"
                    strokeWidth={0.65}
                    strokeDasharray="0.8 0.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="4s" repeatCount="indefinite" />
                  </path>
                  {/* Glow beneath route path for depth */}
                  <path
                    d={fullD}
                    fill="none"
                    stroke="oklch(0.55 0.08 25 / 0.15)"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              );
            })()}

            {/* Entrance marker */}
            <g>
              <circle cx={ENTRANCE_POSITION.x} cy={ENTRANCE_POSITION.y} r={1.2} fill="oklch(0.6 0.12 165)" />
              <circle cx={ENTRANCE_POSITION.x} cy={ENTRANCE_POSITION.y} r={2} fill="none" stroke="oklch(0.6 0.12 165)" strokeWidth={0.3} strokeOpacity={0.4} />
              <text
                x={ENTRANCE_POSITION.x + 2.5}
                y={ENTRANCE_POSITION.y + 0.5}
                fontSize={1.8}
                fill="oklch(0.6 0.12 165)"
                fontFamily="Nunito, sans-serif"
                fontWeight={600}
              >
                {lang === "bm" ? "Masuk" : "Enter"}
              </text>
            </g>

            {/* Artifact pins — use allPinPositions (known + dynamic) */}
            {artifacts.map((a) => {
              const p = allPinPositions[a.id];
              if (!p) return null;
              const isScanned = scannedSet.has(a.id);
              const meta = categoryMetaMap.get(a.category) ?? categoryMeta(a.category);
              const pulsing = pulseId === a.id;
              const name = lang === "bm" ? a.name_bm : a.name_en;
              const routeNum = ROUTE_INDEX[a.id] ?? null;

              return (
                <g
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  aria-label={isScanned ? name : t("map_locked_pin")}
                  onClick={() => openArtifact(a)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openArtifact(a);
                    }
                  }}
                  style={{
                    cursor: isScanned ? "pointer" : "not-allowed",
                    transformOrigin: `${p.x}px ${p.y}px`,
                    transform: pulsing ? "scale(1.35)" : "scale(1)",
                    transition: "transform 220ms cubic-bezier(.34,1.56,.64,1)",
                  }}
                >
                  {isScanned ? (
                    <>
                      {/* Pulse ring */}
                      {pulsing && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={4.5}
                          fill="none"
                          stroke={meta.color}
                          strokeOpacity={0.6}
                          strokeWidth={0.6}
                        >
                          <animate attributeName="r" from="2.6" to="6" dur="0.42s" fill="freeze" />
                          <animate attributeName="stroke-opacity" from="0.7" to="0" dur="0.42s" fill="freeze" />
                        </circle>
                      )}
                      {/* Pin circle */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={2.2}
                        fill={meta.color}
                        stroke="oklch(1 0 0)"
                        strokeWidth={0.45}
                      />
                      {/* Route number */}
                      {routeNum !== null && (
                        <text
                          x={p.x}
                          y={p.y + 0.75}
                          fontSize={1.9}
                          textAnchor="middle"
                          fill="oklch(1 0 0)"
                          fontFamily="Fredoka, sans-serif"
                          fontWeight={700}
                        >
                          {routeNum}
                        </text>
                      )}
                    </>
                  ) : (
                    <>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={2.2}
                        fill="oklch(0.94 0.01 80)"
                        stroke="oklch(0.6 0.03 260 / 0.4)"
                        strokeWidth={0.3}
                        strokeDasharray="0.4 0.4"
                      />
                      <text
                        x={p.x}
                        y={p.y + 0.8}
                        fontSize={2}
                        textAnchor="middle"
                        fill="oklch(0.55 0.03 260)"
                        fontFamily="Fredoka, sans-serif"
                        fontWeight={600}
                      >
                        ?
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Legend — all categories (known + custom) */}
            <g transform="translate(3, 1)">
              <rect x={0} y={0} width={Math.min(48 + (categoryEntries.length - 5) * 4, 65)} height={2.6} rx={1.2} fill="oklch(1 0 0 / 0.7)" stroke="oklch(0.5 0.02 260 / 0.12)" strokeWidth={0.15} />
              <text x={3} y={1.9} fontSize={1.6} fill="oklch(0.45 0.02 260)" fontFamily="Nunito, sans-serif" fontWeight={600}>
                {lang === "bm" ? "Legenda" : "Legend"}
              </text>
              {categoryEntries.map(({ cat }, i) => {
                const meta = categoryMeta(cat);
                const sx = 11 + i * 7.5;
                return (
                  <g
                    key={cat}
                    onMouseEnter={() => setHoveredZone(cat)}
                    onMouseLeave={() => setHoveredZone(null)}
                    style={{ cursor: "default" }}
                  >
                    <circle cx={sx} cy={1.3} r={0.65} fill={meta.color} />
                    <text x={sx + 1.1} y={1.85} fontSize={1.3} fill="oklch(0.4 0.02 260)" fontFamily="Nunito, sans-serif" fontWeight={500}>
                      {meta.emoji}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Compass rose — top right */}
            <g transform="translate(91, 6)">
              <circle cx={0} cy={0} r={3.5} fill="oklch(1 0 0 / 0.6)" stroke="oklch(0.5 0.02 260 / 0.2)" strokeWidth={0.2} />
              {/* North pointer */}
              <polygon points="0,-2.8 -0.8,0.8 0.8,0.8" fill="oklch(0.6 0.12 25)" />
              {/* South pointer */}
              <polygon points="-0.8,-0.8 0,2.8 0.8,-0.8" fill="oklch(0.5 0.02 260 / 0.3)" />
              {/* Labels */}
              <text x={0} y={-4} fontSize={1.6} textAnchor="middle" fill="oklch(0.6 0.12 25)" fontFamily="Nunito, sans-serif" fontWeight={700}>N</text>
              <text x={0} y={5.5} fontSize={1.4} textAnchor="middle" fill="oklch(0.5 0.02 260 / 0.4)" fontFamily="Nunito, sans-serif" fontWeight={600}>S</text>
            </g>
          </svg>

        </div>

        {/* Legend is now inside the SVG map above */}

        {/* No separate section needed — all zones are equally sized */}
        <p className="mt-3 text-xs text-muted-foreground">{t("scan_hint")}</p>

        {lockedNote && (
          <p className="mt-2 rounded-2xl border-2 border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground shake">
            {t("map_locked_pin")}
          </p>
        )}
      </section>

      {/* ─── Right: Dynamic Category List + Route Guide ─── */}
      <section className="space-y-4">
        {categoryEntries.map(({ cat, isKnown }) => {
          const items = artifacts.filter((a) => a.category === cat);
          if (items.length === 0) return null;
          const scannedCount = items.filter((a) => scannedSet.has(a.id)).length;
          const meta = categoryMeta(cat);
          const label = isKnown
            ? (lang === "bm"
                ? ZONE_LAYOUT[cat as CategoryKey]?.label_bm ?? cat
                : ZONE_LAYOUT[cat as CategoryKey]?.label_en ?? cat)
            : cat;
          return (
            <div key={cat} className="game-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="grid size-8 place-items-center rounded-full text-lg"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.emoji}
                  </span>
                  <h3 className="font-display text-lg leading-none">
                    {label}
                  </h3>
                </div>
                <span className="chip">
                  {scannedCount}/{items.length}
                </span>
              </div>
              <ul className="grid grid-cols-3 gap-2">
                {items.map((a) => {
                  const done = scannedSet.has(a.id);
                  const pulsing = pulseId === a.id;
                  const imageUrl = artifactImageUrl(a.id, a.image_url);
                  const routeNum = ROUTE_INDEX[a.id] ?? null;
                  return (
                    <li key={a.id} className="relative">
                      <button
                        type="button"
                        onClick={() => openArtifact(a)}
                        aria-label={
                          done ? (lang === "bm" ? a.name_bm : a.name_en) : t("map_locked_pin")
                        }
                        className={`group block w-full text-left transition-transform duration-200 ${done ? "cursor-pointer hover:scale-[1.03] active:scale-95" : "cursor-not-allowed"} ${pulsing ? "scale-110" : ""}`}
                      >
                        <div
                          className={`relative aspect-square overflow-hidden rounded-2xl border-2 ${done ? "border-primary/40" : "border-dashed border-border"} bg-accent/40`}
                        >
                          {done && imageUrl ? (
                            <>
                              <img
                                src={imageUrl}
                                alt={lang === "bm" ? a.name_bm : a.name_en}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                width={256}
                                height={256}
                              />
                              {/* Route number badge */}
                              {routeNum !== null && (
                                <span
                                  className="absolute left-1 top-1 grid size-5 place-items-center rounded-full text-[10px] font-bold text-white shadow-xs"
                                  style={{ background: categoryMeta(a.category).color }}
                                >
                                  {routeNum}
                                </span>
                              )}
                            </>
                          ) : (
                            <div className="grid h-full w-full place-items-center text-muted-foreground">
                              <Lock className="size-6" />
                            </div>
                          )}
                        </div>
                        {/* Hover name tooltip for scanned items */}
                        {done && (
                          <p className="mt-1 truncate text-center text-[11px] font-semibold text-ink">
                            {lang === "bm" ? a.name_bm : a.name_en}
                          </p>
                        )}
                        {!done && (
                          <p className="mt-1 truncate text-center text-[11px] font-semibold text-muted-foreground">
                            ???
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {/* ─── Route Guide Card ─── */}
        <div className="game-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <MapPin className="size-4" />
            </span>
            <h3 className="font-display text-base leading-none">
              {allDone
                ? (lang === "bm" ? "Lawatan Lengkap!" : "Visit Complete!")
                : (lang === "bm" ? "Laluan Cadangan" : "Suggested Route")}
            </h3>
          </div>

          {allDone ? (
            <p className="text-xs text-muted-foreground">
              {lang === "bm"
                ? "Tahniah! Anda telah menemui kesemua 15 artifak. Terokai kuest dan kuiz untuk belajar lebih lanjut."
                : "Congratulations! You've discovered all 15 artifacts. Explore quests and quizzes to learn more."}
            </p>
          ) : nextRouteArtifact ? (
            <div className="flex items-center gap-3">
              {/* Next artifact thumbnail */}
              <div className="size-14 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/50" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {lang === "bm" ? "Seterusnya" : "Next up"}
                </p>
                <p className="truncate font-display text-sm font-semibold text-ink">
                  {lang === "bm" ? nextRouteArtifact.name_bm : nextRouteArtifact.name_en}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {lang === "bm" ? "Lokasi:" : "Location:"}{" "}
                  {lang === "bm"
                    ? (ZONE_LAYOUT[nextRouteArtifact.category as CategoryKey]?.label_bm ?? nextRouteArtifact.category)
                    : (ZONE_LAYOUT[nextRouteArtifact.category as CategoryKey]?.label_en ?? nextRouteArtifact.category)}
                </p>
              </div>
              <ArrowRight className="size-5 shrink-0 text-primary/60" />
            </div>
          ) : null}

          {/* Route progress dots */}
          {!allDone && (
            <div className="mt-3 flex items-center gap-1">
              {ROUTE_ORDER.map((id, i) => {
                const done = scannedSet.has(id);
                const isNext = nextRouteArtifact?.id === id;
                return (
                  <span
                    key={id}
                    className={`inline-block h-2 flex-1 rounded-full transition-colors duration-300 ${
                      done
                        ? "bg-gradient-to-r from-primary to-gold"
                        : isNext
                          ? "bg-primary/40 ring-1 ring-primary/60"
                          : "bg-border"
                    }`}
                    title={`#${i + 1}: ${done ? "✓" : "?"}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selected && (
        <ArtifactModal
          result={toReadOnlyResult(selected, progressMap.get(selected.id))}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
