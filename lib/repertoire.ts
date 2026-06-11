/* Rueda de casino repertoire (from the handwritten notes) */

export const FIGURES = [
  "Básico",
  "Americano",
  "Americana",
  "Todos americanos",
  "Corazón",
  "Guapeala",
  "Directo",
  "Directo pasando",
  "Exhibela",
  "Dile que no",
  "Dile que sí",
  "Enchufla",
  "Enchufla arriba",
  "Enchufla doble",
  "Cocacola",
  "Cocacolita",
  "Arriba",
  "Abajo",
  "Tarro",
  "Pa dentro pa fuera",
  "Camina la rueda",
  "Saluda la rueda",
  "Salúdate",
  "Salúdate y dame",
  "Dame",
  "Dame una arriba",
  "Dame dos",
  "Dame dos y una afuera",
  "Patineta",
  "Ni pa ti ni pa mi",
  "Fly",
  "Fly doble",
  "Festival de flies",
  "70",
  "70 por abajo",
  "70 complicada",
  "80",
  "90",
  "Tijera simple",
  "Sombrero",
  "Sombrero complicado",
  "Sombrero doble",
  "Sombrero por abajo",
  "Sombrero por atrás",
  "Lazo",
  "Mujeres dos arriba",
  "Lazo mujeres dos arriba",
  "Paséala",
  "Cero",
  "Cero la vecina",
  "Ocho",
  "Mira la bonita",
  "Mira la bonita arriba",
  "Mira la bonita sola",
  "Contratiempo",
  "Sabrosura",
  "Saloneo",
  "Tarita",
  "Fantasma",
  "Fantasma al centro",
  "Fantasmita",
  "Croqueta",
  "Trompo",
  "Trompo por abajo",
  "Dos giros",
  "Amistad",
  "Directo pareja",
  "Foto",
];

/**
 * Figure combinations — sung in sequence, one figure per call.
 *
 * En la rueda todo vuelve a `Básico` o `Guapeala`; estos combos son los
 * pedacitos que se juegan saliendo de esos dos hubs. Pequeños (2-3 figuras)
 * y que fluyen de verdad.
 */
export const COMBOS: string[][] = [
  // —— desde Guapeala (se llega haciendo un Dile que no) ——
  ["Enchufla", "Dame"],
  ["Enchufla", "Lazo"],
  ["Enchufla", "Lazo mujeres dos arriba"],
  ["Dile que no", "Mira la bonita"],
  ["Dile que no", "Mira la bonita sola"],
  ["Dame", "Dame dos", "Dame dos y una afuera"],
  ["70", "80", "90"],
  ["Sombrero", "Sombrero doble"],
  ["Sombrero", "Sombrero complicado"],
  ["Cero", "Cero la vecina"],
  ["Directo", "Directo pasando"],
  ["Saluda la rueda", "Fly", "Fly doble"],
  ["Fly doble", "Festival de flies"],

  // —— desde Básico (base / sabor; se sale con un Dile que no) ——
  ["Arriba", "Tarro", "Abajo"],
  ["Exhibela", "Dile que no"],
  ["Dile que no", "Dame"],
  ["Dile que no", "Paséala"],
  ["Contratiempo", "Sabrosura"],
  ["Todos americanos", "Corazón"],

  // —— Croqueta y sus salidas ——
  ["Croqueta", "Exhibela"],
  ["Croqueta", "Trompo", "Trompo por abajo"],
  ["Croqueta", "Dos giros", "Amistad"],
];

export const COMBO_SEPARATOR = " → ";

export const comboKey = (combo: string[]) => combo.join(COMBO_SEPARATOR);

/**
 * How many "ochos" (8-count bars) each figure takes to execute. Drives how
 * long the caller waits before the next call. Anything not listed = 1 ocho.
 */
const FIGURE_DURATION: Record<string, number> = {
  Enchufla: 2,
  "Enchufla arriba": 2,
  "Enchufla doble": 3,
  "70": 3,
  "70 por abajo": 3,
  "70 complicada": 3,
  "80": 3,
  "90": 3,
  "Sombrero doble": 2,
  "Sombrero complicado": 2,
};

export const DEFAULT_FIGURE_DURATION = 1;

export function figureDuration(figure: string): number {
  return FIGURE_DURATION[figure] ?? DEFAULT_FIGURE_DURATION;
}

const FIGURE_DISPLAY: Record<string, string> = {
  "70": "70 · setenta",
  "70 por abajo": "70 por abajo · setenta por abajo",
  "70 complicada": "70 complicada · setenta complicada",
  "80": "80 · ochenta",
  "90": "90 · noventa",
  Ocho: "Ocho · 8",
};

export function displayFigureName(figure: string): string {
  return FIGURE_DISPLAY[figure] ?? figure;
}

export function displayRepertoireItem(item: string): string {
  if (item.includes(COMBO_SEPARATOR)) {
    return item
      .split(COMBO_SEPARATOR)
      .map(displayFigureName)
      .join(COMBO_SEPARATOR);
  }
  return displayFigureName(item);
}

/* One entry of the call queue: a single figure, possibly part of a combo */
export type QueueItem = {
  figure: string;
  combo?: string[];
  comboStep?: number;
};

/* A user-built practice list: ordered figures and/or combos */
export type PracticeList = {
  id: string;
  name: string;
  items: string[];
};

/* Expand a repertoire item (figure name or combo key) into queue entries */
export function expandItem(item: string): QueueItem[] {
  if (item.includes(COMBO_SEPARATOR)) {
    const figures = item.split(COMBO_SEPARATOR);
    return figures.map((figure, i) => ({
      figure,
      combo: figures,
      comboStep: i,
    }));
  }
  return [{ figure: item }];
}
