"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import LanguageSwitcher from "@/components/language-switcher";
import { detectBpm } from "@/lib/beat-detection";
import { LiveBeatTracker } from "@/lib/live-beat-tracker";
import {
  defaultGraph,
  loadGraph,
  neighbours,
  type ConnectionGraph,
} from "@/lib/connections";
import {
  COMBOS,
  FIGURES,
  comboKey,
  displayFigureName,
  displayRepertoireItem,
  figureDuration,
  type QueueItem,
} from "@/lib/repertoire";
import { figureEndsAt, figureImplies, START_FIGURES } from "@/lib/glossary";
import { loadUserCombos, type Combo } from "@/lib/combos";
import Link from "next/link";

const BEATS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const QUEUE_LOOKAHEAD = 10;
const DURATIONS_STORAGE_KEY = "timba-durations";
const PRESET_SONGS = [
  { name: "Mi Timbaton", file: "Mi Timbaton.mp3" },
  { name: "Caramelo Con Picante", file: "Caramelo Con Picante.mp3" },
  { name: "Toda Una Vida", file: "Toda Una Vida.mp3" },
  { name: "Bajanda Changui", file: "Bajanda Changui.mp3" },
  { name: "Lloraras", file: "lloraras.mp3" },
] as const;

type Mode = "song" | "metronome";

/** Icono de aleatorio: las flechas que se cruzan (shuffle). */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="m4 4 5 5" />
    </svg>
  );
}
type PresetSong = (typeof PRESET_SONGS)[number];

const presetSongUrl = (song: PresetSong) =>
  `/songs/${encodeURIComponent(song.file)}`;

