"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addFigure,
  canvasBounds,
  graphFigures,
  incomingNeighbours,
  isCustomFigure,
  neighbours,
  NODE_SIZE,
  removeFigure,
  type ConnectionGraph,
  type Point,
} from "@/lib/connections";
import { displayFigureName } from "@/lib/repertoire";
import { FIGURE_DOC, figureStartsAt, isStartFigure } from "@/lib/glossary";
import { localizedNote } from "@/lib/glossary-i18n";
import { useLang, useT } from "@/lib/i18n";

type Interaction =
  | {
      kind: "move";
      figure: string;
      offsetX: number;
      offsetY: number;
      startX: number;
      startY: number;
      moved: boolean;
      undoCaptured: boolean;
      figures: string[];
      startPositions: Record<string, Point>;
    }
  | {
      kind: "pan";
      startX: number;
      startY: number;
      scrollX: number;
      scrollY: number;
    };

interface BubbleGraphProps {
  graph: ConnectionGraph;
  onChange: (
    graph: ConnectionGraph,
    options?: { recordHistory?: boolean },
  ) => void;
  onCaptureUndo: () => void;
  activeFigure: string | null; // currently sung — lit
  pendingFigure: string | null; // about to be sung — grey highlight
  editing: boolean;
  durations: Record<string, number>;
  onSetDuration: (figure: string, ochos: number) => void;
  notes: Record<string, string>;
  onSetNote: (figure: string, note: string) => void;
  onResetLayout: () => void;
  onClearEdges: () => void;
}

const centerOf = (p: Point): Point => ({
  x: p.x + NODE_SIZE.width / 2,
  y: p.y + NODE_SIZE.height / 2,
});

const DRAG_THRESHOLD = 4;
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const ZOOM_SPEED = 0.0028;
const ZOOM_LINE_HEIGHT = 16;

const clampScale = (value: number) =>
  Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

function wheelDeltaPixels(e: WheelEvent, pageHeight: number) {
  const unit =
    e.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? ZOOM_LINE_HEIGHT
      : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? pageHeight
        : 1;
  return e.deltaY * unit;
}

/** Where an edge meets a node — clipped to the oval's bounding box. */
function anchor(from: Point, to: Point): Point {
  const c = centerOf(from);
  const t = centerOf(to);
  const dx = t.x - c.x;
  const dy = t.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const hw = NODE_SIZE.width / 2 + 2;
  const hh = NODE_SIZE.height / 2 + 2;
  const scale = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6));
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

