"use client";

import { useState } from "react";
import {
  displayFigureName,
  displayRepertoireItem,
  type PracticeList,
  type QueueItem,
} from "@/lib/repertoire";

export type ConnectedFigure = {
  figure: string;
  total: number;
  connections: Array<{
    direction: "out" | "in";
    other: string;
  }>;
};

interface PracticeSidebarProps {
  open: boolean;
  onClose: () => void;
  history: string[];
  currentCall: string | null;
  upcomingCall: string | null;
  upcoming: QueueItem[];
  lists: PracticeList[];
  activeListId: string; // "random" | list id
  allItems: string[]; // figures + combo keys
  connectedFigures: ConnectedFigure[];
  onSelectList: (id: string) => void;
  onSaveList: (list: PracticeList) => void;
  onDeleteList: (id: string) => void;
}

export default function PracticeSidebar({
  open,
  onClose,
  history,
  currentCall,
  upcomingCall,
  upcoming,
  lists,
  activeListId,
  allItems,
  connectedFigures,
  onSelectList,
  onSaveList,
  onDeleteList,
}: PracticeSidebarProps) {
  const [draft, setDraft] = useState<PracticeList | null>(null);
  const [picker, setPicker] = useState(allItems[0] ?? "");
  const [expandedFigure, setExpandedFigure] = useState<string | null>(null);

  const startNew = () =>
    setDraft({ id: crypto.randomUUID(), name: "", items: [] });

  const startEdit = (list: PracticeList) =>
    setDraft({ ...list, items: [...list.items] });

  const addPicked = () => {
    if (!draft || !picker) return;
    setDraft({ ...draft, items: [...draft.items, picker] });
  };

  const appendToDraft = (item: string) => {
    if (!item) return;
    setDraft((current) => {
      const base =
        current ??
        lists.find((list) => list.id === activeListId) ?? {
          id: crypto.randomUUID(),
          name: "Conexiones",
          items: [],
        };
      return { ...base, items: [...base.items, item] };
    });
  };

  const moveItem = (index: number, delta: number) => {
    if (!draft) return;
    const target = index + delta;
    if (target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    [items[index], items[target]] = [items[target], items[index]];
    setDraft({ ...draft, items });
  };

  const removeItem = (index: number) => {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) });
  };

  const saveDraft = () => {
    if (!draft || !draft.name.trim() || draft.items.length === 0) return;
    onSaveList({ ...draft, name: draft.name.trim() });
    setDraft(null);
  };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-76 shrink-0 flex-col gap-7 overflow-y-auto border-r border-white/10 bg-night-deep/85 p-5 backdrop-blur-xl transition-transform",
          "lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:bg-night-deep/40",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <header className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-wide text-hueso/90 uppercase">
            La tanda
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="text-hueso/40 transition-colors hover:text-hueso lg:hidden"
          >
            ✕
          </button>
        </header>

        {/* ---- practice lists ---- */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs tracking-[0.25em] text-hueso/40 uppercase">
              listas
            </p>
            <button
              onClick={startNew}
              className="text-xs tracking-widest text-mar uppercase transition-colors hover:text-hueso"
            >
              + nueva
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => onSelectList("random")}
              className={[
                "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                activeListId === "random"
                  ? "border-mango/50 bg-mango/10 text-mango"
                  : "border-white/10 text-hueso/60 hover:text-hueso",
              ].join(" ")}
            >
              ⚄ aleatorio
            </button>

            <button
              onClick={() => onSelectList("graph")}
              className={[
                "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                activeListId === "graph"
                  ? "border-mar/50 bg-mar/10 text-mar"
                  : "border-white/10 text-hueso/60 hover:text-hueso",
              ].join(" ")}
            >
              ⤳ conexiones
            </button>

            {lists.map((list) => (
              <div
                key={list.id}
                className={[
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                  activeListId === list.id
                    ? "border-mango/50 bg-mango/10"
                    : "border-white/10",
                ].join(" ")}
              >
                <button
                  onClick={() => onSelectList(list.id)}
                  className={[
                    "min-w-0 flex-1 truncate text-left",
                    activeListId === list.id
                      ? "text-mango"
                      : "text-hueso/60 hover:text-hueso",
                  ].join(" ")}
                >
                  {list.name}
                  <span className="ml-2 text-xs text-hueso/30">
                    {list.items.length}
                  </span>
                </button>
                <button
                  onClick={() => startEdit(list)}
                  aria-label={`Editar ${list.name}`}
                  className="text-hueso/40 transition-colors hover:text-mar"
                >
                  ✎
                </button>
                <button
                  onClick={() => onDeleteList(list.id)}
                  aria-label={`Borrar ${list.name}`}
                  className="text-hueso/40 transition-colors hover:text-rosa"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* ---- list builder ---- */}
          {draft && (
            <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-mar/30 bg-mar/5 p-3">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="nombre de la lista"
                className="rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm text-hueso outline-none placeholder:text-hueso/30 focus:border-mar/60"
              />

              {draft.items.length > 0 && (
                <ol className="flex flex-col gap-1">
                  {draft.items.map((item, i) => (
                    <li
                      key={`${item}-${i}`}
                      className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-xs text-hueso/80"
                    >
                      <span className="w-4 text-hueso/30">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {displayRepertoireItem(item)}
                      </span>
                      <button
                        onClick={() => moveItem(i, -1)}
                        aria-label="Subir"
                        className="text-hueso/40 hover:text-hueso"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveItem(i, 1)}
                        aria-label="Bajar"
                        className="text-hueso/40 hover:text-hueso"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeItem(i)}
                        aria-label="Quitar"
                        className="text-hueso/40 hover:text-rosa"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ol>
              )}

              <div className="flex gap-2">
                <select
                  value={picker}
                  onChange={(e) => setPicker(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-night-deep px-2 py-1.5 text-xs text-hueso outline-none focus:border-mar/60"
                >
                  {allItems.map((item) => (
                    <option key={item} value={item}>
                      {displayRepertoireItem(item)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addPicked}
                  className="rounded-lg border border-mar/50 px-3 text-sm text-mar transition-colors hover:bg-mar/15"
                >
                  +
                </button>
              </div>

              <div className="flex justify-end gap-3 text-xs tracking-widest uppercase">
                <button
                  onClick={() => setDraft(null)}
                  className="text-hueso/40 transition-colors hover:text-hueso"
                >
                  cancelar
                </button>
                <button
                  onClick={saveDraft}
                  disabled={!draft.name.trim() || draft.items.length === 0}
                  className="text-mango transition-colors hover:text-hueso disabled:opacity-30"
                >
                  guardar
                </button>
              </div>
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-xs tracking-[0.25em] text-hueso/40 uppercase">
            figuras conectadas
          </p>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
            {connectedFigures.map(({ figure, total, connections }) => {
              const open = expandedFigure === figure;
              return (
                <div
                  key={figure}
                  className="rounded-xl border border-white/10 bg-white/4"
                >
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <button
                      onClick={() => setExpandedFigure(open ? null : figure)}
                      aria-label={open ? `Cerrar ${figure}` : `Abrir ${figure}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-hueso/45 transition-colors hover:bg-white/10 hover:text-hueso"
                    >
                      {open ? "▾" : "▸"}
                    </button>
                    <button
                      onClick={() => setExpandedFigure(open ? null : figure)}
                      className="min-w-0 flex-1 truncate text-left text-sm text-hueso/75 transition-colors hover:text-hueso"
                    >
                      {displayFigureName(figure)}
                    </button>
                    <span className="rounded-full bg-mar/10 px-2 py-0.5 text-[10px] font-semibold text-mar">
                      {total}
                    </span>
                    <button
                      onClick={() => appendToDraft(figure)}
                      aria-label={`Agregar ${figure}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-mango/40 text-sm text-mango transition-colors hover:bg-mango/15"
                    >
                      +
                    </button>
                  </div>

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
                                className="flex items-center gap-2 rounded-lg bg-night/40 px-2 py-1 text-xs text-hueso/60"
                              >
                                <span
                                  className={
                                    connection.direction === "out"
                                      ? "text-mango/70"
                                      : "text-mar/70"
                                  }
                                >
                                  {connection.direction === "out" ? "sale" : "entra"}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                  {displayFigureName(from)} →{" "}
                                  {displayFigureName(to)}
                                </span>
                                <button
                                  onClick={() => appendToDraft(connection.other)}
                                  aria-label={`Agregar ${connection.other}`}
                                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-mango transition-colors hover:bg-mango/15"
                                >
                                  +
                                </button>
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
        </section>

        {/* ---- call order ---- */}
        <section className="min-h-0 flex-1">
          <p className="mb-2 text-xs tracking-[0.25em] text-hueso/40 uppercase">
            orden
          </p>
          <ol className="flex flex-col gap-1 text-sm">
            {(upcomingCall ?? currentCall) && (
              <li className="truncate rounded-lg border border-mango/50 bg-mango/10 px-2 py-1 font-semibold text-mango">
                ▶ {displayFigureName(upcomingCall ?? currentCall ?? "")}
              </li>
            )}

            {upcoming.map((item, i) => (
              <li
                key={`next-${i}-${item.figure}`}
                className="flex items-center gap-2 truncate px-2 text-hueso/60"
              >
                <span className="w-4 shrink-0 text-right text-xs text-hueso/30">
                  {i + 1}
                </span>
                <span className="truncate">
                  {item.comboStep !== undefined && item.comboStep > 0 && (
                    <span className="mr-1 text-mar/70">↳</span>
                  )}
                  {displayFigureName(item.figure)}
                </span>
              </li>
            ))}

            {/* already called — most recent first, below */}
            {history
              .slice(-4)
              .reverse()
              .map((figure, i) => (
                <li
                  key={`past-${i}-${figure}`}
                  className="truncate px-2 text-hueso/25 line-through decoration-hueso/20"
                >
                  {displayFigureName(figure)}
                </li>
              ))}
          </ol>
        </section>
      </aside>
    </>
  );
}
