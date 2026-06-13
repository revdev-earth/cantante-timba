import { FIGURES } from "./repertoire";

/**
 * Connection map: a directed graph of figure-to-figure transitions.
 *
 * An edge a → b means "after a, b is a natural next call". The caller can
 * walk this graph to produce musically/physically sensible chains
 * (enchufla → croqueta → trompo …) instead of pure randomness.
 */

export type Point = { x: number; y: number };
export type Edge = { from: string; to: string };
export type ConnectionGraph = {
  positions: Record<string, Point>;
  edges: Edge[];
};

export const CONNECTIONS_STORAGE_KEY = "timba-connections";

const NODE_W = 138;
const NODE_H = 72;
const MARGIN = 250;
const CENTER_X = 1800;
const CENTER_Y = 1300;
const HUB_OFFSETS: Point[] = [
  { x: -620, y: 0 },
  { x: 620, y: 0 },
  { x: 0, y: 520 },
  { x: 0, y: -520 },
  { x: -1120, y: 520 },
  { x: 1120, y: 520 },
  { x: -1120, y: -520 },
  { x: 1120, y: -520 },
  { x: 0, y: 980 },
  { x: 0, y: -980 },
];
const HUB_MIN_OUTGOING = 3;
const MEMBER_COLUMN_CAPACITY = 7;
const MEMBER_COLUMN_GAP = 250;
const MEMBER_ROW_GAP = 110;
const LOOSE_COLUMN_CAPACITY = 8;

const PREFERRED_HUBS = [
  "Básico",
  "Guapeala",
  "Dile que no",
  "Croqueta",
  "Saloneo",
  "Enchufla",
];

function normalizedVector(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 1, y: 0 };
  return { x: dx / length, y: dy / length };
}

function sortByDegreeThenName(
  figures: string[],
  degree: Map<string, number>,
  order: Map<string, number>,
) {
  return figures.sort(
    (a, b) =>
      (degree.get(b) ?? 0) - (degree.get(a) ?? 0) ||
      (order.get(a) ?? 0) - (order.get(b) ?? 0) ||
      a.localeCompare(b),
  );
}

