"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BubbleGraph from "@/components/bubble-graph";
import {
  defaultGraph,
  graphFigures,
  loadGraph,
  organizeGraph,
  saveGraph,
  type ConnectionGraph,
} from "@/lib/connections";
import { FIGURES, displayFigureName, figureDuration } from "@/lib/repertoire";

const DURATIONS_STORAGE_KEY = "timba-durations";
const NOTES_STORAGE_KEY = "timba-figure-notes";

type GraphChangeOptions = { recordHistory?: boolean };
type GraphUpdate =
  | ConnectionGraph
  | ((graph: ConnectionGraph) => ConnectionGraph);
type ConnectedFigure = {
  figure: string;
  total: number;
  connections: Array<{
    direction: "out" | "in";
    other: string;
  }>;
};

function sameGraph(a: ConnectionGraph, b: ConnectionGraph) {
  if (a === b) return true;
  if (a.edges.length !== b.edges.length) return false;
  for (let i = 0; i < a.edges.length; i += 1) {
    if (a.edges[i].from !== b.edges[i].from || a.edges[i].to !== b.edges[i].to) {
      return false;
    }
  }

  const aPositions = Object.entries(a.positions);
  if (aPositions.length !== Object.keys(b.positions).length) return false;
  return aPositions.every(([figure, point]) => {
    const other = b.positions[figure];
    return other?.x === point.x && other.y === point.y;
  });
}

