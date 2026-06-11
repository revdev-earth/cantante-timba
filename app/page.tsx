"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PracticeSidebar, {
  type ConnectedFigure,
} from "@/components/practice-sidebar";
import BubbleGraph from "@/components/bubble-graph";
import { detectBpm } from "@/lib/beat-detection";
import { LiveBeatTracker } from "@/lib/live-beat-tracker";
import {
  defaultGraph,
  graphFigures,
  loadGraph,
  neighbours,
  organizeGraph,
  saveGraph,
  type ConnectionGraph,
} from "@/lib/connections";
import {
  COMBOS,
  FIGURES,
  comboKey,
  displayFigureName,
  displayRepertoireItem,
  expandItem,
  figureDuration,
  type PracticeList,
  type QueueItem,
} from "@/lib/repertoire";
import { figureEndsAt, START_FIGURES } from "@/lib/glossary";
import { loadUserCombos, type Combo } from "@/lib/combos";
import Link from "next/link";

const BEATS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const QUEUE_LOOKAHEAD = 10;
const STORAGE_KEY = "timba-practice-lists";
const DURATIONS_STORAGE_KEY = "timba-durations";
const NOTES_STORAGE_KEY = "timba-figure-notes";

type Mode = "song" | "metronome";
type GraphChangeOptions = { recordHistory?: boolean };
type GraphUpdate = ConnectionGraph | ((graph: ConnectionGraph) => ConnectionGraph);

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