/** Cluster layout: hubs are separated, and their children sit outside each hub. */
function connectionClusterLayout(
  figures: string[],
  edges: Edge[],
): Record<string, Point> {
  const order = new Map(figures.map((figure, index) => [figure, index]));
  const outgoing = new Map(figures.map((figure) => [figure, [] as string[]]));
  const incoming = new Map(figures.map((figure) => [figure, [] as string[]]));
  const degree = new Map(figures.map((figure) => [figure, 0]));

  for (const edge of edges) {
    outgoing.get(edge.from)?.push(edge.to);
    incoming.get(edge.to)?.push(edge.from);
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }

  const positions: Record<string, Point> = {};
  if (figures.length === 0) return positions;

  const preferred = PREFERRED_HUBS.filter(
    (figure) => figures.includes(figure) && (outgoing.get(figure)?.length ?? 0) > 0,
  );
  const discovered = figures.filter(
    (figure) =>
      !preferred.includes(figure) &&
      (outgoing.get(figure)?.length ?? 0) >= HUB_MIN_OUTGOING,
  );
  const hubs = [
    ...preferred,
    ...sortByDegreeThenName(discovered, degree, order),
  ];

  if (hubs.length === 0) {
    const loose = sortByDegreeThenName([...figures], degree, order);
    for (const [index, figure] of loose.entries()) {
      const column = Math.floor(index / LOOSE_COLUMN_CAPACITY);
      const row = index % LOOSE_COLUMN_CAPACITY;
      positions[figure] = {
        x: CENTER_X + column * MEMBER_COLUMN_GAP - NODE_W / 2,
        y: CENTER_Y + row * MEMBER_ROW_GAP - NODE_H / 2,
      };
    }
    return positions;
  }

  for (const [index, hub] of hubs.entries()) {
    const offset =
      HUB_OFFSETS[index] ??
      {
        x: Math.cos((Math.PI * 2 * index) / hubs.length) * 1500,
        y: Math.sin((Math.PI * 2 * index) / hubs.length) * 1000,
      };
    positions[hub] = {
      x: CENTER_X + offset.x - NODE_W / 2,
      y: CENTER_Y + offset.y - NODE_H / 2,
    };
  }

  const hubSet = new Set(hubs);
  const hubRank = new Map(hubs.map((hub, index) => [hub, index]));
  const members = new Map(hubs.map((hub) => [hub, [] as string[]]));
  const loose: string[] = [];

  for (const figure of figures) {
    if (hubSet.has(figure)) continue;
    const parentHubs = (incoming.get(figure) ?? []).filter((from) =>
      hubSet.has(from),
    );
    const childHubs = (outgoing.get(figure) ?? []).filter((to) =>
      hubSet.has(to),
    );
    const candidates = [...parentHubs, ...childHubs];
    const hub = candidates.sort(
      (a, b) =>
        (hubRank.get(a) ?? Infinity) - (hubRank.get(b) ?? Infinity) ||
        (outgoing.get(b)?.length ?? 0) - (outgoing.get(a)?.length ?? 0),
    )[0];

    if (hub) {
      members.get(hub)?.push(figure);
    } else {
      loose.push(figure);
    }
  }

  for (const [hub, group] of members.entries()) {
    const sorted = sortByDegreeThenName(group, degree, order);
    const hubCenter = centerPoint(positions[hub]);
    const outward = normalizedVector({ x: CENTER_X, y: CENTER_Y }, hubCenter);
    const tangent = { x: -outward.y, y: outward.x };

    for (const [index, figure] of sorted.entries()) {
      const column = Math.floor(index / MEMBER_COLUMN_CAPACITY) + 1;
      const row = index % MEMBER_COLUMN_CAPACITY;
      const rows = Math.min(MEMBER_COLUMN_CAPACITY, sorted.length - (column - 1) * MEMBER_COLUMN_CAPACITY);
      const rowOffset = row - (rows - 1) / 2;
      const x =
        hubCenter.x +
        outward.x * MEMBER_COLUMN_GAP * column +
        tangent.x * MEMBER_ROW_GAP * rowOffset;
      const y =
        hubCenter.y +
        outward.y * MEMBER_COLUMN_GAP * column +
        tangent.y * MEMBER_ROW_GAP * rowOffset;

      positions[figure] = {
        x: Math.round(x - NODE_W / 2),
        y: Math.round(y - NODE_H / 2),
      };
    }
  }

  const sortedLoose = sortByDegreeThenName(loose, degree, order);
  const looseStartX = CENTER_X - 760;
  const looseStartY = CENTER_Y + 1360;
  for (const [index, figure] of sortedLoose.entries()) {
    const column = Math.floor(index / LOOSE_COLUMN_CAPACITY);
    const row = index % LOOSE_COLUMN_CAPACITY;
    positions[figure] = {
      x: looseStartX + column * MEMBER_COLUMN_GAP,
      y: looseStartY + row * MEMBER_ROW_GAP,
    };
  }

  return positions;
}

function centerPoint(p: Point): Point {
  return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 };
}

