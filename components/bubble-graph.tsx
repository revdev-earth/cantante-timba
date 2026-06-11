"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addFigure,
  canvasBounds,
  graphFigures,
  isCustomFigure,
  NODE_SIZE,
  removeFigure,
  type ConnectionGraph,
  type Point,
} from "@/lib/connections";
import { displayFigureName } from "@/lib/repertoire";
import { FIGURE_DOC, isStartFigure } from "@/lib/glossary";

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
  | { kind: "connect"; from: string; point: Point }
  | { kind: "select"; start: Point; point: Point }
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

function normalizedRect(a: Point, b: Point) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function rectIntersectsNode(
  rect: ReturnType<typeof normalizedRect>,
  point: Point,
) {
  return (
    point.x + NODE_SIZE.width >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y + NODE_SIZE.height >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

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
  const [dragging, setDragging] = useState<string | null>(null);
  const [tempEdge, setTempEdge] = useState<{ from: Point; to: Point } | null>(
    null,
  );
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);
  const [confirmEdge, setConfirmEdge] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedFigure, setSelectedFigure] = useState<string | null>(null);
  const [selectedFigures, setSelectedFigures] = useState<Set<string>>(
    () => new Set(),
  );
  const [hoverFigure, setHoverFigure] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState("");
  const [selectionRect, setSelectionRect] = useState<ReturnType<
    typeof normalizedRect
  > | null>(null);
  const [scale, setScale] = useState(1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const graphRef = useRef(graph);
  const boundsRef = useRef(canvasBounds(graph.positions));
  const selectedRef = useRef<string | null>(null);
  const selectedFiguresRef = useRef<Set<string>>(new Set());
  const scaleRef = useRef(scale);

  useLayoutEffect(() => {
    graphRef.current = graph;
    boundsRef.current = canvasBounds(graph.positions);
    selectedRef.current = selectedFigure;
    selectedFiguresRef.current = selectedFigures;
    scaleRef.current = scale;
  }, [graph, selectedFigure, selectedFigures, scale]);

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

      if (it.kind === "select") {
        it.point = p;
        setSelectionRect(normalizedRect(it.start, p));
        return;
      }

      if (it.kind === "move") {
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
      } else {
        const b = boundsRef.current;
        it.point = { x: p.x - b.offsetX, y: p.y - b.offsetY };
        setTempEdge({
          from: anchor(graphRef.current.positions[it.from], it.point),
          to: it.point,
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      const it = interactionRef.current;
      interactionRef.current = null;
      setDragging(null);
      setTempEdge(null);
      setSelectionRect(null);

      if (!it || it.kind === "pan") return;

      if (it.kind === "select") {
        const rect = normalizedRect(it.start, it.point);
        if (rect.width < DRAG_THRESHOLD && rect.height < DRAG_THRESHOLD) {
          setSelectedFigures(new Set());
          return;
        }
        const b = boundsRef.current;
        const selected = graphFigures(graphRef.current).filter((figure) => {
          const point = graphRef.current.positions[figure];
          if (!point) return false;
          return rectIntersectsNode(rect, {
            x: point.x + b.offsetX,
            y: point.y + b.offsetY,
          });
        });
        setSelectedFigures(new Set(selected));
        selectedRef.current = null;
        setSelectedFigure(null);
        return;
      }

      if (it.kind === "connect") {
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-figure]");
        const to = target?.dataset.figure;
        if (!to || to === it.from) return;
        addEdge(it.from, to);
        return;
      }

      if (it.kind === "move" && !it.moved) {
        if (
          selectedFiguresRef.current.size > 1 &&
          selectedFiguresRef.current.has(it.figure)
        ) {
          return;
        }
        setSelectedFigures(new Set());
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
    const selected = selectedFigures.has(figure)
      ? [...selectedFigures].filter((selectedFigure) => graph.positions[selectedFigure])
      : [figure];
    const startPositions = Object.fromEntries(
      selected.map((selectedFigure) => [
        selectedFigure,
        { ...graph.positions[selectedFigure] },
      ]),
    );
    interactionRef.current = {
      kind: "move",
      figure,
      figures: selected,
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
    if (editing) {
      const point = toCanvas(e.clientX, e.clientY);
      interactionRef.current = {
        kind: "select",
        start: point,
        point,
      };
      setSelectionRect(normalizedRect(point, point));
      return;
    }
    const el = containerRef.current!;
    interactionRef.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      scrollX: el.scrollLeft,
      scrollY: el.scrollTop,
    };
  };

  const startConnect = (figure: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const p = toCanvas(e.clientX, e.clientY);
    const b = canvasBounds(graph.positions);
    interactionRef.current = {
      kind: "connect",
      from: figure,
      point: { x: p.x - b.offsetX, y: p.y - b.offsetY },
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
      setExportStatus("copiado");
    } catch {
      const url = URL.createObjectURL(
        new Blob([payload], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "timba-connections-default.json";
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus("descargado");
    }

    window.setTimeout(() => setExportStatus(""), 1800);
  };

  const bounds = canvasBounds(graph.positions);
  const focusedFigure = selectedFigure ?? hoverFigure ?? activeFigure;
  const outgoing = (figure: string) =>
    graph.edges.filter((e) => e.from === figure).length;

  const docFigure = selectedFigure ?? hoverFigure;
  const doc = docFigure ? FIGURE_DOC[docFigure] : undefined;
  const docNote =
    docFigure !== null
      ? (notes[docFigure] ?? doc?.note ?? "")
      : "";

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="h-full overflow-auto">
      {/* floating toolbar (only while editing) */}
      {editing && (
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 bg-night-deep/70 px-4 py-2 text-xs backdrop-blur">
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNewFigure();
              }}
              placeholder="nueva figura…"
              className="w-36 rounded-full border border-white/15 bg-transparent px-3 py-1 text-hueso outline-none placeholder:text-hueso/30 focus:border-mango/60"
            />
            <button
              onClick={addNewFigure}
              className="rounded-full border border-mango/50 bg-mango/10 px-3 py-1 text-mango transition-colors hover:bg-mango/20"
            >
              + figura
            </button>
          </div>
          <p className="hidden text-hueso/50 sm:block">
            arrastra vacío para seleccionar · arrastra burbujas seleccionadas en grupo · clic en otra burbuja conecta
          </p>
          <div className="ml-auto flex gap-4 tracking-widest uppercase">
            <span className="text-hueso/40">{graph.edges.length} enlaces</span>
            {exportStatus && (
              <span className="text-mar">{exportStatus}</span>
            )}
            <button
              onClick={exportGraph}
              className="text-hueso/50 transition-colors hover:text-mar"
            >
              exportar
            </button>
            <button
              onClick={onClearEdges}
              className="text-hueso/50 transition-colors hover:text-rosa"
            >
              borrar
            </button>
            <button
              onClick={onResetLayout}
              className="text-hueso/50 transition-colors hover:text-mango"
            >
              organizar
            </button>
          </div>
        </div>
      )}

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

          {tempEdge && (
            <line
              x1={tempEdge.from.x + bounds.offsetX}
              y1={tempEdge.from.y + bounds.offsetY}
              x2={tempEdge.to.x + bounds.offsetX}
              y2={tempEdge.to.y + bounds.offsetY}
              stroke="var(--color-mar)"
              strokeWidth={2.5}
              strokeDasharray="6 5"
              className="pointer-events-none"
            />
          )}
        </svg>

        {selectionRect && (
          <div
            className="pointer-events-none absolute z-40 border border-mar/80 bg-mar/15 shadow-[0_0_24px_rgba(43,198,197,0.22)]"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
        )}

        {/* bubbles */}
        {graphFigures(graph).map((figure) => {
          const pos = graph.positions[figure];
          if (!pos) return null;
          const isActive = activeFigure === figure;
          const isPending = pendingFigure === figure && !isActive;
          const isMultiSelected = selectedFigures.has(figure);
          const isSelected = selectedFigure === figure || isMultiSelected;
          const isGroupDragging =
            dragging === figure ||
            (!!dragging && selectedFigures.has(dragging) && isMultiSelected);
          const count = outgoing(figure);
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
                isGroupDragging
                  ? "cursor-grabbing"
                  : isSelected
                    ? "cursor-pointer"
                    : "cursor-grab",
                isActive
                  ? "z-20 scale-110 border-transparent bg-linear-to-br from-rosa via-flame to-mango font-semibold text-night shadow-[0_0_45px] shadow-flame/50"
                  : isPending
                    ? "z-20 scale-105 border-hueso/40 bg-white/12 text-hueso shadow-[0_0_28px] shadow-hueso/10"
                    : isGroupDragging
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
              {editing && count > 0 && (
                <span className="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full bg-mango text-[10px] font-bold text-night">
                  {count}
                </span>
              )}
              {editing && (
                <button
                  aria-label={`Conectar desde ${figure}`}
                  onPointerDown={startConnect(figure)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-1/2 -right-2 size-5 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-night bg-mango transition-transform hover:scale-125"
                />
              )}
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
        <div className="pointer-events-auto absolute bottom-3 left-3 z-40 w-72 rounded-2xl border border-white/15 bg-night-deep/90 p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-call text-lg leading-tight text-hueso">
              {displayFigureName(docFigure)}
            </h3>
            <button
              onClick={() => {
                selectedRef.current = null;
                setSelectedFigure(null);
              }}
              aria-label="Cerrar"
              className="text-hueso/40 transition-colors hover:text-hueso"
            >
              ✕
            </button>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
            {isStartFigure(docFigure) && (
              <span className="rounded-full border border-mango/50 bg-mango/10 px-2 py-0.5 text-mango">
                ▶ punto de inicio
              </span>
            )}
            {doc?.endsAt && (
              <span className="rounded-full border border-mar/50 bg-mar/10 px-2 py-0.5 text-mar">
                termina en {doc.endsAt}
              </span>
            )}
            {doc?.implies && (
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-hueso/60">
                lleva implícito: {doc.implies}
              </span>
            )}
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-hueso/40">
              {durations[docFigure] ?? 1}×8
            </span>
          </div>

          {editing ? (
            <textarea
              value={docNote}
              onChange={(e) => onSetNote(docFigure, e.target.value)}
              placeholder="describe la figura para aprender…"
              rows={4}
              className="w-full resize-none rounded-lg border border-white/15 bg-transparent p-2 text-sm text-hueso/90 outline-none placeholder:text-hueso/30 focus:border-mango/60"
            />
          ) : (
            <p className="text-sm leading-relaxed text-hueso/70">
              {docNote || "Sin descripción todavía. Entra a editar para agregarla."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
