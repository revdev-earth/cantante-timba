"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadGraph, neighbours, type ConnectionGraph } from "@/lib/connections";
import {
  COMBO_SEPARATOR,
  FIGURES,
  displayFigureName,
  figureDuration,
} from "@/lib/repertoire";
import { figureEndsAt, isStartFigure, HUBS, type Hub } from "@/lib/glossary";
import { useT } from "@/lib/i18n";
import LanguageSwitcher from "@/components/language-switcher";
import {
  comboEndsAt,
  comboOchos,
  DEFAULT_COMBOS,
  loadUserCombos,
  saveUserCombos,
  type Combo,
} from "@/lib/combos";

const DURATIONS_KEY = "timba-durations";

export default function CombosPage() {
  const t = useT();
  const [graph, setGraph] = useState<ConnectionGraph | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [userCombos, setUserCombos] = useState<Combo[]>([]);
  const [navOpen, setNavOpen] = useState(false);

  /* builder */
  const [start, setStart] = useState<Hub>("Básico");
  const [figs, setFigs] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const base = Object.fromEntries(
        FIGURES.map((f) => [f, figureDuration(f)]),
      );
      try {
        const raw = localStorage.getItem(DURATIONS_KEY);
        if (raw) Object.assign(base, JSON.parse(raw));
      } catch {
        /* keep defaults */
      }
      setGraph(loadGraph());
      setUserCombos(loadUserCombos());
      setDurations(base);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const persist = (next: Combo[]) => {
    setUserCombos(next);
    saveUserCombos(next);
  };

  const ochosOf = (f: string) => durations[f] ?? 1;

  /* where you're standing after the current sequence */
  const standing = figs.length
    ? (figureEndsAt(figs[figs.length - 1]) ?? figs[figs.length - 1])
    : start;

  const suggestions = useMemo(() => {
    if (freeMode) return FIGURES;
    if (!graph) return [];
    const out = neighbours(graph, standing);
    return [...new Set(out)];
  }, [graph, standing, freeMode]);

  const totalOchos = figs.reduce((s, f) => s + ochosOf(f), 0);
  const endsAt = figs.length
    ? (figureEndsAt(figs[figs.length - 1]) ?? figs[figs.length - 1])
    : start;

  const clearBuilder = () => {
    setFigs([]);
    setName("");
    setEditingId(null);
  };

  const saveCombo = () => {
    if (figs.length < 2) return;
    const combo: Combo = {
      id: editingId ?? crypto.randomUUID(),
      name: name.trim() || figs.join(COMBO_SEPARATOR),
      start,
      figures: figs,
    };
    const exists = userCombos.some((c) => c.id === combo.id);
    persist(
      exists
        ? userCombos.map((c) => (c.id === combo.id ? combo : c))
        : [...userCombos, combo],
    );
    clearBuilder();
  };

  const editCombo = (combo: Combo, asNew: boolean) => {
    setStart(combo.start);
    setFigs([...combo.figures]);
    setName(asNew ? `${combo.name} (copia)` : combo.name);
    setEditingId(asNew ? null : combo.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCombo = (id: string) =>
    persist(userCombos.filter((c) => c.id !== id));

  const allCombos = [...DEFAULT_COMBOS, ...userCombos];
  const byHub = (hub: Hub) => allCombos.filter((c) => c.start === hub);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 -left-1/4 size-[70vmax] rounded-full bg-rosa/10 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 -bottom-1/3 size-[60vmax] rounded-full bg-mar/8 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 flex flex-col gap-2 px-3 pt-2 pb-2 sm:px-4 sm:pt-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label={t("nav.menu")}
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            className="grid size-9 place-items-center rounded-full border border-white/15 bg-white/5 text-hueso/70 backdrop-blur transition-colors hover:text-hueso sm:hidden"
          >
            <span aria-hidden className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 rounded-full bg-current" />
              <span className="block h-0.5 w-4 rounded-full bg-current" />
              <span className="block h-0.5 w-4 rounded-full bg-current" />
            </span>
          </button>

          <Link
            href="/"
            className="font-display mr-auto text-lg tracking-wide uppercase sm:text-2xl"
          >
            <span className="bg-linear-to-r from-mango via-flame to-rosa bg-clip-text text-transparent">
              Timba Cantante
            </span>
          </Link>

          <div className="shrink-0 sm:order-last">
            <LanguageSwitcher />
          </div>

          <Link
            href="/"
            className="hidden rounded-full border border-white/15 px-3 py-1.5 text-sm text-hueso/50 transition-colors hover:text-hueso sm:block"
          >
            {t("nav.caller")}
          </Link>
          <Link
            href="/mapa"
            className="hidden rounded-full border border-white/15 px-3 py-1.5 text-sm text-hueso/50 transition-colors hover:text-hueso sm:block"
          >
            {t("nav.map")}
          </Link>
        </div>
      </header>

      {navOpen && (
        <button
          type="button"
          aria-label={t("doc.close")}
          className="fixed inset-0 z-30 bg-black/55 backdrop-blur-[2px] sm:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        aria-label={t("nav.menu")}
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[82vw] flex-col border-r border-white/10 bg-night-deep/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform duration-200 sm:hidden",
          navOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="mb-6 flex items-center gap-3">
          <h2 className="font-display mr-auto text-xl tracking-wide uppercase">
            <span className="bg-linear-to-r from-mango via-flame to-rosa bg-clip-text text-transparent">
              Timba
            </span>
          </h2>
          <button
            type="button"
            aria-label={t("doc.close")}
            onClick={() => setNavOpen(false)}
            className="grid size-9 place-items-center rounded-full border border-white/15 bg-white/5 text-xl leading-none text-hueso/70 transition-colors hover:text-hueso"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            onClick={() => setNavOpen(false)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-hueso/70 transition-colors hover:border-white/20 hover:text-hueso"
          >
            {t("nav.caller")}
          </Link>
          <Link
            href="/combos"
            onClick={() => setNavOpen(false)}
            className="rounded-2xl border border-mango/35 bg-mango/10 px-4 py-3 text-sm font-semibold text-mango"
          >
            {t("nav.combos")}
          </Link>
          <Link
            href="/mapa"
            onClick={() => setNavOpen(false)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-hueso/70 transition-colors hover:border-white/20 hover:text-hueso"
          >
            {t("nav.map")}
          </Link>
        </nav>
      </aside>

      <div className="relative z-10 mx-auto max-w-5xl px-3 pb-8 sm:px-4 sm:pt-4">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">
              <span className="bg-linear-to-r from-mango via-flame to-rosa bg-clip-text text-transparent">
                {t("combos.title")}
              </span>
            </h1>
            <p className="mt-1 text-xs tracking-[0.25em] text-hueso/40 uppercase">
              {t("combos.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs tracking-[0.18em] text-hueso/45 uppercase">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {allCombos.length} {t("rep.combos")}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {userCombos.length} {t("combos.saved")}
            </span>
          </div>
        </header>

        {/* ---- builder ---- */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-night-deep/45 p-4 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs tracking-[0.22em] text-hueso/45 uppercase">
                {t("combos.startIn")}
              </p>
              <p className="mt-1 text-sm text-hueso/55">
                {freeMode
                  ? t("combos.allFigures")
                  : `${t("combos.from")} ${standing}`}
              </p>
            </div>
            <div className="flex overflow-hidden rounded-full border border-white/15">
              {HUBS.map((hub) => (
                <button
                  key={hub}
                  onClick={() => {
                    setStart(hub);
                    if (figs.length === 0) return;
                  }}
                  className={[
                    "px-4 py-1.5 text-sm transition-colors",
                    start === hub
                      ? "bg-linear-to-r from-mango to-flame font-semibold text-night"
                      : "text-hueso/60 hover:text-hueso",
                  ].join(" ")}
                >
                  {hub}
                </button>
              ))}
            </div>
          </div>

          {/* sequence */}
          <div className="mb-4 min-h-11 rounded-2xl border border-white/10 bg-black/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-mango/50 bg-mango/10 px-3 py-1 text-sm text-mango">
              <span
                aria-hidden
                className="h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-current"
              />
              {start}
            </span>
            {figs.map((f, i) => (
              <span key={`${f}-${i}`} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-px w-4 rounded-full bg-hueso/25"
                />
                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-sm text-hueso">
                  {displayFigureName(f)}
                  <span className="text-[10px] text-mar">{ochosOf(f)}×8</span>
                </span>
              </span>
            ))}
            {figs.length > 0 && (
              <button
                onClick={() => setFigs(figs.slice(0, -1))}
                aria-label="Quitar última"
                className="ml-1 grid size-7 place-items-center rounded-full border border-white/15 text-hueso/40 transition-colors hover:text-rosa"
              >
                <span aria-hidden className="h-px w-3 rounded-full bg-current" />
              </button>
            )}
            </div>
          </div>

          {figs.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-4 text-xs tracking-wide text-hueso/50 uppercase">
              <span>
                {t("combos.total")}{" "}
                <span className="text-hueso">
                  {totalOchos} {t("combos.ochos")}
                </span>
              </span>
              <span>
                {t("combos.endsAt")} <span className="text-mar">{endsAt}</span>
              </span>
            </div>
          )}

          {/* suggestions */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs tracking-[0.2em] text-hueso/50 uppercase">
              {freeMode
                ? t("combos.allFigures")
                : `${t("combos.from")} ${standing} ${t("combos.fromYouCan")}`}
            </span>
            <button
              onClick={() => setFreeMode((v) => !v)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                freeMode
                  ? "border-mar/60 bg-mar/15 text-mar"
                  : "border-white/15 text-hueso/50 hover:text-hueso",
              ].join(" ")}
            >
              {t("combos.free")}
            </button>
          </div>

          <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-hueso/40">{t("combos.noExits")}</p>
            ) : (
              suggestions.map((f) => (
                <button
                  key={f}
                  onClick={() => setFigs([...figs, f])}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-hueso/80 transition-colors hover:border-mango/50 hover:text-hueso"
                >
                  {displayFigureName(f)}
                  <span className="text-[10px] text-hueso/35">
                    {ochosOf(f)}×8
                  </span>
                  {figureEndsAt(f) && (
                    <span className="text-[10px] text-mar/70">
                      {t("combos.endsAt")} {figureEndsAt(f)}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* save row */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("combos.namePlaceholder")}
              className="min-w-48 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-hueso outline-none placeholder:text-hueso/30 focus:border-mango/60"
            />
            <button
              onClick={clearBuilder}
              className="text-xs tracking-widest text-hueso/40 uppercase transition-colors hover:text-hueso"
            >
              {t("combos.clear")}
            </button>
            <button
              onClick={saveCombo}
              disabled={figs.length < 2}
              className="rounded-full bg-mango px-5 py-2 text-sm font-semibold text-night transition-transform hover:scale-105 active:scale-95 disabled:opacity-30"
            >
              {editingId ? t("combos.update") : t("combos.save")}
            </button>
          </div>
        </section>

        {/* ---- reference ---- */}
        {HUBS.map((hub) => (
          <section key={hub} className="mb-6">
            <h2 className="mb-3 font-call text-xl text-hueso/80">
              {t("combos.fromHub")} {hub}
            </h2>
            <div className="flex flex-col gap-2">
              {byHub(hub).map((combo) => {
                const isUser = !combo.id.startsWith("default:");
                return (
                  <div
                    key={combo.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm">
                      {combo.figures.map((f, i) => (
                        <span
                          key={`${f}-${i}`}
                          className="flex items-center gap-1.5"
                        >
                          {i > 0 && (
                            <span
                              aria-hidden
                              className="h-px w-3 rounded-full bg-hueso/25"
                            />
                          )}
                          <span
                            className={
                              isStartFigure(f)
                                ? "text-mango"
                                : "text-hueso/85"
                            }
                          >
                            {displayFigureName(f)}
                          </span>
                          <span className="text-[10px] text-hueso/35">
                            {ochosOf(f)}×8
                          </span>
                        </span>
                      ))}
                    </div>
                    <span className="text-xs whitespace-nowrap text-hueso/40">
                      {comboOchos(combo, durations)} {t("combos.ochos")} ·{" "}
                      {t("combos.endsAt")}{" "}
                      <span className="text-mar">{comboEndsAt(combo)}</span>
                    </span>
                    <div className="flex gap-2 text-xs tracking-widest uppercase">
                      <button
                        onClick={() => editCombo(combo, !isUser)}
                        className="text-hueso/40 transition-colors hover:text-mango"
                      >
                        {isUser ? t("combos.edit") : t("combos.copy")}
                      </button>
                      {isUser && (
                        <button
                          onClick={() => deleteCombo(combo.id)}
                          className="text-hueso/40 transition-colors hover:text-rosa"
                        >
                          {t("combos.delete")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
