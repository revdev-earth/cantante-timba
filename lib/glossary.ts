/**
 * Documentación de figuras: qué significan y en qué hub terminan.
 *
 * En la rueda todo descansa en dos hubs: `Básico` y `Guapeala`. Cada figura
 * "termina en" uno de ellos — ahí es donde quedas parado y desde donde sale
 * la siguiente. Esto es lo que la gente lee en la app para aprender.
 */

export const HUBS = ["Básico", "Guapeala"] as const;
export type Hub = (typeof HUBS)[number];

/** Figuras desde las que se puede empezar una rueda / un combo. */
export const START_FIGURES: readonly string[] = ["Básico", "Guapeala"];

export type FigureDoc = {
  /** Hub donde termina la figura (dónde quedas al acabarla). */
  endsAt?: Hub;
  /** Figura que lleva implícita y no hay que cantar (ej. el Dile que no). */
  implies?: string;
  /** Explicación para aprender. */
  note?: string;
};

export const FIGURE_DOC: Record<string, FigureDoc> = {
  Básico: {
    note: "Punto de descanso y base de la rueda. Desde aquí salen las figuras de a poco; para pasar al lado de las vueltas se hace un Dile que no.",
  },
  Guapeala: {
    note: "Hub de lucimiento: enchuflas, lazos, sombreros, setentas, mira la bonita… Se llega haciendo un Dile que no.",
  },
  Enchufla: {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Pasa la pareja a la siguiente persona de la rueda. Lleva el Dile que no implícito, así que no hay que cantarlo: termina en Guapeala.",
  },
  "Dile que no": {
    endsAt: "Guapeala",
    note: "Cierra la salida de Básico y te deja parado en Guapeala.",
  },
  "Mira la bonita": {
    endsAt: "Básico",
    note: "Termina en Básico.",
  },
  Cocacola: {
    endsAt: "Guapeala",
    note: "Termina en Guapeala.",
  },
  Cocacolita: {
    endsAt: "Guapeala",
    note: "Termina en Guapeala.",
  },
  Croqueta: {
    endsAt: "Guapeala",
    note: "Termina en Guapeala.",
  },
  Exhibela: {
    note: "Lucimiento de la dama desde Básico; se cierra con un Dile que no para pasar a Guapeala.",
  },
  Tarro: {
    note: "El que guía cambia de pareja en la rueda. Se entra desde Arriba; después se sigue con la anterior (Arriba) y de ahí se puede cambiar a Abajo.",
  },
};

export function figureEndsAt(figure: string): string | undefined {
  return FIGURE_DOC[figure]?.endsAt;
}

export function figureImplies(figure: string): string | undefined {
  return FIGURE_DOC[figure]?.implies;
}

export function isStartFigure(figure: string): boolean {
  return START_FIGURES.includes(figure);
}