function wantsTextUndo(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export default function FigureMapView() {
  const [editing, setEditing] = useState(false);
  const [graph, setGraph] = useState<ConnectionGraph>(() => defaultGraph());
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>(() =>
    Object.fromEntries(FIGURES.map((figure) => [figure, figureDuration(figure)])),
  );
  const [durationsLoaded, setDurationsLoaded] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [expandedFigure, setExpandedFigure] = useState<string | null>(null);

  const graphRef = useRef(graph);
  const graphUndoRef = useRef<ConnectionGraph[]>([]);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setGraph(loadGraph());
      setGraphLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (graphLoaded) saveGraph(graph);
  }, [graph, graphLoaded]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(DURATIONS_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, number>;
          setDurations((current) => ({ ...current, ...saved }));
        }
      } catch {
        /* corrupt storage - keep defaults */
      }
      setDurationsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (durationsLoaded) {
      localStorage.setItem(DURATIONS_STORAGE_KEY, JSON.stringify(durations));
    }
  }, [durations, durationsLoaded]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(NOTES_STORAGE_KEY);
        if (raw) setNotes(JSON.parse(raw) as Record<string, string>);
      } catch {
        /* corrupt storage - keep glossary defaults */
      }
      setNotesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (notesLoaded) {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes, notesLoaded]);

  const captureGraphUndo = useCallback(() => {
    graphUndoRef.current = [...graphUndoRef.current.slice(-39), graphRef.current];
  }, []);

  const applyGraphChange = useCallback(
    (update: GraphUpdate, options: GraphChangeOptions = {}) => {
      setGraph((current) => {
        const next = typeof update === "function" ? update(current) : update;
        if (sameGraph(current, next)) return current;
        if (options.recordHistory !== false) {
          graphUndoRef.current = [...graphUndoRef.current.slice(-39), current];
        }
        return next;
      });
    },
    [],
  );

  const undoGraphChange = useCallback(() => {
    const previous = graphUndoRef.current.at(-1);
    if (!previous) return;
    graphUndoRef.current = graphUndoRef.current.slice(0, -1);
    setGraph(previous);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "z") return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.shiftKey || event.altKey || wantsTextUndo(event.target)) return;
      event.preventDefault();
      undoGraphChange();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoGraphChange]);

  const setFigureDuration = useCallback((figure: string, ochos: number) => {
    setDurations((current) => ({
      ...current,
      [figure]: Math.max(1, Math.min(8, ochos)),
    }));
  }, []);

  const setFigureNote = useCallback((figure: string, note: string) => {
    setNotes((current) => ({ ...current, [figure]: note }));
  }, []);

  const connectedFigures = useMemo<ConnectedFigure[]>(() => {
    const order = new Map(
      graphFigures(graph).map((figure, index) => [figure, index]),
    );
    const stats = new Map(
      graphFigures(graph).map((figure) => [
        figure,
        { figure, total: 0, connections: [] as ConnectedFigure["connections"] },
      ]),
    );

    for (const edge of graph.edges) {
      const from = stats.get(edge.from);
      const to = stats.get(edge.to);
      if (!from || !to) continue;
      from.total += 1;
      to.total += 1;
      from.connections.push({ direction: "out", other: edge.to });
      to.connections.push({ direction: "in", other: edge.from });
    }

    return [...stats.values()].sort((a, b) => {
      const degree = b.total - a.total;
      if (degree !== 0) return degree;
      return (order.get(a.figure) ?? 0) - (order.get(b.figure) ?? 0);
    });
  }, [graph]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 -left-1/4 size-[70vmax] rounded-full bg-rosa/10 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 -bottom-1/3 size-[60vmax] rounded-full bg-mar/8 blur-[130px]"
      />

      <header className="z-10 flex flex-wrap items-center gap-3 border-b border-white/10 bg-night-deep/45 px-4 py-3 backdrop-blur">
        <h1 className="font-display text-2xl tracking-wide uppercase">
          <span className="bg-linear-to-r from-mango via-flame to-rosa bg-clip-text text-transparent">
            Mapa de figuras
          </span>
        </h1>
        <nav className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-hueso/60 transition-colors hover:text-hueso"
          >
            cantante
          </Link>
          <Link
            href="/combos"
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-hueso/60 transition-colors hover:text-hueso"
          >
            combos
          </Link>
          <button
            onClick={() => setEditing((value) => !value)}
            className={[
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              editing
                ? "border-mar/60 bg-mar/15 text-mar"
                : "border-white/15 text-hueso/50 hover:text-hueso",
            ].join(" ")}
          >
            {editing ? "listo" : "editar"}
          </button>
          <button
            onClick={() => applyGraphChange((current) => organizeGraph(current))}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-hueso/50 transition-colors hover:border-mango/40 hover:text-mango"
          >
            organizar
          </button>
        </nav>
      </header>

      <main className="z-10 flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r border-white/10 bg-night-deep/40 p-4 backdrop-blur md:flex">
          <div>
            <p className="text-xs tracking-[0.25em] text-hueso/40 uppercase">
              figuras
            </p>
            <p className="mt-1 text-sm text-hueso/45">
              {connectedFigures.length} burbujas · {graph.edges.length} enlaces
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            {connectedFigures.map(({ figure, total, connections }) => {
              const open = expandedFigure === figure;
              return (
                <div
                  key={figure}
                  className="rounded-xl border border-white/10 bg-white/4"
                >
                  <button
                    onClick={() => setExpandedFigure(open ? null : figure)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    <span className="size-5 shrink-0 text-center text-hueso/45">
                      {open ? "▾" : "▸"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-hueso/75">
                      {displayFigureName(figure)}
                    </span>
                    <span className="rounded-full bg-mar/10 px-2 py-0.5 text-[10px] font-semibold text-mar">
                      {total}
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-white/10 px-3 py-2">
                      {connections.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {connections.map((connection) => {
                            const from =
                              connection.direction === "out"
                                ? figure
                                : connection.other;
                            const to =
                              connection.direction === "out"
                                ? connection.other
                                : figure;
                            return (
                              <div
                                key={`${figure}-${connection.direction}-${connection.other}`}
                                className="rounded-lg bg-night/40 px-2 py-1 text-xs text-hueso/60"
                              >
                                <span
                                  className={
                                    connection.direction === "out"
                                      ? "text-mango/70"
                                      : "text-mar/70"
                                  }
                                >
                                  {connection.direction === "out" ? "sale" : "entra"}
                                </span>{" "}
                                {displayFigureName(from)} → {displayFigureName(to)}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="px-2 py-1 text-xs text-hueso/30">
                          sin conexiones
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-2">
        <div className="h-full overflow-hidden rounded-3xl border border-white/10 bg-night-deep/30 backdrop-blur-sm">
          <BubbleGraph
            graph={graph}
            onChange={applyGraphChange}
            onCaptureUndo={captureGraphUndo}
            activeFigure={null}
            pendingFigure={null}
            editing={editing}
            durations={durations}
            onSetDuration={setFigureDuration}
            notes={notes}
            onSetNote={setFigureNote}
            onResetLayout={() =>
              applyGraphChange((current) => organizeGraph(current))
            }
            onClearEdges={() =>
              applyGraphChange((current) => ({ ...current, edges: [] }))
            }
          />
        </div>
        </div>
      </main>
    </div>
  );
}
