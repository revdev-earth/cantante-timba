/**
 * Metadatos estructurales de cada figura: dónde empieza y dónde termina (los
 * dos hubs Básico / Guapeala), y qué lleva implícito. Las descripciones y sus
 * traducciones viven en `glossary-i18n.ts` (es / de / en).
 */

export const HUBS = ["Básico", "Guapeala"] as const;
export type Hub = (typeof HUBS)[number];

/** Figuras desde las que se puede empezar una rueda / un combo. */
export const START_FIGURES: readonly string[] = ["Básico", "Guapeala"];

export type FigureDoc = {
  /**
   * Estado(s) de descanso desde el que se baila la figura. Normalmente un hub
   * (Básico o Guapeala), pero también puede ser otro estado como Contratiempo,
   * y puede haber más de uno (ej. Sabrosura sale de Contratiempo o de Básico).
   */
  startsAt?: string | string[];
  /** Estado donde queda al terminar (hub o estado como Contratiempo). */
  endsAt?: string;
  /** Figura que lleva implícita y no hay que cantar (ej. el Dile que no). */
  implies?: string;
};

export const FIGURE_DOC: Record<string, FigureDoc> = {
  // ── Hubs ──────────────────────────────────────────────
  Básico: {},
  Guapeala: {},

  // ── Bridge figures ────────────────────────────────────
  "Dile que no": { startsAt: "Básico", endsAt: "Guapeala" },
  "Dile que sí": { startsAt: "Guapeala", endsAt: "Básico" },

  // ── Sabor desde Básico ────────────────────────────────
  Exhibela: { startsAt: "Básico", endsAt: "Básico" },
  Cocacola: { startsAt: "Básico", endsAt: "Guapeala", implies: "Dile que no" },
  Cocacolita: {
    startsAt: "Básico",
    endsAt: "Guapeala",
    implies: "Dile que no",
  },
  Contratiempo: { startsAt: "Básico", endsAt: "Contratiempo" },
  Sabrosura: { startsAt: ["Contratiempo", "Básico"] },

  // ── American ──────────────────────────────────────────
  Americano: { startsAt: "Contratiempo", endsAt: "Básico" },
  Americana: { startsAt: "Contratiempo", endsAt: "Básico" },
  "Todos americanos": { startsAt: "Contratiempo", endsAt: "Básico" },
  Corazón: { startsAt: "Todos americanos", endsAt: "Todos americanos" },

  // ── Arriba / Abajo / Tarro ────────────────────────────
  Arriba: { startsAt: ["Básico", "Arriba", "Abajo"], endsAt: "Arriba" },
  Abajo: { startsAt: ["Básico", "Arriba", "Abajo"], endsAt: "Abajo" },
  Tarro: { startsAt: "Arriba", endsAt: "Arriba" },
  "Pa dentro y pa fuera": { startsAt: "Básico", endsAt: "Básico" },

  // ── Camina / Saluda ───────────────────────────────────
  "Camina la rueda": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Saluda la rueda": { startsAt: "Guapeala", endsAt: "Guapeala" },
  Salúdate: { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Salúdate y dame": { startsAt: "Guapeala", endsAt: "Guapeala" },

  // ── Enchuflas ─────────────────────────────────────────
  Enchufla: { startsAt: "Guapeala", endsAt: "Guapeala", implies: "Dile que no" },
  "Enchufla arriba": {
    startsAt: "Guapeala",
    endsAt: "Guapeala",
    implies: "Dile que no",
  },
  "Enchufla doble": {
    startsAt: "Guapeala",
    endsAt: "Guapeala",
    implies: "Dile que no",
  },

  // ── Directos ──────────────────────────────────────────
  Directo: { startsAt: "Guapeala", endsAt: "Guapeala", implies: "Dile que no" },
  "Directo pasando": {
    startsAt: "Guapeala",
    endsAt: "Guapeala",
    implies: "Dile que no",
  },
  "Directo pareja": {
    startsAt: "Guapeala",
    endsAt: "Guapeala",
    implies: "Dile que no",
  },

  // ── Dames ─────────────────────────────────────────────
  Dame: { startsAt: "Guapeala", endsAt: "Guapeala", implies: "Dile que no" },
  "Dame una arriba": {
    startsAt: "Guapeala",
    endsAt: "Guapeala",
    implies: "Dile que no",
  },
  "Dame dos": {
    startsAt: "Guapeala",
    endsAt: "Guapeala",
    implies: "Dile que no",
  },
  "Dame dos y una afuera": {
    startsAt: "Guapeala",
    endsAt: "Guapeala",
    implies: "Dile que no",
  },

  // ── Setentas ──────────────────────────────────────────
  "70": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "70 por abajo": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "70 complicada": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "80": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "90": { startsAt: "Guapeala", endsAt: "Guapeala" },

  // ── Sombreros ─────────────────────────────────────────
  Sombrero: { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Sombrero doble": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Sombrero complicado": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Sombrero por abajo": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Sombrero por atrás": { startsAt: "Guapeala", endsAt: "Guapeala" },

  // ── Cero / Ocho ───────────────────────────────────────
  Cero: { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Cero la vecina": { startsAt: "Guapeala", endsAt: "Guapeala" },
  Ocho: { startsAt: "Guapeala", endsAt: "Guapeala" },

  // ── Mira la bonita ────────────────────────────────────
  "Mira la bonita": { startsAt: "Guapeala", endsAt: "Básico" },
  "Mira la bonita arriba": {
    startsAt: "Guapeala",
    endsAt: "Básico",
    implies: "Dile que no",
  },
  "Mira la bonita sola": { startsAt: "Guapeala", endsAt: "Básico" },

  // ── Fly ───────────────────────────────────────────────
  Fly: { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Fly doble": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Festival de flies": { startsAt: "Guapeala", endsAt: "Guapeala" },

  // ── Lazos ─────────────────────────────────────────────
  Lazo: { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Mujeres dos arriba": { startsAt: "Guapeala", endsAt: "Guapeala" },
  "Lazo mujeres dos arriba": { startsAt: "Guapeala", endsAt: "Guapeala" },

  // ── Paséala ───────────────────────────────────────────
  Paséala: { startsAt: "Guapeala", endsAt: "Básico" },

  // ── Patineta ──────────────────────────────────────────
  Patineta: { startsAt: "Guapeala", endsAt: "Guapeala" },
  Manolín: { startsAt: "Guapeala", endsAt: "Guapeala" },
  Cambio: { startsAt: ["Patineta", "Manolín"], endsAt: "Patineta" },
  "Se fue": { startsAt: "Guapeala", endsAt: "Guapeala", implies: "Dile que no" },

  // ── Tijera simple ─────────────────────────────────────
  "Tijera simple": { startsAt: "Guapeala", endsAt: "Guapeala" },

  // ── Ni pa ti ni pa mi ─────────────────────────────────
  "Ni pa ti ni pa mi": { startsAt: "Guapeala" },

  // ── Saloneo ───────────────────────────────────────────
  Saloneo: { startsAt: "Básico", endsAt: "Saloneo" },
  Tarita: { startsAt: "Saloneo", endsAt: "Saloneo" },
  Fantasma: { startsAt: "Saloneo", endsAt: "Saloneo" },
  "Fantasma al centro": { startsAt: "Saloneo", endsAt: "Saloneo" },
  Fantasmita: { startsAt: "Saloneo", endsAt: "Saloneo" },

  // ── Croqueta y salidas ────────────────────────────────
  Croqueta: { startsAt: "Guapeala", endsAt: "Croqueta" },
  Trompo: { startsAt: "Croqueta", endsAt: "Croqueta" },
  "Trompo por abajo": { startsAt: "Croqueta", endsAt: "Croqueta" },
  "Dos giros": { startsAt: "Croqueta", endsAt: "Croqueta" },
  Amistad: { startsAt: "Croqueta", endsAt: "Guapeala", implies: "Dile que no" },

  // ── Foto ──────────────────────────────────────────────
  Foto: {},
};

export function figureStartsAt(figure: string): string[] {
  const start = FIGURE_DOC[figure]?.startsAt;
  if (!start) return [];
  return Array.isArray(start) ? start : [start];
}

export function figureEndsAt(figure: string): string | undefined {
  return FIGURE_DOC[figure]?.endsAt;
}

export function figureImplies(figure: string): string | undefined {
  return FIGURE_DOC[figure]?.implies;
}

export function isStartFigure(figure: string): boolean {
  return START_FIGURES.includes(figure);
}
