"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "es" | "de" | "en";
export const LANGS: Lang[] = ["es", "de", "en"];
export const LANG_LABEL: Record<Lang, string> = {
  es: "ES",
  de: "DE",
  en: "EN",
};

type Entry = Record<Lang, string>;

/** UI strings. Los nombres de figuras NO se traducen (son los cantos). */
const UI = {
  tagline: {
    es: "tu cantante de rueda de casino",
    de: "dein Ansager für die Casino-Rueda",
    en: "your casino rueda caller",
  },
  "mode.song": { es: "Canción", de: "Lied", en: "Song" },
  "mode.noSong": { es: "Sin Canción", de: "Ohne Lied", en: "No Song" },
  "nav.combos": { es: "combos", de: "Combos", en: "combos" },
  "nav.caller": { es: "cantante", de: "Ansager", en: "caller" },
  "nav.map": { es: "mapa", de: "Karte", en: "map" },
  "nav.menu": { es: "menú", de: "Menü", en: "menu" },
  "nav.back": { es: "← volver", de: "← zurück", en: "← back" },
  "status.connections": {
    es: "conexiones",
    de: "Verbindungen",
    en: "connections",
  },
  "status.withSong": { es: "canción", de: "Lied", en: "song" },
  "status.noSong": { es: "sin canción", de: "ohne Lied", en: "no song" },
  "status.openMap": { es: "abrir mapa", de: "Karte öffnen", en: "open map" },
  "stage.next": { es: "siguen", de: "weiter", en: "next" },
  "stage.ready": { es: "listo", de: "bereit", en: "ready" },
  "chip.implicit": { es: "implícito", de: "implizit", en: "implicit" },
  "chip.ends": { es: "queda", de: "bleibt", en: "stays" },
  "transport.tempo": { es: "tempo", de: "Tempo", en: "tempo" },
  "transport.auto": { es: "auto", de: "auto", en: "auto" },
  "transport.theOne": {
    es: "¡el 1 es ahora!",
    de: "die 1 ist jetzt!",
    en: "the 1 is now!",
  },
  "transport.upload": {
    es: "♫ subir canción",
    de: "♫ Lied laden",
    en: "♫ upload song",
  },
  "transport.intensity": {
    es: "intensidad",
    de: "Intensität",
    en: "intensity",
  },
  "transport.position": {
    es: "posición",
    de: "Position",
    en: "position",
  },
  "transport.back10": {
    es: "−10 s",
    de: "−10 s",
    en: "−10 s",
  },
  "transport.timesX": { es: "tiempo ×", de: "Tempo ×", en: "time ×" },
  "transport.voice": { es: "voz", de: "Stimme", en: "voice" },
  "transport.clave": { es: "clave", de: "Clave", en: "clave" },
  "transport.figures": { es: "figuras", de: "Figuren", en: "figures" },
  "transport.reset": { es: "reiniciar", de: "zurücksetzen", en: "reset" },
  "transport.removeSong": {
    es: "Quitar canción",
    de: "Lied entfernen",
    en: "Remove song",
  },
  "rep.all": { es: "todas", de: "alle", en: "all" },
  "rep.none": { es: "ninguna", de: "keine", en: "none" },
  "rep.combos": {
    es: "combinaciones",
    de: "Kombinationen",
    en: "combinations",
  },
  "doc.start": {
    es: "▶ punto de inicio",
    de: "▶ Startpunkt",
    en: "▶ start point",
  },
  "doc.startsAt": { es: "empieza en", de: "beginnt in", en: "starts in" },
  "doc.endsAt": { es: "termina en", de: "endet in", en: "ends at" },
  "doc.implies": {
    es: "lleva implícito:",
    de: "beinhaltet:",
    en: "includes:",
  },
  "doc.comesFrom": { es: "viene de", de: "kommt von", en: "comes from" },
  "doc.goesTo": { es: "va a", de: "geht zu", en: "goes to" },
  "doc.noIncoming": {
    es: "sin entradas",
    de: "keine Eingänge",
    en: "no entries",
  },
  "doc.noOutgoing": {
    es: "sin salidas",
    de: "keine Ausgänge",
    en: "no exits",
  },
  "doc.close": { es: "Cerrar", de: "Schließen", en: "Close" },
  "doc.empty": {
    es: "Sin descripción todavía. Escríbela abajo.",
    de: "Noch keine Beschreibung. Unten schreiben.",
    en: "No description yet. Write it below.",
  },
  "doc.placeholder": {
    es: "describe la figura para aprender…",
    de: "Figur zum Lernen beschreiben…",
    en: "describe the figure to learn…",
  },
  "map.newFigure": { es: "nueva figura", de: "neue Figur", en: "new figure" },
  "map.name": { es: "nombre…", de: "Name…", en: "name…" },
  "map.export": { es: "exportar", de: "exportieren", en: "export" },
  "map.organize": { es: "organizar", de: "anordnen", en: "arrange" },
  "map.clearEdges": {
    es: "borrar enlaces",
    de: "Verbindungen löschen",
    en: "clear links",
  },
  "map.links": { es: "enlaces", de: "Verbindungen", en: "links" },
  "map.copied": { es: "copiado", de: "kopiert", en: "copied" },
  "map.downloaded": {
    es: "descargado",
    de: "heruntergeladen",
    en: "downloaded",
  },
  "map.title": {
    es: "Mapa de figuras",
    de: "Figurenkarte",
    en: "Figure map",
  },
  "map.subtitle": {
    es: "qué figura sigue a cuál",
    de: "welche Figur auf welche folgt",
    en: "which figure follows which",
  },
  "combos.title": { es: "Combos", de: "Combos", en: "Combos" },
  "combos.subtitle": {
    es: "arma combinaciones desde un hub",
    de: "Kombinationen aus einem Hub bauen",
    en: "build combinations from a hub",
  },
  "combos.startIn": { es: "empezar en", de: "starten in", en: "start in" },
  "combos.total": { es: "total", de: "gesamt", en: "total" },
  "combos.ochos": { es: "ochos", de: "Achter", en: "eights" },
  "combos.endsAt": { es: "termina en", de: "endet in", en: "ends at" },
  "combos.fromYouCan": {
    es: "se puede",
    de: "möglich",
    en: "you can",
  },
  "combos.from": { es: "desde", de: "ab", en: "from" },
  "combos.allFigures": {
    es: "todas las figuras",
    de: "alle Figuren",
    en: "all figures",
  },
  "combos.free": { es: "libre", de: "frei", en: "free" },
  "combos.noExits": {
    es: "no hay salidas conectadas — activa «libre» para agregar cualquier figura",
    de: "keine verbundenen Ausgänge — «frei» aktivieren, um jede Figur hinzuzufügen",
    en: "no connected exits — enable “free” to add any figure",
  },
  "combos.namePlaceholder": {
    es: "nombre del combo (opcional)",
    de: "Combo-Name (optional)",
    en: "combo name (optional)",
  },
  "combos.clear": { es: "limpiar", de: "leeren", en: "clear" },
  "combos.save": { es: "guardar combo", de: "Combo speichern", en: "save combo" },
  "combos.update": {
    es: "actualizar",
    de: "aktualisieren",
    en: "update",
  },
  "combos.fromHub": { es: "Desde", de: "Ab", en: "From" },
  "combos.edit": { es: "editar", de: "bearbeiten", en: "edit" },
  "combos.copy": { es: "copiar", de: "kopieren", en: "copy" },
  "combos.delete": { es: "borrar", de: "löschen", en: "delete" },
} satisfies Record<string, Entry>;

export type UIKey = keyof typeof UI;

const LANG_STORAGE_KEY = "timba-lang";

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
}>({ lang: "es", setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
      if (saved && LANGS.includes(saved)) {
        setLangState(saved);
        document.documentElement.lang = saved;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = next;
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function useT() {
  const { lang } = useContext(LangContext);
  return (key: UIKey) => UI[key][lang];
}