const DEFAULT_POSITIONS: Record<string, Point> = {
  "70": { x: 2761.667737763323, y: 1099.782531361939 },
  "80": { x: 2708.6259469160873, y: 1295.4826658385746 },
  "90": { x: 2916.2593543871735, y: 1381.3247252338501 },
  "Básico": { x: 1000, y: 1240 },
  Guapeala: { x: 2100, y: 1240 },
  "Dile que no": { x: 1464.0562234361337, y: 1315.9054036795096 },
  Croqueta: { x: 1447.0041068215464, y: 1718.8998610609256 },
  "Camina la rueda": { x: 873.4202707906423, y: 1617.3711041460142 },
  "Todos americanos": { x: 1102.694247304506, y: 1471.3072021326518 },
  Saloneo: { x: 930, y: 650 },
  Enchufla: { x: 2299.2827694864877, y: 937.7543462071974 },
  Lazo: { x: 2352.898934500539, y: 763.9009961246068 },
  "Contratiempo": { x: 834.2181651539355, y: 801.8220018011663 },
  Dame: { x: 1644.4587021013813, y: 1128.0828314837186 },
  Americano: { x: 472.63795399838665, y: 787.2144792974182 },
  Exhibela: { x: 1209.5582228086437, y: 1118.2875912060626 },
  "Dile que sí": { x: 1677.140714851123, y: 1236.4305253507027 },
  Salúdate: { x: 810.091763803756, y: 1433.761838064364 },
  Sabrosura: { x: 767.9076395252735, y: 943.6716737667351 },
  Cocacola: { x: 426.83658294778866, y: 1130.1579755752257 },
  Cocacolita: { x: 629.6224525406428, y: 1367.407820330002 },
  Arriba: { x: 471.14078575365124, y: 946.1587388343166 },
  Abajo: { x: 289.6678123672433, y: 1033.6055175922054 },
  Tarro: { x: 320, y: 870 },
  "Pa dentro y pa fuera": { x: 448.3344437717857, y: 1317.6688819396688 },
  "Salúdate y dame": { x: 474.7896995294642, y: 1229.0879351183141 },
  "Dame una arriba": { x: 1578.3120852172997, y: 829.04415636761 },
  "Dame dos": { x: 1629.8125228244735, y: 954.8184093336836 },
  "Dame dos y una afuera": { x: 1440.160842032149, y: 959.8375507899315 },
  Fly: { x: 1779.9128801992674, y: 1371.1200974177639 },
  "Fly doble": { x: 1781.0991731707622, y: 1490.2848972048184 },
  Cero: { x: 1892.8358589378047, y: 992.2282922750185 },
  "Cero la vecina": { x: 2058.2500447799966, y: 943.8197943952085 },
  Directo: { x: 2064.7773095220723, y: 1647.1784548106912 },
  "Directo pasando": { x: 1936.6229407770525, y: 1742.1130394020433 },
  "Enchufla arriba": { x: 2479.2331080977237, y: 834.3301125070006 },
  "Enchufla doble": { x: 2205.2317554615242, y: 867.8838721415988 },
  Patineta: { x: 2720.3850417943863, y: 1395.7554935247301 },
  Manolín: { x: 2885, y: 1290 },
  Cambio: { x: 2960, y: 1470 },
  "Se fue": { x: 3010, y: 1370 },
  "Festival de flies": { x: 1836.397820809544, y: 1601.0298068282475 },
  "70 por abajo": { x: 2795.8419300205387, y: 1195.2480476616279 },
  "70 complicada": { x: 2948.4140233001426, y: 1248.5447131082353 },
  "Tijera simple": { x: 2820.276577820702, y: 1494.7830347846568 },
  Sombrero: { x: 2606.5132316088334, y: 1506.5615667990962 },
  "Sombrero complicado": { x: 2638.1507696721183, y: 1592.6366908281716 },
  "Sombrero doble": { x: 2471.526755631661, y: 1652.7484758342966 },
  "Sombrero por abajo": { x: 2632.5060459041647, y: 1691.6654788287458 },
  "Sombrero por atrás": { x: 2438.054638545729, y: 1763.097713546491 },
  Ocho: { x: 1922.309512795805, y: 866.8834302710012 },
  "Mira la bonita": { x: 2549.011782831139, y: 1082.5379511028498 },
  "Mira la bonita arriba": { x: 2532.783643212743, y: 969.2839483529067 },
  "Mira la bonita sola": { x: 2410.2260092318784, y: 1039.2000014257023 },
  "Directo pareja": { x: 2180.050429928932, y: 1759.7816334401116 },
  Paséala: { x: 1560.3357936949083, y: 1415.897687635437 },
  Trompo: { x: 1289.6237611697943, y: 1914.197781085531 },
  "Trompo por abajo": { x: 1435.1278396472312, y: 1978.5151117169403 },
  "Dos giros": { x: 1601.7191493851506, y: 1934.460849120633 },
  Amistad: { x: 1687.3052545038072, y: 1826.1723578403903 },
  "Saluda la rueda": { x: 1036.858304144902, y: 1775.385696644113 },
  "Ni pa ti ni pa mi": { x: 706.3769183132156, y: 1719.3162665563093 },
  Corazón: { x: 1092.3548848734072, y: 1613.6913130859336 },
  Tarita: { x: 670.8689427611861, y: 553.923739726008 },
  Fantasma: { x: 786.4652560540217, y: 466.51663943354436 },
  "Fantasma al centro": { x: 967.2303755471108, y: 465.09258577248886 },
  Fantasmita: { x: 1093.962201230776, y: 540.4906562222386 },
  "Mujeres dos arriba": { x: 2509.4143097577808, y: 673.8057766928641 },
  "Lazo mujeres dos arriba": { x: 2187.204613210052, y: 691.0155715721439 },
  Americana: { x: 520.7055038244731, y: 681.4824859049746 },
  Foto: { x: 610, y: 2300 },
};