export default function Home() {
  /* transport */
  const [mode, setMode] = useState<Mode>("metronome");
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0); // 0 = stopped
  const [bpm, setBpm] = useState(188);
  const [callEveryBars, setCallEveryBars] = useState(1);
  const [voiceOn, setVoiceOn] = useState(true);
  const [soundOn, setSoundOn] = useState(false);

  /* calls */
  const [currentCall, setCurrentCall] = useState<string | null>(null);
  const [upcomingCall, setUpcomingCall] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  /* repertoire */
  const [panelOpen, setPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [enabledFigures, setEnabledFigures] = useState<Set<string>>(
    () => new Set(FIGURES),
  );
  const [enabledCombos, setEnabledCombos] = useState<Set<string>>(
    () => new Set(COMBOS.map(comboKey)),
  );

  /* connection graph */
  const [graph, setGraph] = useState<ConnectionGraph>(() => defaultGraph());
  const [graphLoaded, setGraphLoaded] = useState(false);
  const graphUndoRef = useRef<ConnectionGraph[]>([]);

  /* per-figure duration in ochos (8-count bars) */
  const [durations, setDurations] = useState<Record<string, number>>(() =>
    Object.fromEntries(FIGURES.map((f) => [f, figureDuration(f)])),
  );
  const [durationsLoaded, setDurationsLoaded] = useState(false);

  /* per-figure learning notes (user-editable, overrides glossary defaults) */
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesLoaded, setNotesLoaded] = useState(false);

  /* practice lists */
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [activeListId, setActiveListId] = useState("random");

  /* uploaded song */
  const [songName, setSongName] = useState<string | null>(null);
  const [songBpm, setSongBpm] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoTempo, setAutoTempo] = useState(true);

  /* engine refs */
  const beatRef = useRef(0);
  const barRef = useRef(0);
  const nextCallBarRef = useRef(1);
  const bpmRef = useRef(bpm);
  const songBpmRef = useRef<number | null>(null);
  const everyRef = useRef(callEveryBars);
  const voiceRef = useRef(voiceOn);
  const soundRef = useRef(soundOn);
  const enabledFiguresRef = useRef(enabledFigures);
  const enabledCombosRef = useRef(enabledCombos);
  const listsRef = useRef(lists);
  const activeListIdRef = useRef(activeListId);
  const queueRef = useRef<QueueItem[]>([]);
  const pendingRef = useRef<QueueItem | null>(null);
  const lastPickRef = useRef<string | null>(null);
  const listPositionRef = useRef(0);
  const graphRef = useRef<ConnectionGraph>(graph);
  const graphFigureRef = useRef<string | null>(null);
  const userCombosRef = useRef<Combo[]>([]);
  const listsLoadedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const trackerRef = useRef<LiveBeatTracker | null>(null);
  const autoTempoRef = useRef(autoTempo);
  const nextBeatTimeRef = useRef(0);
  const lastPeakSeenRef = useRef(0);
  const durationsRef = useRef(durations);
  const durationsLoadedRef = useRef(false);
  const rafRef = useRef(0);

  /* keep engine refs in sync with the latest state */
  useEffect(() => {
    bpmRef.current = bpm;
    songBpmRef.current = songBpm;
    everyRef.current = callEveryBars;
    voiceRef.current = voiceOn;
    soundRef.current = soundOn;
    enabledFiguresRef.current = enabledFigures;
    enabledCombosRef.current = enabledCombos;
    listsRef.current = lists;
    activeListIdRef.current = activeListId;
    autoTempoRef.current = autoTempo;
    graphRef.current = graph;
    durationsRef.current = durations;
  });

  /* ---- per-figure durations persistence ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DURATIONS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, number>;
        setDurations((current) => ({ ...current, ...saved }));
      }
    } catch {
      /* corrupt storage — keep defaults */
    }
    setDurationsLoaded(true);
    durationsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (durationsLoaded) {
      localStorage.setItem(DURATIONS_STORAGE_KEY, JSON.stringify(durations));
    }
  }, [durations, durationsLoaded]);

  const setFigureDuration = useCallback((figure: string, ochos: number) => {
    setDurations((current) => ({
      ...current,
      [figure]: Math.max(1, Math.min(8, ochos)),
    }));
  }, []);

  /* ---- per-figure notes persistence ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw) as Record<string, string>);
    } catch {
      /* corrupt storage — keep glossary defaults */
    }
    setNotesLoaded(true);
  }, []);

  useEffect(() => {
    if (notesLoaded) {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes, notesLoaded]);

  const setFigureNote = useCallback((figure: string, note: string) => {
    setNotes((current) => ({ ...current, [figure]: note }));
  }, []);

  /* ---- persistence of practice lists ---- */
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setLists(JSON.parse(raw));
      } catch {
        /* corrupt storage — start fresh */
      }
      listsLoadedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!listsLoadedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  }, [lists]);

  /* ---- connection graph persistence ---- */
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      graphUndoRef.current = [];
      setGraph(loadGraph());
      setGraphLoaded(true);
      userCombosRef.current = loadUserCombos();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (graphLoaded) saveGraph(graph);
  }, [graph, graphLoaded]);

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

  /* ---- call queue ---- */
  const refillQueue = useCallback(() => {
    const queue = queueRef.current;
    let guard = 0;
    while (queue.length < QUEUE_LOOKAHEAD && guard++ < 50) {
      const listId = activeListIdRef.current;
      if (listId === "random") {
        const singles = FIGURES.filter(
          (f) => enabledFiguresRef.current.has(f) && f !== lastPickRef.current,
        );
        // custom bubbles added on the graph are always in the random pool
        const customs = graphFigures(graphRef.current).filter(
          (f) => !FIGURES.includes(f) && f !== lastPickRef.current,
        );
        const combos = COMBOS.map(comboKey).filter(
          (k) => enabledCombosRef.current.has(k) && k !== lastPickRef.current,
        );
        // combos creados por el usuario en /combos
        const userCombos = userCombosRef.current
          .map((c) => comboKey(c.figures))
          .filter((k) => k !== lastPickRef.current);
        const pool = [...singles, ...customs, ...combos, ...userCombos];
        if (pool.length === 0) break;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        lastPickRef.current = pick;
        queue.push(...expandItem(pick));
      } else if (listId === "graph") {
        const g = graphRef.current;
        const from = graphFigureRef.current;
        // tras una figura quedas parado en el hub donde "termina"; las
        // siguientes salen de ahí (Enchufla → Guapeala → vueltas de Guapeala)
        const standingAt = from ? (figureEndsAt(from) ?? from) : null;
        const options = standingAt
          ? neighbours(g, standingAt).filter((f) => f !== from)
          : [];
        let next: string;
        if (options.length > 0) {
          next = options[Math.floor(Math.random() * options.length)];
        } else {
          // dead end (o arranque): empezar desde un punto de inicio
          const nodes = graphFigures(g);
          const starts = START_FIGURES.filter((f) => g.positions[f]);
          const pool = starts.length > 0 ? starts : nodes;
          next = pool[Math.floor(Math.random() * pool.length)];
        }
        graphFigureRef.current = next;
        queue.push({ figure: next });
      } else {
        const list = listsRef.current.find((l) => l.id === listId);
        if (!list || list.items.length === 0) break;
        const item = list.items[listPositionRef.current % list.items.length];
        listPositionRef.current += 1;
        queue.push(...expandItem(item));
      }
    }
    setUpcoming([...queue]);
  }, []);

  /* rebuild the queue whenever its source changes */
  useEffect(() => {
    queueRef.current = [];
    listPositionRef.current = 0;
    graphFigureRef.current = null;
    refillQueue();
  }, [enabledFigures, enabledCombos, activeListId, lists, refillQueue]);

  /* ---- audio ---- */

  /* soft woodblock tick — silent on the 4 and 8 pauses */
  const playTick = useCallback((count: number) => {
    if (!soundRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx || count === 4 || count === 8) return;
    const accent = count === 1;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 820 : 620;
    filter.type = "bandpass";
    filter.frequency.value = accent ? 1600 : 1200;
    filter.Q.value = 9;
    gain.gain.setValueAtTime(accent ? 0.5 : 0.26, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 1.15;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }, []);

  /* ---- call engine ---- */

  /* beat 1 of a calling bar: take the next call, light its bubble grey */
  const prepareNextCall = useCallback(() => {
    refillQueue();
    const item = queueRef.current.shift();
    if (!item) return;
    setUpcoming([...queueRef.current]);
    pendingRef.current = item;
    setUpcomingCall(item.figure);
  }, [refillQueue]);

  /* beat 3: the bubble lights up in color and the call gets sung */
  const singPendingCall = useCallback(() => {
    const item = pendingRef.current;
    if (!item) return;
    pendingRef.current = null;
    setCurrentCall(item.figure);
    setUpcomingCall(null);
    setHistory((h) => [...h.slice(-11), item.figure]);
    if (voiceRef.current) speak(item.figure);
    // hold this figure for its own length (in ochos) before the next call
    const figureOchos =
      durationsRef.current[item.figure] ?? figureDuration(item.figure);
    nextCallBarRef.current =
      barRef.current + figureOchos * Math.max(1, everyRef.current);
  }, [speak]);

  const handleBeat = useCallback(
    (count: number) => {
      beatRef.current = count;
      setBeat(count);
      playTick(count);
      if (count === 1) {
        barRef.current += 1;
        if (!pendingRef.current && barRef.current >= nextCallBarRef.current) {
          prepareNextCall();
        }
      }
      if (count === 3) singPendingCall();
    },
    [playTick, prepareNextCall, singPendingCall],
  );

  /* metronome clock */
  useEffect(() => {
    if (!playing || mode !== "metronome") return;
    let id: number;
    const loop = () => {
      handleBeat((beatRef.current % 8) + 1);
      id = window.setTimeout(loop, 60000 / bpmRef.current);
    };
    id = window.setTimeout(loop, 60000 / bpmRef.current);
    return () => window.clearTimeout(id);
  }, [playing, mode, handleBeat]);

  /* song clock — a beat grid that follows the live tracker while playing */
  useEffect(() => {
    if (!playing || mode !== "song" || !songName) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const frame = () => {
      const tracker = trackerRef.current;
      tracker?.update();

      // adopt the live tempo estimate while "auto" is on
      if (autoTempoRef.current && tracker?.bpm) {
        const live = Math.round(tracker.bpm * 10) / 10;
        if (
          songBpmRef.current === null ||
          Math.abs(live - songBpmRef.current) >= 0.1
        ) {
          songBpmRef.current = live;
          setSongBpm(live);
        }
      }

      const tempo = songBpmRef.current ?? bpmRef.current;
      const interval = 60 / tempo;

      // nudge the grid towards strong onsets (gentle phase correction)
      if (tracker && tracker.lastPeakTime !== lastPeakSeenRef.current) {
        lastPeakSeenRef.current = tracker.lastPeakTime;
        const peak = tracker.lastPeakTime;
        const steps = Math.round((nextBeatTimeRef.current - peak) / interval);
        const gridTime = nextBeatTimeRef.current - steps * interval;
        const error = peak - gridTime;
        if (Math.abs(error) < interval / 2) {
          nextBeatTimeRef.current += error * 0.12;
        }
      }

      // catch up after a background tab without machine-gunning counts
      if (ctx.currentTime - nextBeatTimeRef.current > 2) {
        nextBeatTimeRef.current = ctx.currentTime;
      }

      while (ctx.currentTime >= nextBeatTimeRef.current) {
        nextBeatTimeRef.current += interval;
        handleBeat((beatRef.current % 8) + 1);
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, mode, songName, handleBeat]);

  const resetEngine = () => {
    setBeat(0);
    beatRef.current = 0;
    barRef.current = 0;
    nextCallBarRef.current = 1;
    pendingRef.current = null;
    setUpcomingCall(null);
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      resetEngine();
      audioElRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    if (mode === "song" && !songName) return; // need a song first
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    void audioCtxRef.current.resume();
    if (mode === "song" && audioElRef.current) {
      nextBeatTimeRef.current = audioCtxRef.current.currentTime + 0.1;
      void audioElRef.current.play();
    }
    setPlaying(true);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (playing) togglePlay();
    setMode(next);
  };

  /* re-anchor the count so "now" becomes the 1 */
  const tapOne = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    beatRef.current = 0;
    barRef.current = 0;
    nextBeatTimeRef.current = ctx.currentTime;
  };

  const handleSongUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (playing) togglePlay();
    if (audioElRef.current) {
      audioElRef.current.pause();
      URL.revokeObjectURL(audioElRef.current.src);
    }
    if (mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
      mediaSourceRef.current = null;
    }
    trackerRef.current = null;

    const audio = new Audio(URL.createObjectURL(file));
    audio.loop = true;
    audioElRef.current = audio;

    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    void ctx.resume();

    // route the song through the live tracker (and on to the speakers)
    const source = ctx.createMediaElementSource(audio);
    source.connect(ctx.destination);
    mediaSourceRef.current = source;
    trackerRef.current = new LiveBeatTracker(ctx, source);

    setMode("song");
    setSongName(file.name.replace(/\.[^.]+$/, ""));
    setSongBpm(null);

    // offline estimate as a seed — playback can start right away meanwhile
    setAnalyzing(true);
    try {
      const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
      const seed = detectBpm(decoded);
      trackerRef.current?.seed(seed);
      setSongBpm((current) => current ?? seed);
    } catch {
      /* the live tracker will find the tempo anyway */
    } finally {
      setAnalyzing(false);
    }
  };

  const clearSong = () => {
    if (playing) togglePlay();
    if (mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
      mediaSourceRef.current = null;
    }
    trackerRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      URL.revokeObjectURL(audioElRef.current.src);
      audioElRef.current = null;
    }
    setSongName(null);
    setSongBpm(null);
    setAnalyzing(false);
  };

  /* ---- repertoire, lists & graph ---- */

  const toggleFigure = (figure: string) => {
    setEnabledFigures((prev) => {
      const next = new Set(prev);
      if (next.has(figure)) next.delete(figure);
      else next.add(figure);
      return next;
    });
  };

  const toggleCombo = (key: string) => {
    setEnabledCombos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveList = (list: PracticeList) => {
    setLists((prev) => {
      const index = prev.findIndex((l) => l.id === list.id);
      if (index === -1) return [...prev, list];
      const next = [...prev];
      next[index] = list;
      return next;
    });
  };

  const deleteList = (id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (activeListId === id) setActiveListId("random");
  };

  const connectedFigures = useMemo<ConnectedFigure[]>(() => {
    const order = new Map(graphFigures(graph).map((figure, index) => [figure, index]));
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

  const canPlay = mode === "metronome" || !!songName;

  return (
    <div className="relative flex h-dvh overflow-hidden">
      <PracticeSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        history={history}
        currentCall={currentCall}
        upcomingCall={upcomingCall}
        upcoming={upcoming}
        lists={lists}
        activeListId={activeListId}
        allItems={[...FIGURES, ...COMBOS.map(comboKey)]}
        connectedFigures={connectedFigures}
        onSelectList={(id) => setActiveListId(id)}
        onSaveList={saveList}
        onDeleteList={deleteList}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ---- background atmosphere ---- */}
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

        {/* ---- top bar: title · tabs · counter ---- */}
        <header className="z-10 flex flex-col gap-3 px-4 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir la tanda"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-hueso/70 backdrop-blur transition-colors hover:text-hueso lg:hidden"
            >
              ☰
            </button>

            <h1 className="font-display hidden text-2xl tracking-wide uppercase sm:block">
              <span className="bg-linear-to-r from-mango via-flame to-rosa bg-clip-text text-transparent">
                Timba Cantante
              </span>
            </h1>

            {/* mode tabs */}
            <div className="mx-auto flex overflow-hidden rounded-full border border-white/15 bg-white/5 backdrop-blur">
              {(
                [
                  ["song", "Canción"],
                  ["metronome", "Sin Canción"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => switchMode(value)}
                  className={[
                    "px-5 py-1.5 text-sm transition-colors",
                    mode === value
                      ? "bg-linear-to-r from-mango to-flame font-semibold text-night"
                      : "text-hueso/60 hover:text-hueso",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            <Link
              href="/combos"
              className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-hueso/50 transition-colors hover:text-hueso"
            >
              combos
            </Link>
            <button
              onClick={() => setEditing((e) => !e)}
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
              onClick={() => applyGraphChange((g) => organizeGraph(g))}
              className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-hueso/50 transition-colors hover:border-mango/40 hover:text-mango"
            >
              organizar
            </button>
          </div>

          {/* counter 1-8 (compact) + current call */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-end gap-1.5 sm:gap-2.5">
              {BEATS.map((count) => {
                const ghost = count === 4 || count === 8;
                const active = playing && beat === count;
                return (
                  <span
                    key={count}
                    className={[
                      "font-display leading-none transition-colors duration-100",
                      count === 5 ? "ml-2 sm:ml-4" : "",
                      ghost
                        ? "text-xl text-hueso/10 sm:text-2xl"
                        : "text-3xl sm:text-4xl",
                      active && !ghost && "count-glow animate-beat-pop text-mango",
                      active && ghost && "animate-beat-pop text-hueso/30",
                      !active && !ghost && "text-hueso/55",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {count}
                  </span>
                );
              })}
            </div>
            <p
              className={[
                "font-call h-7 text-xl leading-7 transition-colors sm:text-2xl",
                currentCall
                  ? "bg-linear-to-r from-rosa via-flame to-mango bg-clip-text text-transparent"
                  : upcomingCall
                    ? "text-hueso/25"
                    : "text-transparent",
              ].join(" ")}
            >
              {currentCall || upcomingCall
                ? displayFigureName(currentCall ?? upcomingCall ?? "")
                : "·"}
            </p>
          </div>
        </header>

        {/* ---- the graph: the figures light up as they are called ---- */}
        <div className="z-10 min-h-0 flex-1 px-2 pb-2">
          <div className="h-full overflow-hidden rounded-3xl border border-white/10 bg-night-deep/30 backdrop-blur-sm">
            <BubbleGraph
              graph={graph}
              onChange={applyGraphChange}
              onCaptureUndo={captureGraphUndo}
              activeFigure={currentCall}
              pendingFigure={upcomingCall}
              editing={editing}
              durations={durations}
              onSetDuration={setFigureDuration}
              notes={notes}
              onSetNote={setFigureNote}
              onResetLayout={() => applyGraphChange((g) => organizeGraph(g))}
              onClearEdges={() => applyGraphChange((g) => ({ ...g, edges: [] }))}
            />
          </div>
        </div>

        {/* ---- transport controls ---- */}
        <section className="z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-white/10 bg-night-deep/50 px-4 py-3 backdrop-blur">
          <button
            onClick={togglePlay}
            disabled={!canPlay}
            aria-label={playing ? "Parar" : "Empezar"}
            className={[
              "flex size-14 items-center justify-center rounded-full text-xl text-night transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
              playing
                ? "bg-rosa shadow-[0_0_36px] shadow-rosa/40"
                : "bg-mango shadow-[0_0_36px] shadow-mango/40",
            ].join(" ")}
          >
            {playing ? "■" : "▶"}
          </button>

          {mode === "metronome" ? (
            <label className="flex flex-col items-center gap-1">
              <span className="text-xs tracking-[0.2em] text-hueso/50 uppercase">
                tempo · {bpm} bpm
              </span>
              <input
                type="range"
                min={130}
                max={240}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-40 accent-mango"
              />
            </label>
          ) : songName ? (
            <>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs tracking-[0.2em] text-hueso/50 uppercase">
                  tempo
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={0.5}
                    min={120}
                    max={260}
                    value={songBpm ?? ""}
                    placeholder={analyzing ? "…" : "bpm"}
                    disabled={autoTempo}
                    onChange={(e) =>
                      setSongBpm(Number(e.target.value) || null)
                    }
                    className="w-20 rounded-full border border-white/15 bg-transparent px-3 py-1 text-center text-sm text-hueso outline-none focus:border-mango/60 disabled:opacity-60"
                  />
                  <button
                    onClick={() => setAutoTempo((a) => !a)}
                    title="Seguir el tempo en vivo"
                    className={[
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      autoTempo
                        ? "border-mar/60 bg-mar/15 text-mar"
                        : "border-white/15 text-hueso/40",
                    ].join(" ")}
                  >
                    auto
                  </button>
                </div>
              </div>
              {playing && (
                <button
                  onClick={tapOne}
                  className="rounded-full bg-mango px-4 py-1.5 text-sm font-semibold text-night transition-transform hover:scale-105 active:scale-95"
                >
                  ¡el 1 es ahora!
                </button>
              )}
              <span className="max-w-40 truncate text-sm text-hueso/60">
                {songName}
              </span>
              <button
                onClick={clearSong}
                aria-label="Quitar canción"
                className="text-hueso/40 transition-colors hover:text-rosa"
              >
                ✕
              </button>
            </>
          ) : (
            <label className="cursor-pointer rounded-full border border-mar/50 bg-mar/10 px-4 py-2 text-sm text-mar transition-colors hover:bg-mar/20">
              ♫ subir canción
              <input
                type="file"
                accept="audio/*"
                onChange={handleSongUpload}
                className="hidden"
              />
            </label>
          )}

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs tracking-[0.2em] text-hueso/50 uppercase">
              tiempo ×
            </span>
            <div className="flex overflow-hidden rounded-full border border-white/15">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setCallEveryBars(n)}
                  className={[
                    "px-3.5 py-1 text-sm transition-colors",
                    callEveryBars === n
                      ? "bg-mar font-semibold text-night"
                      : "text-hueso/60 hover:text-hueso",
                  ].join(" ")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setVoiceOn((v) => !v)}
              className={[
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                voiceOn
                  ? "border-mango/60 bg-mango/15 text-mango"
                  : "border-white/15 text-hueso/40",
              ].join(" ")}
            >
              voz
            </button>
            <button
              onClick={() => setSoundOn((s) => !s)}
              className={[
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                soundOn
                  ? "border-mar/60 bg-mar/15 text-mar"
                  : "border-white/15 text-hueso/40",
              ].join(" ")}
            >
              clave
            </button>
          </div>

          <button
            onClick={() => setPanelOpen((p) => !p)}
            className="text-xs tracking-[0.2em] text-hueso/40 uppercase transition-colors hover:text-hueso/70"
          >
            {panelOpen ? "▾ figuras" : "▸ figuras"}
          </button>
        </section>

        {/* ---- repertoire (collapsible) ---- */}
        {panelOpen && (
          <div className="z-10 max-h-64 overflow-y-auto border-t border-white/10 bg-night-deep/60 px-4 py-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-xs tracking-widest text-hueso/40 uppercase">
              <span>
                {enabledFigures.size} figuras · {enabledCombos.size} combinaciones
              </span>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setEnabledFigures(new Set(FIGURES));
                    setEnabledCombos(new Set(COMBOS.map(comboKey)));
                  }}
                  className="transition-colors hover:text-mango"
                >
                  todas
                </button>
                <button
                  onClick={() => {
                    setEnabledFigures(new Set());
                    setEnabledCombos(new Set());
                  }}
                  className="transition-colors hover:text-rosa"
                >
                  ninguna
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {FIGURES.map((figure) => {
                const on = enabledFigures.has(figure);
                return (
                  <button
                    key={figure}
                    onClick={() => toggleFigure(figure)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      on
                        ? "border-mango/50 bg-mango/10 text-hueso"
                        : "border-white/10 text-hueso/30 line-through",
                    ].join(" ")}
                  >
                    {displayFigureName(figure)}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 mb-2 text-xs tracking-[0.25em] text-hueso/40 uppercase">
              combinaciones
            </p>
            <div className="flex flex-wrap gap-2">
              {COMBOS.map((combo) => {
                const key = comboKey(combo);
                const on = enabledCombos.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleCombo(key)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      on
                        ? "border-mar/50 bg-mar/10 text-hueso"
                        : "border-white/10 text-hueso/30 line-through",
                    ].join(" ")}
                  >
                    {displayRepertoireItem(key)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
