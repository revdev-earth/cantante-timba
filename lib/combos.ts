import { COMBO_SEPARATOR } from "./repertoire";
import { figureEndsAt, type Hub } from "./glossary";

/**
 * Combos = pequeñas combinaciones que arrancan en un hub (Básico o Guapeala)
 * y juegan 2-3 figuras. Los default vienen del repertorio; el usuario crea y
 * guarda los suyos en la página /combos (localStorage).
 */

export type Combo = {
  id: string;
  name: string;
  start: Hub;
  figures: string[];
};

export const USER_COMBOS_STORAGE_KEY = "timba-user-combos";

const mk = (start: Hub, figures: string[]): Combo => ({
  id: `default:${figures.join("|")}`,
  name: figures.join(COMBO_SEPARATOR),
  start,
  figures,
});

export const DEFAULT_COMBOS: Combo[] = [
  // —— Guapeala ——
  mk("Guapeala", ["Enchufla", "Dame"]),
  mk("Guapeala", ["Enchufla", "Lazo"]),
  mk("Guapeala", ["Enchufla", "Lazo mujeres dos arriba"]),
  mk("Guapeala", ["Dame", "Dame dos", "Dame dos y una afuera"]),
  mk("Guapeala", ["70", "80", "90"]),
  mk("Guapeala", ["Sombrero", "Sombrero doble"]),
  mk("Guapeala", ["Sombrero", "Sombrero complicado"]),
  mk("Guapeala", ["Cero", "Cero la vecina"]),
  mk("Guapeala", ["Directo", "Directo pasando"]),
  mk("Guapeala", ["Fly doble", "Festival de flies"]),
  mk("Guapeala", ["Croqueta", "Exhibela"]),
  mk("Guapeala", ["Croqueta", "Trompo", "Trompo por abajo"]),
  mk("Guapeala", ["Croqueta", "Dos giros", "Amistad"]),

  // —— Básico ——
  mk("Básico", ["Dile que no", "Mira la bonita"]),
  mk("Básico", ["Dile que no", "Mira la bonita sola"]),
  mk("Básico", ["Dile que no", "Dame"]),
  mk("Básico", ["Dile que no", "Paséala"]),
  mk("Básico", ["Arriba", "Tarro", "Abajo"]),
  mk("Básico", ["Exhibela", "Dile que no"]),
  mk("Básico", ["Cocacola", "Cocacolita"]),
  mk("Básico", ["Doble tiempo", "Sabrosura"]),
  mk("Básico", ["Todos americanos", "Corazón"]),
  mk("Básico", ["Saluda la rueda", "Fly", "Fly doble"]),
];

/** Hub donde termina el combo (según la última figura). */
export function comboEndsAt(combo: Combo): string {
  const last = combo.figures[combo.figures.length - 1];
  return figureEndsAt(last) ?? last;
}

/** Total de ochos del combo, sumando la duración de cada figura. */
export function comboOchos(
  combo: Combo,
  durations: Record<string, number>,
): number {
  return combo.figures.reduce((sum, f) => sum + (durations[f] ?? 1), 0);
}

export function loadUserCombos(): Combo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_COMBOS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Combo[]) : [];
  } catch {
    return [];
  }
}

export function saveUserCombos(combos: Combo[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_COMBOS_STORAGE_KEY, JSON.stringify(combos));
}