function nextPresetIndex(current: number, shuffle: boolean) {
  if (shuffle && PRESET_SONGS.length > 1) {
    let next = current;
    while (next === current) {
      next = Math.floor(Math.random() * PRESET_SONGS.length);
    }
    return next;
  }
  return (current + 1) % PRESET_SONGS.length;
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

/** Group the flat call queue back into combos (consecutive items share combo). */
function groupUpcoming(items: QueueItem[]): string[][] {
  const groups: string[][] = [];
  let i = 0;
  while (i < items.length) {
    const combo = items[i].combo;
    if (combo) {
      const group: string[] = [];
      while (i < items.length && items[i].combo === combo) {
        group.push(items[i].figure);
        i++;
      }
      groups.push(group);
    } else {
      groups.push([items[i].figure]);
      i++;
    }
  }
  return groups;
}
type PracticeMode = "random" | "graph";

export default function Home() {
  const t = useT();
  /* transport */
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0); // 0 = stopped
  const [bpm, setBpm] = useState(188);
  const [callEveryBars, setCallEveryBars] = useState(1);
  const [navOpen, setNavOpen] = useState(false);
  const [transportSheetOpen, setTransportSheetOpen] = useState(false);

  /* calls */
  const [currentCall, setCurrentCall] = useState<string | null>(null);
  const [upcomingCall, setUpcomingCall] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<QueueItem[]>([]);
  const [, setHistory] = useState<string[]>([]);
  const [currentStandingAt, setCurrentStandingAt] = useState("Básico");

  /* repertoire */
  const [panelOpen, setPanelOpen] = useState(false);
  const [enabledFigures, setEnabledFigures] = useState<Set<string>>(
    () => new Set(FIGURES),
  );
  const [enabledCombos, setEnabledCombos] = useState<Set<string>>(
    () => new Set(COMBOS.map(comboKey)),
  );

  /* connection graph */
  const [graph, setGraph] = useState<ConnectionGraph>(() => defaultGraph());

  /* per-figure duration in ochos (8-count bars) */
  const [durations, setDurations] = useState<Record<string, number>>(() =>
    Object.fromEntries(FIGURES.map((f) => [f, figureDuration(f)])),
  );
  const [durationsLoaded, setDurationsLoaded] = useState(false);

  const practiceMode: PracticeMode = "graph";

  /* uploaded song */
  const [songName, setSongName] = useState<string | null>(null);
  const [songBpm, setSongBpm] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoTempo, setAutoTempo] = useState(true);
  const [songLevel, setSongLevel] = useState(0);
  const [songTime, setSongTime] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const [songVersion, setSongVersion] = useState(0);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(
    null,
  );
  const [shuffleSongs, setShuffleSongs] = useState(false);
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const mode: Mode = songName ? "song" : "metronome";

  /* engine refs */
  const lastLevelAtRef = useRef(0);
  const pausedRef = useRef(false);
  const beatRef = useRef(0);
  const barRef = useRef(0);
  const nextCallBarRef = useRef(1);
  const bpmRef = useRef(bpm);
  const songBpmRef = useRef<number | null>(null);
  const everyRef = useRef(callEveryBars);
  const enabledFiguresRef = useRef(enabledFigures);
  const enabledCombosRef = useRef(enabledCombos);
  const practiceModeRef = useRef(practiceMode);
  const queueRef = useRef<QueueItem[]>([]);
  const pendingRef = useRef<QueueItem | null>(null);
  const lastPickRef = useRef<string | null>(null);
  const listPositionRef = useRef(0);
  const graphRef = useRef<ConnectionGraph>(graph);
  const graphFigureRef = useRef<string | null>(null);
  const freshStartRef = useRef(true);
  const userCombosRef = useRef<Combo[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const trackerRef = useRef<LiveBeatTracker | null>(null);
  const songPickerRef = useRef<HTMLDivElement | null>(null);
  const autoTempoRef = useRef(autoTempo);
  const selectedPresetIndexRef = useRef<number | null>(null);
  const shuffleSongsRef = useRef(shuffleSongs);
  const nextBeatTimeRef = useRef(0);
  const lastPeakSeenRef = useRef(0);
  const lastPhaseSeenRef = useRef(0);
  const phaseErrorRef = useRef(0);
  const loadTokenRef = useRef(0);
  const durationsRef = useRef(durations);
  const rafRef = useRef(0);

  /* keep engine refs in sync with the latest state */
  useEffect(() => {
    bpmRef.current = bpm;
    songBpmRef.current = songBpm;
    everyRef.current = callEveryBars;
    enabledFiguresRef.current = enabledFigures;
    enabledCombosRef.current = enabledCombos;
    practiceModeRef.current = practiceMode;
    autoTempoRef.current = autoTempo;
    selectedPresetIndexRef.current = selectedPresetIndex;
    shuffleSongsRef.current = shuffleSongs;
    graphRef.current = graph;
    durationsRef.current = durations;
  });

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  useEffect(() => {
    if (!songPickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && songPickerRef.current?.contains(target)) return;
      setSongPickerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSongPickerOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [songPickerOpen]);

  useEffect(() => {
    if (!transportSheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTransportSheetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [transportSheetOpen]);

  /* ---- per-figure durations persistence ---- */
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
        /* corrupt storage — keep defaults */
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
    const audio = audioElRef.current;
    if (!songName || !audio) return;

    const updateTime = () => setSongTime(audio.currentTime || 0);
    const updateDuration = () =>
      setSongDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    updateTime();
    updateDuration();
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("seeking", updateTime);
    audio.addEventListener("seeked", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("seeking", updateTime);
      audio.removeEventListener("seeked", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
    };
  }, [songName, songVersion]);

  /* ---- connection graph persistence ---- */
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setGraph(loadGraph());
      userCombosRef.current = loadUserCombos();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- call queue ---- */
  const refillQueue = useCallback(() => {
    const queue = queueRef.current;
    let guard = 0;
    while (queue.length < QUEUE_LOOKAHEAD && guard++ < 50) {
      // la rueda siempre arranca en un hub: Básico o Guapeala
      if (freshStartRef.current && queue.length === 0) {
        const starts = START_FIGURES.filter((f) => FIGURES.includes(f));
        const startFig =
          starts[Math.floor(Math.random() * starts.length)] ?? "Básico";
        freshStartRef.current = false;
        lastPickRef.current = startFig;
        graphFigureRef.current = startFig;
        queue.push({ figure: startFig });
        continue;
      }
      // siempre por conexiones: un cantante sigue el mapa
      const g = graphRef.current;
      const from = graphFigureRef.current;
      const directOptions = from
        ? neighbours(g, from).filter((f) => f !== from)
        : [];
      // El mapa manda primero: si la figura tiene salidas propias, seguimos
      // esas flechas. Si no tiene, continuamos desde el hub donde termina.
      const standingAt = from ? (figureEndsAt(from) ?? from) : "Básico";
      const options =
        directOptions.length > 0
          ? directOptions
          : neighbours(g, standingAt).filter((f) => f !== from);
      if (options.length === 0) break;
      const next = options[Math.floor(Math.random() * options.length)];
      graphFigureRef.current = next;
      queue.push({ figure: next });
    }
    setUpcoming([...queue]);
  }, []);

  /* rebuild the queue whenever its source changes */
  useEffect(() => {
    queueRef.current = [];
    listPositionRef.current = 0;
    graphFigureRef.current = null;
    freshStartRef.current = true;
    refillQueue();
  }, [enabledFigures, enabledCombos, practiceMode, refillQueue]);

  /* ---- audio ---- */

  const playTick = useCallback(() => {
    // Clave/tick audio is intentionally disabled.
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
    setCurrentStandingAt(figureEndsAt(item.figure) ?? item.figure);
    // hold this figure for its own length (in ochos) before the next call
    const figureOchos =
      durationsRef.current[item.figure] ?? figureDuration(item.figure);
    nextCallBarRef.current =
      barRef.current + figureOchos * Math.max(1, everyRef.current);
  }, []);

  const handleBeat = useCallback(
    (count: number) => {
      beatRef.current = count;
      setBeat(count);
      playTick();
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

      // intensidad de la canción (throttle ~15/s para no re-renderizar de más)
      if (tracker && ctx.currentTime - lastLevelAtRef.current > 0.066) {
        lastLevelAtRef.current = ctx.currentTime;
        setSongLevel(tracker.level);
      }

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

      // ── corrección de fase principal: histograma plegado (1×/seg) ──
      // El tracker pliega los últimos 8 s de onsets módulo el período: la
      // fase donde se acumula la energía ES el beat. Robusto contra la
      // síncopa (el tumbao y los adornos se promedian y desaparecen).
      // IMPORTANTE: el error solo se ANOTA aquí; se aplica en el límite del
      // beat (abajo) para que ningún conteo quede apretado ni estirado.
      const phase = tracker?.phase;
      if (
        phase &&
        phase.version !== lastPhaseSeenRef.current &&
        phase.confidence >= 1.8 &&
        Math.abs(phase.periodSec - interval) < interval * 0.06
      ) {
        lastPhaseSeenRef.current = phase.version;
        const gridPhase =
          ((nextBeatTimeRef.current % phase.periodSec) + phase.periodSec) %
          phase.periodSec;
        let error = phase.offsetSec - gridPhase;
        // diferencia circular: tomar el camino corto
        if (error > phase.periodSec / 2) error -= phase.periodSec;
        if (error < -phase.periodSec / 2) error += phase.periodSec;
        phaseErrorRef.current = error; // reemplaza (medida fresca y global)
      }

      // ── corrección fina por picos (entre actualizaciones de fase) ──
      // Solo picos MUY cerca del beat (±25%); también va a la cola.
      if (tracker && tracker.lastPeakTime !== lastPeakSeenRef.current) {
        lastPeakSeenRef.current = tracker.lastPeakTime;
        const peak = tracker.lastPeakTime;
        const steps = Math.round((nextBeatTimeRef.current - peak) / interval);
        const gridTime = nextBeatTimeRef.current - steps * interval;
        const error = peak - gridTime;
        if (Math.abs(error) < interval * 0.25) {
          phaseErrorRef.current += error * 0.15;
        }
      }

      // catch up after a background tab without machine-gunning counts
      if (ctx.currentTime - nextBeatTimeRef.current > 2) {
        nextBeatTimeRef.current = ctx.currentTime;
        phaseErrorRef.current = 0;
      }

      while (ctx.currentTime >= nextBeatTimeRef.current) {
        // aplicar la corrección pendiente SOLO aquí, con tope del 8% del
        // intervalo por beat: el espaciado entre números queda siempre
        // parejo y la rejilla converge en unos pocos beats sin saltos.
        const maxStep = interval * 0.08;
        const applied = Math.max(
          -maxStep,
          Math.min(maxStep, phaseErrorRef.current),
        );
        phaseErrorRef.current -= applied;
        nextBeatTimeRef.current += interval + applied;
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
    queueRef.current = [];
    setUpcomingCall(null);
    setUpcoming([]);
    setCurrentCall(null);
    setCurrentStandingAt("Básico");
    graphFigureRef.current = null;
    freshStartRef.current = true;
  };

  /* play/pause: mantiene la secuencia y la posición (no reinicia) */
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      pausedRef.current = true;
      audioElRef.current?.pause();
      if (mode === "song") void audioCtxRef.current?.suspend();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    if (mode === "song" && !songName) return; // need a song first
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    void audioCtxRef.current.resume();
    if (mode === "song" && audioElRef.current) {
      if (!pausedRef.current) {
        nextBeatTimeRef.current = audioCtxRef.current.currentTime + 0.1;
      }
      void audioElRef.current.play();
    }
    pausedRef.current = false;
    setPlaying(true);
  };

  /* reinicio total: vuelve al arranque (Básico/Guapeala) */
  const stopAndReset = () => {
    setPlaying(false);
    pausedRef.current = false;
    phaseErrorRef.current = 0;
    audioElRef.current?.pause();
    if (audioElRef.current) audioElRef.current.currentTime = 0;
    setSongTime(0);
    void audioCtxRef.current?.resume();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    resetEngine();
    setSongLevel(0);
  };

  /* re-anchor the count so "now" becomes the 1 */
  const tapOne = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    beatRef.current = 0;
    barRef.current = 0;
    phaseErrorRef.current = 0; // el toque humano manda: descartar correcciones
    nextBeatTimeRef.current = ctx.currentTime;
  };

  const seekSong = (targetSeconds: number) => {
    const audio = audioElRef.current;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const next = Math.max(
      0,
      duration ? Math.min(targetSeconds, duration) : targetSeconds,
    );
    audio.currentTime = next;
    setSongTime(next);

    // La canción cambió de lugar; descartar fase vieja sin borrar la cola.
    phaseErrorRef.current = 0;
    lastPeakSeenRef.current = 0;
    lastPhaseSeenRef.current = 0;
    beatRef.current = 0;
    setBeat(0);
    const ctx = audioCtxRef.current;
    if (ctx) nextBeatTimeRef.current = ctx.currentTime + 0.1;
  };

  const releaseCurrentSong = () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      if (audioElRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioElRef.current.src);
      }
      audioElRef.current = null;
    }
    if (mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
      mediaSourceRef.current = null;
    }
    trackerRef.current = null;
  };

  async function loadSong(
    name: string,
    src: string,
    arrayBuffer: () => Promise<ArrayBuffer>,
    options: { autoplay?: boolean; presetIndex?: number | null } = {},
  ) {
    // token de carga: si llega otra carga (clic rápido, fin de canción),
    // los callbacks de ésta quedan huérfanos y no tocan el estado
    const token = ++loadTokenRef.current;
    const isCurrent = () => loadTokenRef.current === token;

    if (playing) {
      setPlaying(false);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }
    releaseCurrentSong();

    const audio = new Audio(src);
    audio.loop = false;
    audioElRef.current = audio;

    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    void ctx.resume();

    // route the song through the live tracker (and on to the speakers)
    const source = ctx.createMediaElementSource(audio);
    source.connect(ctx.destination);
    mediaSourceRef.current = source;
    trackerRef.current = new LiveBeatTracker(ctx, source);

    setSongName(name);
    setSelectedPresetIndex(options.presetIndex ?? null);
    selectedPresetIndexRef.current = options.presetIndex ?? null;
    setSongBpm(null);
    setSongTime(0);
    setSongDuration(0);
    setSongLevel(0);
    setSongVersion((version) => version + 1);
    phaseErrorRef.current = 0;
    lastPeakSeenRef.current = 0;
    lastPhaseSeenRef.current = 0;
    beatRef.current = 0;
    setBeat(0);
    nextBeatTimeRef.current = ctx.currentTime + 0.1;

    audio.addEventListener("ended", () => {
      if (!isCurrent()) return; // canción vieja: ignorar
      const current = selectedPresetIndexRef.current;
      if (current === null) {
        setPlaying(false);
        return;
      }
      void loadPresetSongByIndex(
        nextPresetIndex(current, shuffleSongsRef.current),
        true,
      );
    });

    if (options.autoplay) {
      pausedRef.current = false;
      void ctx.resume();
      void audio.play().then(
        () => {
          if (isCurrent()) setPlaying(true);
        },
        () => {
          // el pause() de una carga nueva interrumpe play() (AbortError);
          // solo apagar si esta carga sigue vigente
          if (isCurrent()) setPlaying(false);
        },
      );
    }

    // offline estimate as a seed — playback can start right away meanwhile
    setAnalyzing(true);
    try {
      const decoded = await ctx.decodeAudioData(await arrayBuffer());
      if (!isCurrent()) return; // no sembrar el bpm de otra canción
      const seed = detectBpm(decoded);
      trackerRef.current?.seed(seed);
      setSongBpm((current) => current ?? seed);
    } catch {
      /* the live tracker will find the tempo anyway */
    } finally {
      if (isCurrent()) setAnalyzing(false);
    }
  }

  function loadPresetSongByIndex(index: number, autoplay = false) {
    const song = PRESET_SONGS[index];
    if (!song) return;
    const src = presetSongUrl(song);
    void loadSong(song.name, src, async () => {
      const response = await fetch(src);
      return response.arrayBuffer();
    }, { autoplay, presetIndex: index });
  }

  const handleSongUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const src = URL.createObjectURL(file);
    await loadSong(file.name.replace(/\.[^.]+$/, ""), src, () =>
      file.arrayBuffer(),
    );
  };

  const clearSong = () => {
    if (playing) togglePlay();
    releaseCurrentSong();
    setSongName(null);
    setSelectedPresetIndex(null);
    setSongBpm(null);
    setSongTime(0);
    setSongDuration(0);
    setAnalyzing(false);
  };

  /* ---- repertoire & graph ---- */

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


  const canPlay = mode === "metronome" || !!songName;
  const visibleCall = upcomingCall ?? currentCall;
  const visibleDuration = visibleCall
    ? (durations[visibleCall] ?? figureDuration(visibleCall))
    : null;
  const visibleImplicit = visibleCall ? figureImplies(visibleCall) : undefined;
  const visibleEndsAt = visibleCall ? figureEndsAt(visibleCall) : undefined;
  const nextGroups = groupUpcoming(upcoming).slice(0, 3);
  const idleLabel = displayFigureName(currentStandingAt);
  const songSeekMax = Math.max(songDuration, songTime, 0);

  return (
    <div className="relative flex h-dvh overflow-hidden">
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

        {/* ---- top bar: title · tabs · navigation ---- */}
        <header className="z-10 flex flex-col gap-2 px-3 pt-2 pb-2 sm:px-4 sm:pt-3">
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

            <h1 className="font-display mr-auto text-lg tracking-wide uppercase sm:text-2xl">
              <span className="bg-linear-to-r from-mango via-flame to-rosa bg-clip-text text-transparent">
                Timba Cantante
              </span>
            </h1>

            <div className="shrink-0 sm:order-last">
              <LanguageSwitcher />
            </div>

            <Link
              href="/combos"
              className="hidden rounded-full border border-white/15 px-3 py-1.5 text-sm text-hueso/50 transition-colors hover:text-hueso sm:block"
            >
              {t("nav.combos")}
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
              className="rounded-2xl border border-mango/35 bg-mango/10 px-4 py-3 text-sm font-semibold text-mango"
            >
              {t("nav.caller")}
            </Link>
            <Link
              href="/combos"
              onClick={() => setNavOpen(false)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-hueso/70 transition-colors hover:border-white/20 hover:text-hueso"
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

        {/* ---- caller stage ---- */}
        <div className="z-10 min-h-0 flex-1 px-2 pb-2">
          <div className="flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-night-deep/30 px-4 text-center backdrop-blur-sm">
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs tracking-[0.22em] text-hueso/40 uppercase">
              <span>{t("status.connections")}</span>
              <span>·</span>
              <span>{mode === "song" ? t("status.withSong") : t("status.noSong")}</span>
              <span>·</span>
              <Link
                href="/mapa"
                className="text-mar transition-colors hover:text-hueso"
              >
                {t("status.openMap")}
              </Link>
            </div>

            {/* counter 1-8 — centered above the big words */}
            <div className="mb-8 flex items-end justify-center gap-2 sm:gap-3.5">
              {BEATS.map((count) => {
                const ghost = count === 4 || count === 8;
                const active = playing && beat === count;
                return (
                  <span
                    key={count}
                    className={[
                      "font-display leading-none transition-colors duration-100",
                      count === 5 ? "ml-3 sm:ml-6" : "",
                      ghost
                        ? "text-2xl text-hueso/10 sm:text-3xl"
                        : "text-4xl sm:text-5xl md:text-6xl",
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

            {/* una sola lista que decrece: el actual grande, los que siguen más chicos */}
            <div className="flex w-full max-w-5xl flex-col items-center">
              <h2 className="font-call w-full max-w-full px-2 text-center text-[clamp(2.6rem,13vw,8rem)] leading-none text-balance wrap-break-word min-h-[1.1em]">
                {upcomingCall ? (
                  <span className="text-hueso/35">
                    {displayFigureName(upcomingCall)}
                  </span>
                ) : currentCall ? (
                  <span className="bg-linear-to-r from-rosa via-flame to-mango bg-clip-text text-transparent">
                    {displayFigureName(currentCall)}
                  </span>
                ) : (
                  <span className="text-hueso/15">{idleLabel}</span>
                )}
              </h2>

              <div className="mt-5 flex min-h-8 flex-wrap items-center justify-center gap-2">
                {visibleDuration && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-hueso/45">
                    {visibleDuration}×8
                  </span>
                )}
                {visibleImplicit && (
                  <span className="rounded-full border border-mango/25 bg-mango/10 px-3 py-1 text-xs text-mango/70">
                    {t("doc.implies")} {displayFigureName(visibleImplicit)}
                  </span>
                )}
                {visibleEndsAt && (
                  <span className="rounded-full border border-mar/20 bg-mar/10 px-3 py-1 text-xs text-mar/70">
                    {t("chip.ends")} {displayFigureName(visibleEndsAt)}
                  </span>
                )}
                {!visibleCall && (
                  <span className="rounded-full border border-mar/20 bg-mar/10 px-3 py-1 text-xs text-mar/60">
                    {t("chip.ends")} {displayFigureName(currentStandingAt)}
                  </span>
                )}
              </div>

              {nextGroups.length > 0 && (
                <ol className="mt-10 flex w-full flex-col items-center gap-3">
                  {nextGroups.map((group, index) => (
                    <li
                      key={`${group.join("-")}-${index}`}
                      className={[
                        "font-call w-full max-w-full px-3 text-center leading-tight text-balance wrap-break-word",
                        index === 0
                          ? "text-[clamp(1.4rem,6.5vw,3rem)] text-hueso/65"
                          : index === 1
                            ? "text-[clamp(1.2rem,5.2vw,2.25rem)] text-hueso/40"
                            : "text-[clamp(1rem,4.2vw,1.9rem)] text-hueso/25",
                      ].join(" ")}
                    >
                      {group.map(displayFigureName).join("  →  ")}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* ---- transport controls ---- */}
        <section className="z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 bg-night-deep/50 px-3 py-2 backdrop-blur">
          <button
            onClick={togglePlay}
            disabled={!canPlay}
            aria-label={playing ? "Pausar" : "Empezar"}
            className={[
              "flex size-12 items-center justify-center rounded-full text-night transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
              playing
                ? "bg-rosa shadow-[0_0_28px] shadow-rosa/40"
                : "bg-mango shadow-[0_0_28px] shadow-mango/40",
            ].join(" ")}
          >
            {playing ? (
              <span aria-hidden className="flex items-center gap-1.5">
                <span className="h-4 w-1.5 rounded-full bg-current" />
                <span className="h-4 w-1.5 rounded-full bg-current" />
              </span>
            ) : (
              <span
                aria-hidden
                className="ml-1 h-0 w-0 border-y-[9px] border-y-transparent border-l-14 border-l-current"
              />
            )}
          </button>

          <button
            onClick={stopAndReset}
            aria-label={t("transport.reset")}
            title={t("transport.reset")}
            className="flex size-9 items-center justify-center rounded-full border border-white/15 text-sm text-hueso/60 transition-colors hover:text-hueso"
          >
            ↺
          </button>

          <button
            onClick={() => setTransportSheetOpen(true)}
            aria-label={t("transport.options")}
            title={t("transport.options")}
            className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base text-hueso/70 transition-colors hover:text-hueso sm:hidden"
          >
            ⚙
          </button>

          {mode === "song" && songName && (
            <div
              title={t("transport.intensity")}
              className="h-2 w-24 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-mar via-mango to-rosa transition-[width] duration-75"
                style={{ width: `${Math.round(songLevel * 100)}%` }}
              />
            </div>
          )}

          <div className="hidden sm:block">
            <div
              ref={songPickerRef}
              className="relative flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur"
            >
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={songPickerOpen}
                onClick={() => setSongPickerOpen((open) => !open)}
                className="flex min-w-48 max-w-[58vw] items-center justify-between gap-3 rounded-full bg-night-deep/70 px-4 py-2 text-left text-sm text-hueso shadow-inner shadow-black/20 transition-colors hover:bg-white/10"
              >
                <span className="min-w-0 truncate">
                  {selectedPresetIndex === null
                    ? t("transport.availableSongs")
                    : PRESET_SONGS[selectedPresetIndex]?.name}
                </span>
                <span
                  aria-hidden
                  className={[
                    "h-0 w-0 shrink-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-mango transition-transform",
                    songPickerOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>

              {songPickerOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 bottom-full z-50 mb-2 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-white/15 bg-night-deep/95 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                >
                  <div className="mb-1 px-3 py-1 text-[10px] tracking-[0.22em] text-hueso/35 uppercase">
                    {t("transport.availableSongs")}
                  </div>
                  {PRESET_SONGS.map((song, index) => {
                    const active = selectedPresetIndex === index;
                    return (
                      <button
                        key={song.file}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setSongPickerOpen(false);
                          loadPresetSongByIndex(index, true);
                        }}
                        className={[
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                          active
                            ? "bg-linear-to-r from-mango/25 to-rosa/15 text-hueso"
                            : "text-hueso/65 hover:bg-white/7 hover:text-hueso",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className={[
                            "size-2.5 rounded-full border",
                            active
                              ? "border-mango bg-mango shadow-[0_0_14px] shadow-mango/50"
                              : "border-white/20 bg-white/5",
                          ].join(" ")}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {song.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setShuffleSongs((value) => !value)}
                aria-label={t("transport.random")}
                title={t("transport.random")}
                className={[
                  "flex size-8 items-center justify-center rounded-full border transition-colors",
                  shuffleSongs
                    ? "border-mango/60 bg-mango/15 text-mango"
                    : "border-white/15 text-hueso/45 hover:text-hueso",
                ].join(" ")}
              >
                <ShuffleIcon className="size-4" />
              </button>
            </div>
          </div>

          {songName ? (
            <>
              {/* tempo: input + auto, sin etiqueta (tooltip) */}
              <div
                className="flex items-center gap-1.5"
                title={t("transport.tempo")}
              >
                <input
                  key="song-bpm"
                  type="number"
                  step={0.5}
                  min={120}
                  max={260}
                  value={songBpm ?? ""}
                  placeholder={analyzing ? "…" : "bpm"}
                  disabled={autoTempo}
                  onChange={(e) => setSongBpm(Number(e.target.value) || null)}
                  className="w-18 rounded-full border border-white/15 bg-transparent px-2 py-0.5 text-center text-sm text-hueso outline-none focus:border-mango/60 disabled:opacity-60"
                />
                <button
                  onClick={() => setAutoTempo((a) => !a)}
                  title="Seguir el tempo en vivo"
                  className={[
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    autoTempo
                      ? "border-mar/60 bg-mar/15 text-mar"
                      : "border-white/15 text-hueso/40",
                  ].join(" ")}
                >
                  auto
                </button>
              </div>

              {/* posición: −10s + slider + reloj, todo en línea */}
              <div
                className="flex items-center gap-2"
                title={t("transport.position")}
              >
                <button
                  onClick={() => seekSong(songTime - 10)}
                  aria-label={t("transport.back10")}
                  className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-hueso/60 transition-colors hover:text-hueso"
                >
                  {t("transport.back10")}
                </button>
                <input
                  key="song-position"
                  type="range"
                  min={0}
                  max={songSeekMax || 1}
                  step={0.1}
                  value={Math.min(songTime, songSeekMax || 0)}
                  onChange={(e) => seekSong(Number(e.target.value))}
                  className="w-28 accent-mango sm:w-36"
                />
                <span className="text-[11px] whitespace-nowrap tabular-nums text-hueso/45">
                  {formatClock(songTime)} / {formatClock(songDuration)}
                </span>
              </div>

              {playing && (
                <button
                  onClick={tapOne}
                  className="rounded-full bg-mango px-3.5 py-1 text-sm font-semibold text-night transition-transform hover:scale-105 active:scale-95"
                >
                  {t("transport.theOne")}
                </button>
              )}
              <button
                onClick={clearSong}
                aria-label={t("transport.removeSong")}
                title={t("transport.removeSong")}
                className="hidden text-hueso/40 transition-colors hover:text-rosa sm:block"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <label
                className="flex items-center gap-2"
                title={t("transport.tempo")}
              >
                <input
                  key="metronome-bpm"
                  type="range"
                  min={130}
                  max={240}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-32 accent-mango sm:w-40"
                />
                <span className="text-xs whitespace-nowrap tabular-nums text-hueso/50">
                  {bpm} bpm
                </span>
              </label>
              <label className="hidden cursor-pointer rounded-full border border-mar/50 bg-mar/10 px-3.5 py-1 text-sm text-mar transition-colors hover:bg-mar/20 sm:block">
                {t("transport.upload")}
                <input
                  key="upload-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleSongUpload}
                  className="hidden"
                />
              </label>
            </>
          )}

          <div
            className="hidden overflow-hidden rounded-full border border-white/15 sm:flex"
            title={t("transport.timesX")}
          >
            {[1, 2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCallEveryBars(n)}
                className={[
                  "px-3 py-0.5 text-sm transition-colors",
                  callEveryBars === n
                    ? "bg-mar font-semibold text-night"
                    : "text-hueso/60 hover:text-hueso",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPanelOpen((p) => !p)}
            className="text-xs tracking-[0.2em] text-hueso/40 uppercase transition-colors hover:text-hueso/70"
          >
            {panelOpen ? "▾ " : "▸ "}
            {t("transport.figures")}
          </button>
        </section>

        {transportSheetOpen && (
          <button
            type="button"
            aria-label={t("doc.close")}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] sm:hidden"
            onClick={() => setTransportSheetOpen(false)}
          />
        )}
        <div
          className={[
            "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/15 bg-night-deep/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-transform duration-200 sm:hidden",
            transportSheetOpen ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.22em] text-hueso/40 uppercase">
                {t("transport.options")}
              </p>
              <p className="mt-1 max-w-56 truncate text-sm text-hueso/70">
                {songName ?? t("transport.availableSongs")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTransportSheetOpen(false)}
              className="grid size-9 place-items-center rounded-full border border-white/15 text-hueso/50 transition-colors hover:text-hueso"
              aria-label={t("doc.close")}
            >
              ×
            </button>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs tracking-[0.2em] text-hueso/45 uppercase">
                {t("transport.availableSongs")}
              </span>
              <button
                onClick={() => setShuffleSongs((value) => !value)}
                aria-label={t("transport.random")}
                title={t("transport.random")}
                className={[
                  "flex size-8 items-center justify-center rounded-full border transition-colors",
                  shuffleSongs
                    ? "border-mango/60 bg-mango/15 text-mango"
                    : "border-white/15 text-hueso/45",
                ].join(" ")}
              >
                <ShuffleIcon className="size-4" />
              </button>
            </div>
            <div className="grid gap-2">
              {PRESET_SONGS.map((song, index) => {
                const active = selectedPresetIndex === index;
                return (
                  <button
                    key={song.file}
                    type="button"
                    onClick={() => {
                      setTransportSheetOpen(false);
                      loadPresetSongByIndex(index, true);
                    }}
                    className={[
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                      active
                        ? "border-mango/45 bg-linear-to-r from-mango/20 to-rosa/10 text-hueso"
                        : "border-white/10 bg-white/5 text-hueso/65",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className={[
                        "size-2.5 rounded-full border",
                        active
                          ? "border-mango bg-mango shadow-[0_0_14px] shadow-mango/45"
                          : "border-white/20 bg-white/5",
                      ].join(" ")}
                    />
                    <span className="min-w-0 flex-1 truncate">{song.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="cursor-pointer rounded-full border border-mar/50 bg-mar/10 px-4 py-2 text-sm text-mar transition-colors hover:bg-mar/20">
              {t("transport.upload")}
              <input
                key="upload-file-mobile"
                type="file"
                accept="audio/*"
                onChange={(event) => {
                  setTransportSheetOpen(false);
                  void handleSongUpload(event);
                }}
                className="hidden"
              />
            </label>
            {songName && (
              <button
                onClick={() => {
                  setTransportSheetOpen(false);
                  clearSong();
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-hueso/50 transition-colors hover:text-rosa"
              >
                {t("transport.removeSong")}
              </button>
            )}
          </div>

          <div>
            <span className="mb-2 block text-xs tracking-[0.2em] text-hueso/45 uppercase">
              {t("transport.timesX")}
            </span>
            <div className="grid grid-cols-3 overflow-hidden rounded-full border border-white/15">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setCallEveryBars(n)}
                  className={[
                    "px-4 py-2 text-sm transition-colors",
                    callEveryBars === n
                      ? "bg-mar font-semibold text-night"
                      : "text-hueso/60",
                  ].join(" ")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- repertoire (collapsible) ---- */}
        {panelOpen && (
          <div className="z-10 max-h-64 overflow-y-auto border-t border-white/10 bg-night-deep/60 px-4 py-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-xs tracking-widest text-hueso/40 uppercase">
              <span>
                {enabledFigures.size} {t("transport.figures")} ·{" "}
                {enabledCombos.size} {t("rep.combos")}
              </span>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setEnabledFigures(new Set(FIGURES));
                    setEnabledCombos(new Set(COMBOS.map(comboKey)));
                  }}
                  className="transition-colors hover:text-mango"
                >
                  {t("rep.all")}
                </button>
                <button
                  onClick={() => {
                    setEnabledFigures(new Set());
                    setEnabledCombos(new Set());
                  }}
                  className="transition-colors hover:text-rosa"
                >
                  {t("rep.none")}
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
              {t("rep.combos")}
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