export default function BubbleGraph({
  graph,
  onChange,
  onCaptureUndo,
  activeFigure,
  pendingFigure,
  editing,
  durations,
  onSetDuration,
  notes,
  onSetNote,
  onResetLayout,
  onClearEdges,
}: BubbleGraphProps) {
  const t = useT();
  const { lang } = useLang();
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);
  const [confirmEdge, setConfirmEdge] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<string | null>(null);
  const [hoverFigure, setHoverFigure] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState("");
  const [scale, setScale] = useState(1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const graphRef = useRef(graph);
  const boundsRef = useRef(canvasBounds(graph.positions));
  const selectedRef = useRef<string | null>(null);
  const scaleRef = useRef(scale);

  useLayoutEffect(() => {
    graphRef.current = graph;
    boundsRef.current = canvasBounds(graph.positions);
    selectedRef.current = selectedFigure;
    scaleRef.current = scale;
  }, [graph, selectedFigure, scale]);

  const toCanvas = useCallback((clientX: number, clientY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const s = scaleRef.current;
    return {
      x: (clientX - rect.left) / s,
      y: (clientY - rect.top) / s,
    };
  }, []);

  const addEdge = useCallback(
    (from: string, to: string) => {
      if (from === to) return;
      const g = graphRef.current;
      if (g.edges.some((edge) => edge.from === from && edge.to === to)) return;
      onChange({ ...g, edges: [...g.edges, { from, to }] });
    },
    [onChange],
  );

  const selectOrConnect = useCallback(
    (figure: string) => {
      const selected = selectedRef.current;
      if (selected && selected !== figure) {
        addEdge(selected, figure);
        selectedRef.current = null;
        setSelectedFigure(null);
        return;
      }

      const next = selected === figure ? null : figure;
      selectedRef.current = next;
      setSelectedFigure(next);
    },
    [addEdge],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const it = interactionRef.current;
      if (!it) return;

      if (it.kind === "pan") {
        const el = containerRef.current!;
        el.scrollLeft = it.scrollX + (it.startX - e.clientX);
        el.scrollTop = it.scrollY + (it.startY - e.clientY);
        return;
      }

      const p = toCanvas(e.clientX, e.clientY);

      if (!it.moved) {
        const dx = p.x - it.startX;
        const dy = p.y - it.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        if (!it.undoCaptured) {
          onCaptureUndo();
          it.undoCaptured = true;
        }
        it.moved = true;
        setDragging(it.figure);
      }
      const g = graphRef.current;
      const b = boundsRef.current;
      const nextMain = {
        x: p.x - it.offsetX - b.offsetX,
        y: p.y - it.offsetY - b.offsetY,
      };
      const mainStart = it.startPositions[it.figure];
      const delta = {
        x: nextMain.x - mainStart.x,
        y: nextMain.y - mainStart.y,
      };
      const positions = { ...g.positions };
      for (const figure of it.figures) {
        const start = it.startPositions[figure];
        if (!start) continue;
        positions[figure] = {
          x: start.x + delta.x,
          y: start.y + delta.y,
        };
      }
      onChange({
        ...g,
        positions,
      }, { recordHistory: false });
    };

    const onUp = () => {
      const it = interactionRef.current;
      interactionRef.current = null;
      setDragging(null);

      if (!it || it.kind === "pan") return;

      if (it.kind === "move" && !it.moved) {
        selectOrConnect(it.figure);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [addEdge, onCaptureUndo, onChange, selectOrConnect, toCanvas]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const s = scaleRef.current;

      const cx = (e.clientX - rect.left + el.scrollLeft) / s;
      const cy = (e.clientY - rect.top + el.scrollTop) / s;

      const delta = Math.max(
        -180,
        Math.min(180, wheelDeltaPixels(e, el.clientHeight)),
      );
      const newScale = clampScale(s * Math.exp(-delta * ZOOM_SPEED));
      if (newScale === s) return;

      scaleRef.current = newScale;
      setScale(newScale);

      requestAnimationFrame(() => {
        el.scrollLeft = cx * newScale - (e.clientX - rect.left);
        el.scrollTop = cy * newScale - (e.clientY - rect.top);
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // on mount: zoom so the whole graph fits, then center it
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const b = canvasBounds(graphRef.current.positions);
      const fit = Math.min(
        el.clientWidth / b.width,
        el.clientHeight / b.height,
      );
      const next = clampScale(Math.min(1, fit * 0.94));
      scaleRef.current = next;
      setScale(next);
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
        el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const startMove = (figure: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toCanvas(e.clientX, e.clientY);
    const pos = graph.positions[figure];
    const b = canvasBounds(graph.positions);
    const startPositions = Object.fromEntries(
      [[figure, { ...graph.positions[figure] }]],
    );
    interactionRef.current = {
      kind: "move",
      figure,
      figures: [figure],
      startPositions,
      offsetX: p.x - (pos.x + b.offsetX),
      offsetY: p.y - (pos.y + b.offsetY),
      startX: p.x,
      startY: p.y,
      moved: false,
      undoCaptured: false,
    };
  };

  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-figure]")) return;
    if (target.closest("button")) return;
    const el = containerRef.current!;
    interactionRef.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      scrollX: el.scrollLeft,
      scrollY: el.scrollTop,
    };
  };

  const removeEdge = (index: number) => {
    onChange({ ...graph, edges: graph.edges.filter((_, i) => i !== index) });
    setConfirmEdge(null);
    setHoverEdge(null);
  };

  const addNewFigure = () => {
    const next = addFigure(graph, newName);
    if (next !== graph) {
      onChange(next);
      setNewName("");
    }
  };

  const exportGraph = async () => {
    const payload = JSON.stringify(
      {
        positions: graph.positions,
        edges: graph.edges,
      },
      null,
      2,
    );

    try {
      await navigator.clipboard.writeText(payload);
      setExportStatus(t("map.copied"));
    } catch {
      const url = URL.createObjectURL(
        new Blob([payload], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "timba-connections-default.json";
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus(t("map.downloaded"));
    }

    window.setTimeout(() => setExportStatus(""), 1800);
  };

  const bounds = canvasBounds(graph.positions);
  const focusedFigure = selectedFigure ?? hoverFigure ?? activeFigure;

  const docFigure = selectedFigure ?? hoverFigure;
  const doc = docFigure ? FIGURE_DOC[docFigure] : undefined;
  const docNote =
    docFigure !== null
      ? (notes[docFigure] ?? localizedNote(docFigure, lang) ?? "")
      : "";
  const docIncoming = docFigure ? incomingNeighbours(graph, docFigure) : [];
  const docOutgoing = docFigure ? neighbours(graph, docFigure) : [];

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="h-full overflow-auto">
      {/* gear menu — opciones (siempre disponible; la edición ya está activa) */}
      <div className="absolute top-3 right-3 z-40">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Opciones"
          className={[
            "flex size-10 items-center justify-center rounded-full border text-lg backdrop-blur transition-colors",
            menuOpen
              ? "border-mango/60 bg-mango/15 text-mango"
              : "border-white/15 bg-night-deep/70 text-hueso/60 hover:text-hueso",
          ].join(" ")}
        >
          ⚙
        </button>

        {menuOpen && (
          <div className="absolute top-12 right-0 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/15 bg-night-deep/95 p-3 text-sm shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <p className="mb-2 px-1 text-xs tracking-[0.2em] text-hueso/40 uppercase">
              {t("map.newFigure")}
            </p>
            <div className="mb-3 flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addNewFigure();
                }}
                placeholder={t("map.name")}
                className="min-w-0 flex-1 rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-hueso outline-none placeholder:text-hueso/30 focus:border-mango/60"
              />
              <button
                onClick={addNewFigure}
                className="rounded-full border border-mango/50 bg-mango/10 px-3 py-1.5 text-mango transition-colors hover:bg-mango/20"
              >
                +
              </button>
            </div>

            <div className="flex flex-col gap-1 border-t border-white/10 pt-2 text-hueso/70">
              <button
                onClick={exportGraph}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5 hover:text-mar"
              >
                <span>{t("map.export")}</span>
                {exportStatus && (
                  <span className="text-xs text-mar">{exportStatus}</span>
                )}
              </button>
              <button
                onClick={onResetLayout}
                className="rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5 hover:text-mango"
              >
                {t("map.organize")}
              </button>
              <button
                onClick={onClearEdges}
                className="rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5 hover:text-rosa"
              >
                {t("map.clearEdges")}
              </button>
              <p className="px-2 pt-1 text-xs text-hueso/30">
                {graph.edges.length} {t("map.links")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: bounds.width * scale, height: bounds.height * scale }}>
      <div
        ref={canvasRef}
        className="relative mx-auto cursor-grab"
        onPointerDown={startPan}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          width: Math.max(bounds.width, 320),
          height: Math.max(bounds.height, 360),
        }}
      >
        {/* edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: bounds.width, height: bounds.height }}
        >
          <defs>
            <marker
              id="bg-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--color-mango)" />
            </marker>
            <marker
              id="bg-arrow-hot"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--color-rosa)" />
            </marker>
            <marker
              id="bg-arrow-live"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--color-mar)" />
            </marker>
          </defs>

          {graph.edges.map((edge, i) => {
            const from = graph.positions[edge.from];
            const to = graph.positions[edge.to];
            if (!from || !to) return null;
            const a = anchor(from, to);
            const b = anchor(to, from);
            const ox = bounds.offsetX;
            const oy = bounds.offsetY;
            const hot = hoverEdge === i;
            const confirming = confirmEdge === i;
            const live = activeFigure === edge.from;
            const relatedToFocus =
              !!focusedFigure &&
              (edge.from === focusedFigure || edge.to === focusedFigure);
            const muted = !!focusedFigure && !relatedToFocus && !hot && !confirming;
            const stroke = hot || confirming
              ? "var(--color-rosa)"
              : live
                ? "var(--color-mar)"
                : "var(--color-mango)";
            const marker = hot || confirming
              ? "bg-arrow-hot"
              : live
                ? "bg-arrow-live"
                : "bg-arrow";
            const x1 = a.x + ox;
            const y1 = a.y + oy;
            const x2 = b.x + ox;
            const y2 = b.y + oy;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            return (
              <g key={`${edge.from}-${edge.to}-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={hot || live || relatedToFocus ? 3 : 1.75}
                  strokeOpacity={
                    hot || live
                      ? 1
                      : muted
                        ? 0.08
                        : relatedToFocus
                          ? 0.72
                          : 0.28
                  }
                  markerEnd={`url(#${marker})`}
                  className="pointer-events-none transition-[stroke,stroke-opacity] duration-200"
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.001)"
                  strokeWidth={20}
                  pointerEvents="stroke"
                  className="cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmEdge(i);
                  }}
                  onPointerEnter={() => setHoverEdge(i)}
                  onPointerLeave={() => setHoverEdge(null)}
                />
                {confirming && (
                  <g
                    className="pointer-events-auto"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <rect
                      x={mx - 32}
                      y={my - 14}
                      width={64}
                      height={28}
                      rx={14}
                      fill="rgba(10, 12, 18, 0.92)"
                      stroke="rgba(255, 255, 255, 0.18)"
                    />
                    <circle
                      cx={mx - 14}
                      cy={my}
                      r={9}
                      fill="var(--color-rosa)"
                      className="cursor-pointer"
                      onClick={() => setConfirmEdge(null)}
                    />
                    <text
                      x={mx - 14}
                      y={my + 4}
                      textAnchor="middle"
                      className="pointer-events-none fill-night text-[12px] font-bold"
                    >
                      ×
                    </text>
                    <circle
                      cx={mx + 14}
                      cy={my}
                      r={9}
                      fill="var(--color-mar)"
                      className="cursor-pointer"
                      onClick={() => removeEdge(i)}
                    />
                    <text
                      x={mx + 14}
                      y={my + 4}
                      textAnchor="middle"
                      className="pointer-events-none fill-night text-[12px] font-bold"
                    >
                      ✓
                    </text>
                  </g>
                )}
              </g>
            );
          })}

        </svg>

        {/* bubbles */}
        {graphFigures(graph).map((figure) => {
          const pos = graph.positions[figure];
          if (!pos) return null;
          const isActive = activeFigure === figure;
          const isPending = pendingFigure === figure && !isActive;
          const isSelected = selectedFigure === figure;
          const isDragging = dragging === figure;
          const custom = isCustomFigure(figure);
          return (
            <div
              key={figure}
              data-figure={figure}
              onPointerDown={startMove(figure)}
              onPointerEnter={() => setHoverFigure(figure)}
              onPointerLeave={() => setHoverFigure((current) => current === figure ? null : current)}
              style={{
                left: pos.x + bounds.offsetX,
                top: pos.y + bounds.offsetY,
                width: NODE_SIZE.width,
                height: NODE_SIZE.height,
              }}
              className={[
                "absolute flex touch-none items-center justify-center rounded-[50%] border px-3 text-center text-xs leading-tight select-none",
                isDragging
                  ? "cursor-grabbing"
                  : isSelected
                    ? "cursor-pointer"
                    : "cursor-grab",
                isActive
                  ? "z-20 scale-110 border-transparent bg-linear-to-br from-rosa via-flame to-mango font-semibold text-night shadow-[0_0_45px] shadow-flame/50"
                  : isPending
                    ? "z-20 scale-105 border-hueso/40 bg-white/12 text-hueso shadow-[0_0_28px] shadow-hueso/10"
                    : isDragging
                      ? "z-20 border-mango/70 bg-night text-hueso/90 shadow-[0_0_30px] shadow-mango/30"
                      : isSelected
                        ? "z-30 scale-110 border-[#3b82f6] bg-[#3b82f6]/15 text-white shadow-[0_0_35px_rgba(59,130,246,0.5)]"
                        : "z-10 border-white/15 bg-white/6 text-hueso/80 backdrop-blur-sm hover:border-[#3b82f6]/80 hover:bg-[#3b82f6]/10",
                "transition-[transform,background,box-shadow,border-color] duration-200",
              ].join(" ")}
            >
              <span className="max-w-full text-balance wrap-break-word">
                {displayFigureName(figure)}
              </span>
              {editing && custom && (
                <button
                  aria-label={`Borrar ${figure}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(removeFigure(graph, figure));
                  }}
                  className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border-2 border-night bg-rosa text-[10px] font-bold text-night transition-transform hover:scale-125"
                >
                  ✕
                </button>
              )}
              {/* duration in ochos — click (while editing) cycles 1→4 */}
              {(() => {
                const ochos = durations[figure] ?? 1;
                const label = `${ochos}×8`;
                if (!editing) {
                  return (
                    <span className="pointer-events-none absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-night px-1.5 text-[10px] text-hueso/45">
                      {label}
                    </span>
                  );
                }
                return (
                  <button
                    aria-label={`Tiempo de ${figure}: ${ochos} ochos`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDuration(figure, ochos >= 8 ? 1 : ochos + 1);
                    }}
                    title="clic: +1 ocho · clic derecho: −1"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSetDuration(figure, ochos <= 1 ? 8 : ochos - 1);
                    }}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border-2 border-night bg-mar px-1.5 text-[10px] font-bold text-night transition-transform hover:scale-110"
                  >
                    {label}
                  </button>
                );
              })()}
            </div>
          );
        })}
        </div>
      </div>
      </div>

      {/* documentación de la figura seleccionada — leíble y editable */}
      {docFigure && (
        <div className="pointer-events-auto absolute right-3 bottom-3 left-3 z-40 max-h-[45dvh] overflow-y-auto rounded-2xl border border-white/15 bg-night-deep/90 p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:right-auto sm:w-72">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-call text-lg leading-tight text-hueso">
              {displayFigureName(docFigure)}
            </h3>
            <button
              onClick={() => {
                selectedRef.current = null;
                setSelectedFigure(null);
              }}
              aria-label={t("doc.close")}
              className="text-hueso/40 transition-colors hover:text-hueso"
            >
              ✕
            </button>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
            {isStartFigure(docFigure) && (
              <span className="rounded-full border border-mango/50 bg-mango/10 px-2 py-0.5 text-mango">
                {t("doc.start")}
              </span>
            )}
            {figureStartsAt(docFigure).map((start) => (
              <span
                key={`start-${start}`}
                className="rounded-full border border-mango/40 bg-mango/10 px-2 py-0.5 text-mango/80"
              >
                {t("doc.startsAt")} {start}
              </span>
            ))}
            {doc?.endsAt && (
              <span className="rounded-full border border-mar/50 bg-mar/10 px-2 py-0.5 text-mar">
                {t("doc.endsAt")} {doc.endsAt}
              </span>
            )}
            {doc?.implies && (
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-hueso/60">
                {t("doc.implies")} {doc.implies}
              </span>
            )}
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-hueso/40">
              {durations[docFigure] ?? 1}×8
            </span>
          </div>

          <div className="mb-3 grid gap-2 text-[11px]">
            <div>
              <p className="mb-1 tracking-[0.18em] text-hueso/35 uppercase">
                {t("doc.comesFrom")}
              </p>
              <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
                {docIncoming.length > 0 ? (
                  docIncoming.map((figure) => (
                    <span
                      key={`from-${figure}`}
                      className="rounded-full border border-white/10 px-2 py-0.5 text-hueso/55"
                    >
                      {displayFigureName(figure)}
                    </span>
                  ))
                ) : (
                  <span className="text-hueso/30">{t("doc.noIncoming")}</span>
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 tracking-[0.18em] text-hueso/35 uppercase">
                {t("doc.goesTo")}
              </p>
              <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
                {docOutgoing.length > 0 ? (
                  docOutgoing.map((figure) => (
                    <span
                      key={`to-${figure}`}
                      className="rounded-full border border-mar/20 bg-mar/5 px-2 py-0.5 text-mar/65"
                    >
                      {displayFigureName(figure)}
                    </span>
                  ))
                ) : (
                  <span className="text-hueso/30">{t("doc.noOutgoing")}</span>
                )}
              </div>
            </div>
          </div>

          {editing ? (
            <textarea
              value={docNote}
              onChange={(e) => onSetNote(docFigure, e.target.value)}
              placeholder={t("doc.placeholder")}
              rows={4}
              className="w-full resize-none rounded-lg border border-white/15 bg-transparent p-2 text-sm text-hueso/90 outline-none placeholder:text-hueso/30 focus:border-mango/60"
            />
          ) : (
            <p className="text-sm leading-relaxed text-hueso/70">
              {docNote || t("doc.empty")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