const DEFAULT_EDGES: Edge[] = [
  { from: "Básico", to: "Cocacola" },
  { from: "Básico", to: "Cocacolita" },
  { from: "Básico", to: "Dile que no" },
  { from: "Básico", to: "Exhibela" },
  { from: "Básico", to: "Arriba" },
  { from: "Básico", to: "Abajo" },
  { from: "Básico", to: "Pa dentro y pa fuera" },
  { from: "Arriba", to: "Tarro" },
  { from: "Arriba", to: "Abajo" },
  { from: "Arriba", to: "Enchufla" },
  { from: "Arriba", to: "Dile que no" },
  { from: "Abajo", to: "Dile que no" },
  { from: "Tarro", to: "Abajo" },
  { from: "Tarro", to: "Arriba" },
  { from: "Básico", to: "Sabrosura" },
  { from: "Básico", to: "Saloneo" },
  { from: "Básico", to: "Camina la rueda" },
  { from: "Básico", to: "Salúdate" },
  { from: "Básico", to: "Salúdate y dame" },
  { from: "Básico", to: "Contratiempo" },
  { from: "Dile que sí", to: "Básico" },
  { from: "Dame", to: "Básico" },
  { from: "Camina la rueda", to: "Saluda la rueda" },
  { from: "Camina la rueda", to: "Ni pa ti ni pa mi" },
  { from: "Guapeala", to: "Directo" },
  { from: "Guapeala", to: "Directo pasando" },
  { from: "Guapeala", to: "Enchufla" },
  { from: "Guapeala", to: "Enchufla arriba" },
  { from: "Guapeala", to: "Enchufla doble" },
  { from: "Guapeala", to: "Mira la bonita" },
  { from: "Guapeala", to: "Mira la bonita arriba" },
  { from: "Guapeala", to: "Mira la bonita sola" },
  { from: "Guapeala", to: "70" },
  { from: "Guapeala", to: "80" },
  { from: "Guapeala", to: "90" },
  { from: "Guapeala", to: "70 complicada" },
  { from: "Guapeala", to: "70 por abajo" },
  { from: "Guapeala", to: "Sombrero" },
  { from: "Guapeala", to: "Sombrero doble" },
  { from: "Guapeala", to: "Sombrero complicado" },
  { from: "Guapeala", to: "Sombrero por abajo" },
  { from: "Guapeala", to: "Sombrero por atrás" },
  { from: "Guapeala", to: "Tijera simple" },
  { from: "Guapeala", to: "Fly" },
  { from: "Guapeala", to: "Fly doble" },
  { from: "Guapeala", to: "Festival de flies" },
  { from: "Guapeala", to: "Directo pareja" },
  { from: "Guapeala", to: "Cero" },
  { from: "Guapeala", to: "Cero la vecina" },
  { from: "Guapeala", to: "Ocho" },
  { from: "Guapeala", to: "Dame" },
  { from: "Guapeala", to: "Dame dos" },
  { from: "Guapeala", to: "Dame dos y una afuera" },
  { from: "Guapeala", to: "Dame una arriba" },
  { from: "Guapeala", to: "Patineta" },
  { from: "Guapeala", to: "Manolín" },
  { from: "Patineta", to: "Cambio" },
  { from: "Patineta", to: "Se fue" },
  { from: "Patineta", to: "Dame" },
  { from: "Manolín", to: "Cambio" },
  { from: "Manolín", to: "Se fue" },
  { from: "Manolín", to: "Dame" },
  { from: "Cambio", to: "Patineta" },
  { from: "Cambio", to: "Manolín" },
  { from: "Se fue", to: "Dile que no" },
  { from: "Dile que no", to: "Guapeala" },
  { from: "Dile que no", to: "Paséala" },
  { from: "Todos americanos", to: "Salúdate" },
  { from: "Todos americanos", to: "Corazón" },
  { from: "Todos americanos", to: "Dile que no" },
  { from: "Corazón", to: "Todos americanos" },
  { from: "Sabrosura", to: "Dile que no" },
  { from: "Croqueta", to: "Dile que no" },
  { from: "Croqueta", to: "Exhibela" },
  { from: "Croqueta", to: "Trompo" },
  { from: "Croqueta", to: "Trompo por abajo" },
  { from: "Croqueta", to: "Dos giros" },
  { from: "Croqueta", to: "Amistad" },
  { from: "Enchufla", to: "Lazo" },
  { from: "Lazo", to: "Mujeres dos arriba" },
  { from: "Lazo", to: "Lazo mujeres dos arriba" },
  { from: "Saloneo", to: "Tarita" },
  { from: "Saloneo", to: "Fantasma" },
  { from: "Saloneo", to: "Fantasma al centro" },
  { from: "Saloneo", to: "Fantasmita" },
  { from: "Cero", to: "Cero la vecina" },
  { from: "Dile que no", to: "Dame" },
  { from: "Dile que no", to: "Dame dos y una afuera" },
  { from: "Dile que no", to: "Dame dos" },
  { from: "Dile que no", to: "Dame una arriba" },
  { from: "Contratiempo", to: "Americana" },
  { from: "Contratiempo", to: "Americano" },
  { from: "Contratiempo", to: "Todos americanos" },
  { from: "Contratiempo", to: "Sabrosura" },
  { from: "Guapeala", to: "Dile que sí" },
];

