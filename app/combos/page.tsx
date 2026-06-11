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
  const [graph, setGraph] = useState<ConnectionGraph | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [userCombos, setUserCombos] = useState<Combo[]>([]);

  /* builder */
  const [start, setStart] = useState<Hub>("Básico");
  const [figs, setFigs] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    setGraph(loadGraph());
    setUserCombos(loadUserCombos());
    const base = Object.fromEntries(FIGURES.map((f) => [f, figureDuration(f)]));
    try {
      const raw = localStorage.getItem(DURATIONS_KEY);
      if (raw) Object.assign(base, JSON.parse(raw));
    } catch {
      /* keep defaults */
    }
    setDurations(base);
  }, []);

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

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl tracking-wide uppercase md:text-4xl">
              <span className="bg-linear-to-r from-mango via-flame to-rosa bg-clip-text text-transparent">
                Combos
              </span>
            </h1>
            <p className="mt-1 text-xs tracking-[0.25em] text-hueso/40 uppercase">
              arma combinaciones desde un hub
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-hueso/70 backdrop-blur transition-colors hover:text-hueso"
          >
            ← volver
          </Link>
        </header>

        {/* ---- builder ---- */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-xs tracking-[0.2em] text-hueso/50 uppercase">
              empezar en
            </span>
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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-mango/50 bg-mango/10 px-3 py-1 text-sm text-mango">
              ▶ {start}
            </span>
            {figs.map((f, i) => (
              <span key={`${f}-${i}`} className="flex items-center gap-2">
                <span className="text-hueso/30">→</span>
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
                className="ml-1 text-hueso/40 transition-colors hover:text-rosa"
              >
                ⌫
              </button>
            )}
          </div>

          {figs.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-4 text-xs tracking-wide text-hueso/50 uppercase">
              <span>
                total{" "}
                <span className="text-hueso">{totalOchos} ochos</span>
              </span>
              <span>
                termina en <span className="text-mar">{endsAt}</span>
              </span>
            </div>
          )}

          {/* suggestions */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs tracking-[0.2em] text-hueso/50 uppercase">
              {freeMode
                ? "todas las figuras"
                : `desde ${standing} se puede`}
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
              libre
            </button>
          </div>

          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
            {suggestions.length === 0 ? (
              <p className="text-sm text-hueso/40">
                no hay salidas conectadas desde {standing} — activa “libre” para
                agregar cualquier figura
              </p>
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
                      ↘{figureEndsAt(f)}
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
              placeholder="nombre del combo (opcional)"
              className="min-w-48 flex-1 rounded-full border border-white/15 bg-transparent px-4 py-1.5 text-sm text-hueso outline-none placeholder:text-hueso/30 focus:border-mango/60"
            />
            <button
              onClick={clearBuilder}
              className="text-xs tracking-widest text-hueso/40 uppercase transition-colors hover:text-hueso"
            >
              limpiar
            </button>
            <button
              onClick={saveCombo}
              disabled={figs.length < 2}
              className="rounded-full bg-mango px-5 py-2 text-sm font-semibold text-night transition-transform hover:scale-105 active:scale-95 disabled:opacity-30"
            >
              {editingId ? "actualizar" : "guardar combo"}
            </button>
          </div>
        </section>

        {/* ---- reference ---- */}
        {HUBS.map((hub) => (
          <section key={hub} className="mb-6">
            <h2 className="mb-3 font-call text-xl text-hueso/80">
              Desde {hub}
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
                          {i > 0 && <span className="text-hueso/30">→</span>}
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
                      {comboOchos(combo, durations)} ochos · ↘{" "}
                      <span className="text-mar">{comboEndsAt(combo)}</span>
                    </span>
                    <div className="flex gap-2 text-xs tracking-widest uppercase">
                      <button
                        onClick={() => editCombo(combo, !isUser)}
                        className="text-hueso/40 transition-colors hover:text-mango"
                      >
                        {isUser ? "editar" : "copiar"}
                      </button>
                      {isUser && (
                        <button
                          onClick={() => deleteCombo(combo.id)}
                          className="text-hueso/40 transition-colors hover:text-rosa"
                        >
                          borrar
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
