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
  // ── Hubs ──────────────────────────────────────────────
  Básico: {
    note: "No se canta: es el estado de descanso al que se llega después de muchas figuras. Posición cerrada, los dos de frente. Desde aquí salen las figuras de sabor; para pasar al lado de las vueltas se hace un Dile que no.",
  },
  Guapeala: {
    note: "No se canta: es el estado al que se llega desde un Dile que no. La persona que sigue queda a la izquierda y la persona líder a la derecha. Las dos hacen los primeros 3 pasos mirando hacia el círculo, luego se acercan en espejo: la persona líder extiende su mano derecha y la persona que sigue su mano izquierda, se tocan como empujándose y vuelven a la posición abierta mirando al círculo. De aquí salen enchuflas, lazos, sombreros y demás vueltas.",
  },

  // ── Bridge figures ────────────────────────────────────
  "Dile que no": {
    endsAt: "Guapeala",
    note: "Desde Básico, la persona líder se mueve hacia delante y la persona que sigue va un poco hacia atrás para tomar impulso. La persona que sigue da un paso atrás y dos adelante formando un triángulo, y en ese triángulo pasa al otro lado con un giro de 180° para quedar en Guapeala. En la pausa del 4 se puede meter estilo (levantar la pierna, etc.) y al terminar en el 7 también cae otro momento de estilo (hombros, cadera). 1×8.",
  },
  "Dile que sí": {
    endsAt: "Básico",
    note: "Lo contrario del Dile que no: te devuelve de Guapeala a Básico. Desde Guapeala, la persona líder con la mano izquierda dirige a la persona que sigue de izquierda a derecha, quedando ambas de frente en posición de Básico. 1×8.",
  },

  // ── Sabor desde Básico ────────────────────────────────
  Exhibela: {
    endsAt: "Básico",
    note: "Desde Básico, la persona líder levanta su mano izquierda y la persona que sigue, con su mano derecha conectada a esa mano, da una vuelta hacia la derecha moviendo el cuerpo hacia la derecha y regresa al Básico. 1×8.",
  },
  Cocacola: {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Arranca con un Dile que no y la pareja hace tres giros de 180°. Al pasar los primeros 180°, la persona que sigue gira hacia adentro mientras la persona líder está atrás girando o avanzando con ella. Cuando completan los tres giros y regresan a la posición inicial, cierran con otro Dile que no para terminar en Guapeala. Se puede cantar solo «cocacola» o «dile que no cocacola». 1×8.",
  },
  Cocacolita: {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Igual que la Cocacola pero más rápida y adornada: antes del giro de 180° se hace un giro hacia adentro de la persona que sigue. Lleva el Dile que no implícito al inicio. Se puede cantar solo «cocacolita» o «dile que no cocacolita». Termina en Guapeala. 1×8.",
  },
  Contratiempo: {
    note: "Paso básico en contratiempo (acentuando en el 2 y el 6 en vez del 1 y el 5). Es el estado desde donde arrancan Americano, Americana y Todos americanos. 1×8.",
  },
  Sabrosura: {
    note: "Figura de sabor y goce desde Contratiempo. Se juega con el ritmo, movimientos de cadera y brazos libres. Puro estilo. 1×8.",
  },

  // ── American ───────────────────────────────
  Americano: {
    endsAt: "Básico",
    note: "Desde Contratiempo, es una enchufla para la persona líder: rota su cuerpo hacia la izquierda y pasa a la siguiente persona que sigue. Termina en Básico con nueva pareja. 1×8.",
  },
  Americana: {
    endsAt: "Básico",
    note: "Desde Contratiempo, es una enchufla para la persona que sigue: va hacia la derecha y pasa al siguiente líder. Termina en Básico. 1×8.",
  },
  "Todos americanos": {
    endsAt: "Básico",
    note: "Desde Contratiempo, las dos personas hacen una enchufla: el líder rota hacia la izquierda, la persona que sigue va hacia la derecha y vuelven a Básico. Antes de llegar a la mitad se puede meter Corazón o Salúdate. 1×8.",
  },
  Corazón: {
    note: "Desde Todos americanos, la persona líder hace un gesto de corazón con las manos de la pareja mientras la saca. Figura romántica y de conexión. 1×8.",
  },

  // ── Arriba / Abajo / Tarro ────────────────────────────
  Arriba: {
    note: "Desde Básico, las personas líderes se mueven en la dirección del círculo hacia arriba (cerrándolo) y las personas que siguen van hacia atrás, manteniendo el paso básico. Ajusta el tamaño de la rueda. 1×8.",
  },
  Abajo: {
    note: "Lo contrario de Arriba: las personas líderes se mueven hacia abajo (abriendo el círculo) y las que siguen hacia atrás, manteniendo el básico. 1×8.",
  },
  Tarro: {
    note: "Cambio de pareja en posición cerrada. La persona líder alza su mano izquierda y la persona que sigue conecta su mano derecha a esa mano. Hace un triángulo: primeros 3 pasos hacia la izquierda y los siguientes 3 hacia la derecha, pasando así a la persona que sigue al siguiente líder. 1×8.",
  },
  "Pa dentro pa fuera": {
    note: "Desde Básico, la persona líder hace un juego de pies cruzados: abre el cuerpo hacia la derecha los primeros 3 pasos y hacia la izquierda los últimos 3. La persona que sigue avanza 3 pasos en dirección del círculo, gira a la izquierda y hace otros 3. Entre ambas se crea un efecto de ola. Puro sabor de timba. 1×8.",
  },

  // ── Camina / Saluda ───────────────────────────────────
  "Camina la rueda": {
    note: "Caminar la rueda. Las parejas caminan en sentido circular siguiendo el borde de la rueda. Desde aquí se lanzan Saluda la rueda, Fly o Ni pa ti ni pa mi. 1×8.",
  },
  "Saluda la rueda": {
    note: "Saludar a la rueda. Desde Camina, la pareja hace un gesto de saludo hacia el centro. Suele conectar con Fly o Fly doble. 1×8.",
  },
  Salúdate: {
    note: "Salúdate. La pareja se saluda entre sí con un gesto de manos. Figura de conexión y juego desde Básico. 1×8.",
  },
  "Salúdate y dame": {
    note: "Combinación: primero se saludan y luego la persona que sigue pasa al siguiente líder (como un Dame + Salúdate juntos). 1×8.",
  },

  // ── Enchuflas ─────────────────────────────────────────
  Enchufla: {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Desde Guapeala, la persona líder mueve su mano izquierda un poco hacia afuera para tomar impulso y dirige a la persona que sigue hacia la derecha. Al levantar la mano izquierda, la persona que sigue gira hacia adentro (hacia la derecha, hacia el interior de la pareja) a los 180°, completa el giro de 360° y sigue su camino hacia la siguiente persona líder. La persona líder continúa hacia adelante a recibir a su nueva pareja. Al encontrarse, las dos personas hacen un Dile que no implícito. 2×8.",
  },
  "Enchufla arriba": {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Igual que la Enchufla hasta los 180°, pero en vez de seguir, la persona que sigue se queda ahí. La persona líder da una vuelta hacia adentro de la rueda para encontrarse con su nueva pareja. Al encontrarse, las dos personas hacen un Dile que no implícito y quedan más cerca del centro. 2×8.",
  },
  "Enchufla doble": {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Comienza como una Enchufla pero a los 90° (primeros 3 pasos) la persona que sigue se devuelve hacia atrás sin completar la vuelta. Luego la persona líder la jala de nuevo, gira hacia adentro de la pareja y continúa hacia la siguiente persona. Al encontrarse hacen un Dile que no implícito. 3×8.",
  },

  // ── Directos ──────────────────────────────────────────
  Directo: {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Desde Guapeala, con la mano izquierda (puede cambiarse de mano o no), las dos personas se jalan para darse impulso y se dirigen hacia la primera persona en esa dirección. Al llegar hacen un Dile que no implícito para quedar en Guapeala. 1×8.",
  },
  "Directo pasando": {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Igual que el Directo pero en vez de llegar a la primera persona, pasan de largo y llegan a la segunda. Cierran con Dile que no implícito. 1×8.",
  },
  "Directo pareja": {
    endsAt: "Guapeala",
    implies: "Dile que no",
    note: "Desde Guapeala, se dan impulso y le dan toda la vuelta a la rueda hasta regresar con su pareja original. Cierran con Dile que no implícito para quedar en Guapeala. 1×8.",
  },

  // ── Dames ─────────────────────────────────────────────
  Dame: {
    endsAt: "Básico",
    note: "Desde Guapeala, la persona que sigue deja su mano izquierda para que la persona líder coloque su mano derecha en su omóplato. La persona que sigue pone su mano en el hombro del líder. En esta posición cerrada, la persona líder se acerca a la siguiente pareja y hacen un Dile que no. 1×8.",
  },
  "Dame una arriba": {
    endsAt: "Básico",
    note: "Dame cerrando la rueda. Igual que el Dame pero la persona líder y su nueva pareja quedan más cerca del centro. 1×8.",
  },
  "Dame dos": {
    note: "Se deja la pareja actual. La persona que sigue pasa una persona por delante (por adentro del círculo), llegando a la segunda persona que sigue. La persona líder se acerca y hacen un Dile que no, encontrando el ritmo para terminarlo juntos. 1×8.",
  },
  "Dame dos y una afuera": {
    note: "Comienza con Dame dos: se pasa la primera persona, luego la persona líder sale del círculo mientras la persona que sigue va por adentro. Después la persona líder vuelve hacia la tercera persona y la persona que sigue regresa a la posición del círculo. Cierran con un Dile que no. 1×8.",
  },

  // ── Setentas ──────────────────────────────────────────
  "70": {
    endsAt: "Guapeala",
  },
  "70 por abajo": {
    endsAt: "Guapeala",
  },
  "70 complicada": {
    endsAt: "Guapeala",
  },
  "80": {
    endsAt: "Guapeala",
  },
  "90": {
    endsAt: "Guapeala",
  },

  // ── Sombreros ─────────────────────────────────────────
  Sombrero: {
    endsAt: "Guapeala",
  },
  "Sombrero doble": {
    endsAt: "Guapeala",
  },
  "Sombrero complicado": {
    endsAt: "Guapeala",
  },
  "Sombrero por abajo": {
    endsAt: "Guapeala",
  },
  "Sombrero por atrás": {
    endsAt: "Guapeala",
  },

  // ── Cero / Ocho ───────────────────────────────────────
  Cero: {
    endsAt: "Guapeala",
  },
  "Cero la vecina": {
    endsAt: "Guapeala",
  },
  Ocho: {
    endsAt: "Guapeala",
  },

  // ── Mira la bonita ────────────────────────────────────
  "Mira la bonita": {
    endsAt: "Básico",
  },
  "Mira la bonita arriba": {
    endsAt: "Básico",
  },
  "Mira la bonita sola": {
    endsAt: "Básico",
  },

  // ── Fly ───────────────────────────────────────────────
  Fly: {
    endsAt: "Guapeala",
  },
  "Fly doble": {
    endsAt: "Guapeala",
  },
  "Festival de flies": {
    endsAt: "Guapeala",
  },

  // ── Lazos ─────────────────────────────────────────────
  Lazo: {
    endsAt: "Guapeala",
  },
  "Mujeres dos arriba": {
    endsAt: "Guapeala",
  },
  "Lazo mujeres dos arriba": {
    endsAt: "Guapeala",
  },

  // ── Paséala ───────────────────────────────────────────
  Paséala: {
    endsAt: "Básico",
  },

  // ── Patineta ──────────────────────────────────────────
  Patineta: {
    endsAt: "Guapeala",
  },

  // ── Tijera simple ─────────────────────────────────────
  "Tijera simple": {
    endsAt: "Guapeala",
  },

  // ── Ni pa ti ni pa mi ─────────────────────────────────
  "Ni pa ti ni pa mi": {},

  // ── Saloneo ───────────────────────────────────────────
  Saloneo: {},
  Tarita: {},
  Fantasma: {},
  "Fantasma al centro": {},
  Fantasmita: {},

  // ── Croqueta y salidas ────────────────────────────────
  Croqueta: {
    endsAt: "Guapeala",
  },
  Trompo: {
    endsAt: "Guapeala",
  },
  "Trompo por abajo": {
    endsAt: "Guapeala",
  },
  "Dos giros": {
    endsAt: "Guapeala",
  },
  Amistad: {
    endsAt: "Guapeala",
  },

  // ── Foto ──────────────────────────────────────────────
  Foto: {},
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