/** Default edges baked from the curated connection map. */
function defaultEdges(): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const { from, to } of DEFAULT_EDGES) {
    const key = `${from}::${to}`;
    if (from === to || seen.has(key)) continue;
    seen.add(key);
    edges.push({ from, to });
  }
  return edges;
}

export function defaultGraph(): ConnectionGraph {
  const edges = defaultEdges();
  const positions = defaultPositionsFor(FIGURES, edges);
  return { positions, edges };
}

function defaultPositionsFor(figures: string[], edges: Edge[]) {
  const positions = connectionClusterLayout(figures, edges);
  for (const figure of figures) {
    if (DEFAULT_POSITIONS[figure]) {
      positions[figure] = DEFAULT_POSITIONS[figure];
    }
  }
  return {
    ...positions,
  };
}

/**
 * Force-directed layout (Fruchterman–Reingold). Connected figures pull
 * together into tight clusters, everything repels so nothing overlaps, and a
 * gentle gravity keeps the whole thing compact and centered. Deterministic:
 * the initial ring is seeded from figure order, no randomness.
 */
function forceLayout(
  figures: string[],
  edges: Edge[],
): Record<string, Point> {
  const n = figures.length;
  if (n === 0) return {};

  const index = new Map(figures.map((figure, i) => [figure, i]));
  const radius = Math.max(360, n * 24);
  const pos = figures.map((_, i) => ({
    x: Math.cos((2 * Math.PI * i) / n) * radius + (i % 2 ? 30 : -30),
    y: Math.sin((2 * Math.PI * i) / n) * radius,
  }));

  const links = edges
    .map((e) => [index.get(e.from), index.get(e.to)] as const)
    .filter(([a, b]) => a !== undefined && b !== undefined) as [
    number,
    number,
  ][];

  const k = 215; // ideal edge length
  const gravity = 0.022;
  const iterations = 520;
  let temp = radius * 0.85;

  for (let step = 0; step < iterations; step++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));

    // repulsion between every pair
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;
        let d = Math.hypot(dx, dy);
        if (d < 0.01) {
          dx = (i - j) * 0.1 + 0.05;
          dy = 0.05;
          d = Math.hypot(dx, dy);
        }
        const force = (k * k) / d;
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        disp[i].x += fx;
        disp[i].y += fy;
        disp[j].x -= fx;
        disp[j].y -= fy;
      }
    }

    // attraction along edges
    for (const [a, b] of links) {
      const dx = pos[a].x - pos[b].x;
      const dy = pos[a].y - pos[b].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const force = (d * d) / k;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      disp[a].x -= fx;
      disp[a].y -= fy;
      disp[b].x += fx;
      disp[b].y += fy;
    }

    // gravity towards the center keeps loose nodes from drifting away
    for (let i = 0; i < n; i++) {
      disp[i].x -= pos[i].x * gravity;
      disp[i].y -= pos[i].y * gravity;
    }

    // move, capped by the cooling temperature
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
      pos[i].x += (disp[i].x / d) * Math.min(d, temp);
      pos[i].y += (disp[i].y / d) * Math.min(d, temp);
    }
    temp = Math.max(temp * 0.985, 4);
  }

  const positions: Record<string, Point> = {};
  figures.forEach((figure, i) => {
    positions[figure] = {
      x: Math.round(pos[i].x - NODE_W / 2),
      y: Math.round(pos[i].y - NODE_H / 2),
    };
  });
  return positions;
}

export function organizeGraph(graph: ConnectionGraph): ConnectionGraph {
  const figures = [
    ...new Set([
      ...Object.keys(graph.positions),
      ...graph.edges.flatMap((edge) => [edge.from, edge.to]),
    ]),
  ];
  return {
    ...graph,
    positions: forceLayout(figures, graph.edges),
  };
}

export const NODE_SIZE = { width: NODE_W, height: NODE_H };

/** Límite de seguridad: ninguna burbuja puede estar más lejos que esto del
 * origen. Evita que una coordenada corrupta haga un canvas gigante (OOM). */
const COORD_LIMIT = 12000;
const MAX_CANVAS = 16000;

export function canvasBounds(positions: Record<string, Point>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;
  for (const p of Object.values(positions)) {
    // ignorar posiciones no finitas o absurdas (localStorage corrupto)
    if (
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      Math.abs(p.x) > COORD_LIMIT ||
      Math.abs(p.y) > COORD_LIMIT
    ) {
      continue;
    }
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 320;
    maxY = 360;
  }
  const pad = 220;
  return {
    width: Math.min(MAX_CANVAS, maxX - minX + pad * 2),
    height: Math.min(MAX_CANVAS, maxY - minY + pad * 2),
    offsetX: pad - minX,
    offsetY: pad - minY,
  };
}

/** Posición válida y dentro de rango, o null si está corrupta. */
function sanitizePoint(p: Point | undefined): Point | null {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  return {
    x: Math.max(-COORD_LIMIT, Math.min(COORD_LIMIT, p.x)),
    y: Math.max(-COORD_LIMIT, Math.min(COORD_LIMIT, p.y)),
  };
}

export function loadGraph(): ConnectionGraph {
  const fallback = defaultGraph();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as ConnectionGraph;
    // built-in figures always present; custom ones come from storage,
    // saneando cada posición (descarta NaN/Infinity/coordenadas absurdas)
    const positions: Record<string, Point> = { ...fallback.positions };
    for (const [figure, point] of Object.entries(parsed.positions ?? {})) {
      const safe = sanitizePoint(point);
      if (safe) positions[figure] = safe;
    }
    const known = new Set(Object.keys(positions));
    const edges = (parsed.edges ?? []).filter(
      (e) => known.has(e.from) && known.has(e.to),
    );
    return { positions, edges };
  } catch {
    return fallback;
  }
}

const BUILT_IN = new Set(FIGURES);

/** Every node in the graph, built-in plus custom, in insertion order. */
export function graphFigures(graph: ConnectionGraph): string[] {
  return Object.keys(graph.positions);
}

export function isCustomFigure(figure: string): boolean {
  return !BUILT_IN.has(figure);
}

/** Add a brand-new bubble. Returns the same graph if the name is empty/dup. */
export function addFigure(
  graph: ConnectionGraph,
  rawName: string,
): ConnectionGraph {
  const name = rawName.trim();
  if (!name || graph.positions[name]) return graph;
  const customCount = graphFigures(graph).filter(isCustomFigure).length;
  const offset = (customCount % 5) * 26;
  return {
    ...graph,
    positions: {
      ...graph.positions,
      [name]: { x: MARGIN + offset, y: MARGIN + offset },
    },
  };
}

/** Remove a bubble and any edges touching it. */
export function removeFigure(
  graph: ConnectionGraph,
  name: string,
): ConnectionGraph {
  const positions = { ...graph.positions };
  delete positions[name];
  return {
    positions,
    edges: graph.edges.filter((e) => e.from !== name && e.to !== name),
  };
}

export function saveGraph(graph: ConnectionGraph) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(graph));
}

/** Outgoing neighbours of a figure. */
export function neighbours(graph: ConnectionGraph, figure: string): string[] {
  return [...new Set(graph.edges.filter((e) => e.from === figure).map((e) => e.to))];
}

/** Incoming neighbours of a figure: where this figure can come from. */
export function incomingNeighbours(
  graph: ConnectionGraph,
  figure: string,
): string[] {
  return [
    ...new Set(graph.edges.filter((e) => e.to === figure).map((e) => e.from)),
  ];
}
