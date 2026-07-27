"use client";

import { useEffect, useRef, useState } from "react";

type Surface = "floor" | "wall" | "mobile";
type IslandShape = "form-a" | "form-b" | "form-c";
type CenterMode = "free" | "relief" | "nest" | "support" | "effect";
type Layer = "floor" | "relief" | "vertical" | "links";
type Readiness = "age6" | "age12" | "age18" | "age24";
type Item = {
  id: string;
  name: string;
  note: string;
  footprint: number;
  color: string;
  surface: Surface;
  shape: string;
  size: [number, number];
};
type ActionGroup = { id: string; label: string; verb: string; mark: string; color: string; items: Item[] };
type CatalogItem = Item & { group: string; mark: string };
type PlacedItem = CatalogItem & { instanceId: string; copy: number };
type PlanPosition = { x: number; y: number };
type PlanEntry = { item: PlacedItem; x: number; y: number; rotation: number; index: number };
type Preset = { items: Record<string, number>; diameter: number; parentDepth: number; shape: IslandShape; center: CenterMode; readiness: Readiness };
type Point = [number, number];
type ShapeOption = {
  id: IslandShape;
  label: string;
  note: string;
  min: number;
  aspect: number;
  areaFactor: number;
  center: Point;
  points: Point[];
};
type RouteStop = { point: Point; label: string; kind?: "start" | "pause" | "action" };
type AgeRoute = {
  title: string;
  instruction: string;
  path: Point[];
  stops: RouteStop[];
  placement?: { point: Point; radius: number };
};
type UndoState = {
  name: string;
  selected: Record<string, number>;
  positions: Record<string, PlanPosition>;
};

const surfaceLabels: Record<Surface, string> = {
  floor: "На полу",
  wall: "На стене",
  mobile: "Перемещаемое",
};

const formAPoints: Point[] = [
  [38.6, 0], [48.1, 1], [56.8, 3.2], [76.6, 9.9], [85.2, 14.4], [91.4, 20], [97, 27.9], [99.3, 33.9],
  [100, 40.6], [99.2, 48.1], [95.5, 60.2], [85.7, 76.3], [78.3, 85.6], [74, 89.6], [62.5, 96.9],
  [54.8, 98.7], [42.8, 100], [35, 99.2], [18.8, 96.1], [11.6, 93.3], [6.8, 89.4], [4.9, 83.4], [5.2, 77.4],
  [12.9, 49.7], [10.2, 41.6], [1.8, 29.4], [0, 24.8], [.5, 19.5], [2.1, 15.1], [8.2, 8.9], [23.7, 2.4],
];

const formBPoints: Point[] = [
  [34.2, 0], [58.8, 2.8], [66.8, 4.8], [77.3, 9.4], [85.9, 16.1], [93.5, 23.6], [98.7, 32.6], [100, 39.4],
  [99.6, 51.4], [97.7, 61], [93.9, 72.9], [90.1, 79.1], [85.1, 83.5], [74.6, 89.9], [75.4, 90.6],
  [72.3, 92.4], [52.5, 98.4], [43.3, 100], [27.5, 98.2], [21.4, 96.6], [14.3, 93.1], [8.6, 87.6],
  [7.8, 83.9], [11.1, 76.6], [25, 63.5], [29.6, 57.3], [31.3, 53], [31.3, 47.5], [29.6, 43.8],
  [24.2, 37.6], [4.4, 24.1], [1.1, 19.7], [0, 16.1], [1.1, 10.6], [8.4, 5], [21, 1.4], [35.7, .7],
];

const formCPoints: Point[] = [
  [52.9, 0], [67.6, 2.3], [78.8, 6.3], [90.6, 13.5], [100, 22.8], [97.3, 55.4], [95.3, 62.4],
  [90.4, 71.9], [81.6, 85.8], [75.7, 92.4], [66.9, 97], [60.9, 98.7], [54.1, 100], [47.5, 98.7],
  [37.1, 94.7], [27.6, 89.1], [16.8, 79.9], [12.5, 74.6], [5.5, 63.4], [2, 55.1], [0, 44.9],
  [.7, 33.7], [3.5, 25.4], [13.8, 13.5], [23.2, 7.6], [32.5, 3.6], [40.3, 1.7],
];

const shapeOptions: ShapeOption[] = [
  { id: "form-a", label: "Контур A", note: "широкий с левым карманом", min: 3.8, aspect: .9903, areaFactor: .7608, center: [54, 50], points: formAPoints },
  { id: "form-b", label: "Контур B", note: "вытянутый с глубокой выемкой", min: 4.6, aspect: .5505, areaFactor: .3898, center: [59, 52], points: formBPoints },
  { id: "form-c", label: "Контур C", note: "компактный округлый", min: 3.8, aspect: 1.1617, areaFactor: .6521, center: [53, 49], points: formCPoints },
];

const placementAnchors: Record<IslandShape, { floor: Point[]; mobile: Point[] }> = {
  "form-a": {
    floor: [[37, 28], [65, 27], [24, 49], [72, 48], [35, 69], [63, 68], [49, 81], [18, 72]],
    mobile: [[44, 43], [61, 53], [45, 63], [62, 37], [55, 73]],
  },
  "form-b": {
    floor: [[48, 15], [70, 27], [53, 40], [68, 54], [47, 68], [66, 77], [43, 87], [82, 67]],
    mobile: [[58, 30], [62, 48], [52, 61], [67, 68], [47, 79]],
  },
  "form-c": {
    floor: [[44, 19], [69, 22], [28, 38], [68, 43], [31, 61], [62, 66], [49, 80], [80, 57]],
    mobile: [[44, 38], [61, 46], [43, 59], [61, 62], [52, 73]],
  },
};

const routes: Record<IslandShape, Record<Readiness, AgeRoute>> = {
  "form-a": {
    age6: {
      title: "Близкий сектор",
      instruction: "Взрослый размещает ребёнка лицом к одному объекту; путь входа здесь принадлежит взрослому.",
      path: [[55, 94], [52, 82], [47, 73]],
      stops: [{ point: [55, 94], label: "родитель", kind: "start" }, { point: [47, 73], label: "поза", kind: "pause" }],
      placement: { point: [47, 73], radius: 13 },
    },
    age12: {
      title: "Короткая петля",
      instruction: "От родителя — по свободному полу к нажатию, затем к опоре и по ясному короткому возврату.",
      path: [[55, 94], [42, 79], [28, 61], [35, 42], [53, 35], [66, 55], [64, 76], [55, 94]],
      stops: [{ point: [55, 94], label: "старт", kind: "start" }, { point: [28, 61], label: "нажать", kind: "action" }, { point: [53, 35], label: "встать", kind: "action" }],
    },
    age18: {
      title: "Два видимых выбора",
      instruction: "Ребёнок видит оба направления: короткое к панели и более длинное через низкий рельеф.",
      path: [[55, 94], [43, 78], [30, 60], [39, 42], [61, 34], [73, 51], [63, 69], [55, 94]],
      stops: [{ point: [55, 94], label: "старт", kind: "start" }, { point: [30, 60], label: "панель", kind: "action" }, { point: [73, 51], label: "рельеф", kind: "action" }],
    },
    age24: {
      title: "Своя последовательность",
      instruction: "Три цели образуют петлю, но любую дугу можно пропустить, повторить или развернуть.",
      path: [[55, 94], [34, 79], [21, 58], [36, 37], [62, 29], [78, 47], [69, 68], [55, 94]],
      stops: [{ point: [55, 94], label: "старт", kind: "start" }, { point: [21, 58], label: "нажать", kind: "action" }, { point: [62, 29], label: "нести", kind: "action" }, { point: [78, 47], label: "искать", kind: "action" }],
    },
  },
  "form-b": {
    age6: {
      title: "Близкий сектор",
      instruction: "Взрослый размещает ребёнка в нижней тихой части; глубокая выемка остаётся вне самостоятельного маршрута.",
      path: [[48, 96], [48, 86], [51, 77]],
      stops: [{ point: [48, 96], label: "родитель", kind: "start" }, { point: [51, 77], label: "поза", kind: "pause" }],
      placement: { point: [51, 77], radius: 12 },
    },
    age12: {
      title: "Вертикальная петля",
      instruction: "Короткий подъём вдоль правой опоры и возврат по тому же читаемому краю.",
      path: [[48, 96], [60, 83], [70, 68], [69, 50], [61, 36], [72, 52], [65, 75], [48, 96]],
      stops: [{ point: [48, 96], label: "старт", kind: "start" }, { point: [70, 68], label: "нажать", kind: "action" }, { point: [61, 36], label: "встать", kind: "action" }],
    },
    age18: {
      title: "Продольный маршрут",
      instruction: "Две цели расположены последовательно, а обратная дуга короче исследовательской.",
      path: [[48, 96], [65, 81], [73, 62], [64, 43], [54, 28], [68, 22], [82, 41], [75, 69], [48, 96]],
      stops: [{ point: [48, 96], label: "старт", kind: "start" }, { point: [73, 62], label: "панель", kind: "action" }, { point: [54, 28], label: "рельеф", kind: "action" }],
    },
    age24: {
      title: "Длинная петля с паузой",
      instruction: "Маршрут использует длину формы, но не заводит ребёнка в тёмный или непроходной тупик выемки.",
      path: [[48, 96], [65, 82], [77, 65], [75, 43], [61, 23], [42, 13], [55, 37], [66, 58], [60, 79], [48, 96]],
      stops: [{ point: [48, 96], label: "старт", kind: "start" }, { point: [77, 65], label: "нажать", kind: "action" }, { point: [61, 23], label: "нести", kind: "action" }, { point: [42, 13], label: "искать", kind: "action" }],
    },
  },
  "form-c": {
    age6: {
      title: "Близкий сектор",
      instruction: "Ребёнок размещён рядом с родителем; один объект находится в пределах поворота и вытягивания руки.",
      path: [[54, 96], [52, 84], [48, 75]],
      stops: [{ point: [54, 96], label: "родитель", kind: "start" }, { point: [48, 75], label: "поза", kind: "pause" }],
      placement: { point: [48, 75], radius: 13 },
    },
    age12: {
      title: "Округлая короткая петля",
      instruction: "Мягкая дуга соединяет свободный пол, нажимную цель и устойчивую опору.",
      path: [[54, 96], [39, 80], [26, 61], [31, 42], [49, 30], [66, 42], [67, 66], [54, 96]],
      stops: [{ point: [54, 96], label: "старт", kind: "start" }, { point: [26, 61], label: "нажать", kind: "action" }, { point: [49, 30], label: "встать", kind: "action" }],
    },
    age18: {
      title: "Две дуги",
      instruction: "Короткая внутренняя дуга ведёт к панели, внешняя — к низкому рельефу и обратно.",
      path: [[54, 96], [35, 78], [23, 55], [36, 34], [61, 27], [78, 43], [68, 67], [54, 96]],
      stops: [{ point: [54, 96], label: "старт", kind: "start" }, { point: [23, 55], label: "панель", kind: "action" }, { point: [78, 43], label: "рельеф", kind: "action" }],
    },
    age24: {
      title: "Круг выбора",
      instruction: "Три действия распределены по дуге; центр остаётся свободным для пересечения и смены решения.",
      path: [[54, 96], [32, 78], [18, 55], [30, 31], [53, 19], [76, 34], [79, 57], [65, 76], [54, 96]],
      stops: [{ point: [54, 96], label: "старт", kind: "start" }, { point: [18, 55], label: "нажать", kind: "action" }, { point: [53, 19], label: "нести", kind: "action" }, { point: [79, 57], label: "искать", kind: "action" }],
    },
  },
};

function pointsToPolygon(points: Point[]) {
  return points.map(([x, y]) => `${x}% ${y}%`).join(", ");
}

function polygonArea(points: Point[]) {
  return Math.abs(points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length];
    return sum + x * nextY - nextX * y;
  }, 0) / 2);
}

function clipPolygonBelow(points: Point[], minY: number) {
  const result: Point[] = [];
  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const currentInside = current[1] >= minY;
    const previousInside = previous[1] >= minY;
    if (currentInside !== previousInside) {
      const ratio = (minY - previous[1]) / (current[1] - previous[1]);
      result.push([previous[0] + (current[0] - previous[0]) * ratio, minY]);
    }
    if (currentInside) result.push(current);
  });
  return result;
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || .00001) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function nearestPointOnPolygon(point: Point, polygon: Point[]) {
  let nearest: Point = polygon[0];
  let shortest = Number.POSITIVE_INFINITY;
  polygon.forEach((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    const vx = end[0] - start[0];
    const vy = end[1] - start[1];
    const lengthSquared = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * vx + (point[1] - start[1]) * vy) / lengthSquared));
    const candidate: Point = [start[0] + vx * t, start[1] + vy * t];
    const distance = Math.hypot(point[0] - candidate[0], point[1] - candidate[1]);
    if (distance < shortest) {
      shortest = distance;
      nearest = candidate;
    }
  });
  return nearest;
}

function constrainInside(point: Point, polygon: Point[], center: Point, radiusX: number, radiusY: number): Point {
  const fits = ([x, y]: Point) => [
    [x, y], [x - radiusX, y], [x + radiusX, y], [x, y - radiusY], [x, y + radiusY],
    [x - radiusX, y - radiusY], [x + radiusX, y - radiusY], [x - radiusX, y + radiusY], [x + radiusX, y + radiusY],
  ].every((sample) => pointInPolygon(sample as Point, polygon));
  if (fits(point)) return point;
  let low = 0;
  let high = 1;
  let best = center;
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2;
    const candidate: Point = [center[0] + (point[0] - center[0]) * middle, center[1] + (point[1] - center[1]) * middle];
    if (fits(candidate)) {
      best = candidate;
      low = middle;
    } else {
      high = middle;
    }
  }
  return best;
}

const centerOptions: Array<{ id: CenterMode; label: string; note: string; min: number; footprint: number; users: number }> = [
  { id: "free", label: "Открытое поле", note: "свободно ползать и разворачиваться", min: 2, footprint: 0, users: 2 },
  { id: "relief", label: "Низкий рельеф", note: "мягкие островки с проходами", min: 3, footprint: 1.05, users: 3 },
  { id: "nest", label: "Тихое гнездо", note: "пауза с обзором взрослого", min: 2.4, footprint: .62, users: 2 },
  { id: "support", label: "Проницаемая опора", note: "вставать, обходить и видеть сквозь", min: 2.6, footprint: .34, users: 3 },
  { id: "effect", label: "Общий результат", note: "несколько входов — один видимый эффект", min: 2.8, footprint: .52, users: 2 },
];

const layerOptions: Array<{ id: Layer; label: string }> = [
  { id: "floor", label: "Пол" },
  { id: "relief", label: "Рельеф" },
  { id: "vertical", label: "Вертикаль" },
  { id: "links", label: "Маршрут" },
];

const readinessOptions: Array<{
  id: Readiness;
  label: string;
  stage: string;
  ageHint: string;
  focus: string;
  actions: string[];
  centers: CenterMode[];
  maxStimuli: number;
}> = [
  {
    id: "age6",
    label: "6 месяцев",
    stage: "взрослый размещает; ребёнок смотрит, тянется и меняет позу",
    ageHint: "сектор досягаемости",
    focus: "Одна близкая цель, мягкий пол и постоянный визуальный возврат к взрослому.",
    actions: ["crawl", "press"],
    centers: ["free", "nest"],
    maxStimuli: 2,
  },
  {
    id: "age12",
    label: "12 месяцев",
    stage: "ползает, садится, подтягивается у устойчивой опоры",
    ageHint: "короткая петля",
    focus: "Доползти до результата, при желании встать и вернуться тем же понятным путём.",
    actions: ["crawl", "press", "stand", "search"],
    centers: ["free", "support", "relief"],
    maxStimuli: 4,
  },
  {
    id: "age18",
    label: "18 месяцев",
    stage: "ходит короткими переходами, приседает и меняет положение крупного объекта",
    ageHint: "выбор и изменение",
    focus: "Два видимых выбора, очень низкий рельеф и прямой возврат к взрослому.",
    actions: ["crawl", "press", "stand", "move", "search", "climb"],
    centers: ["support", "effect", "nest", "relief"],
    maxStimuli: 5,
  },
  {
    id: "age24",
    label: "24 месяца",
    stage: "сам выбирает цель, переносит и связывает два действия",
    ageHint: "собственная петля",
    focus: "Маршрут можно пройти частично, повторить или развернуть без обязательной миссии.",
    actions: ["press", "move", "search", "rotate", "climb", "hide"],
    centers: ["free", "support", "effect", "nest", "relief"],
    maxStimuli: 6,
  },
];

const reliefIds = new Set(["soft-ramp", "air-pad", "podium", "wide-step", "soft-roller", "nest"]);
const quietIds = new Set(["liquid-floor", "mirror", "hidden-textures", "color-windows", "liquid-discs", "nest"]);
const singleOnlyIds = new Set(["texture-path", "soft-ramp", "tunnel", "podium", "support-column", "soft-block", "wide-step", "soft-roller", "nest", "niche", "soft-screen"]);
const tripleIds = new Set(["liquid-floor", "gel-membrane", "sound-pad", "rail", "peek-window", "hidden-textures", "color-windows", "liquid-discs", "peek-holes"]);
const multiUserIds = new Set(["texture-path", "rail", "mirror", "ball-track", "soft-ramp", "nest", "niche"]);

function maxCountFor(item: Item) {
  if (singleOnlyIds.has(item.id)) return 1;
  if (tripleIds.has(item.id)) return 3;
  return 2;
}

function usersFor(item: Item) {
  return multiUserIds.has(item.id) ? 2 : 1;
}

function layerFor(item: Item): Layer {
  if (reliefIds.has(item.id)) return "relief";
  if (item.surface === "wall") return "vertical";
  return "floor";
}

function countsFrom(ids: string[]) {
  return ids.reduce<Record<string, number>>((result, id) => {
    result[id] = (result[id] ?? 0) + 1;
    return result;
  }, {});
}

const groups: ActionGroup[] = [
  { id: "crawl", label: "Ползти", verb: "движение всем телом", mark: "↝", color: "#dd623e", items: [
    { id: "texture-path", name: "Тактильная дорожка", note: "пробка, дерево, резина", footprint: .65, color: "#e87b55", surface: "floor", shape: "path", size: [1.2, .42] },
    { id: "liquid-floor", name: "Герметичная жидкостная плитка", note: "цвет меняется от давления, среда запаяна", footprint: .35, color: "#70aee8", surface: "floor", shape: "liquid-tile", size: [.5, .5] },
    { id: "soft-ramp", name: "Пологий скат", note: "переползти и спуститься", footprint: .75, color: "#edb85b", surface: "floor", shape: "ramp", size: [1.0, .7] },
    { id: "tunnel", name: "Низкий тоннель", note: "видимый насквозь проход", footprint: .9, color: "#7f9972", surface: "floor", shape: "tunnel", size: [1.05, .65] },
  ]},
  { id: "press", label: "Нажимать", verb: "получать мгновенный отклик", mark: "●", color: "#6b8f71", items: [
    { id: "gel-membrane", name: "Гелевая мембрана", note: "мягкое сопротивление", footprint: .35, color: "#9b78b5", surface: "floor", shape: "membrane", size: [.62, .62] },
    { id: "silicone", name: "Силиконовое поле", note: "короткие мягкие ворсинки", footprint: .4, color: "#e78da1", surface: "floor", shape: "silicone", size: [.68, .58] },
    { id: "sound-pad", name: "Тихая звуковая мембрана", note: "звук зависит от силы", footprint: .3, color: "#d68c4a", surface: "wall", shape: "sound-panel", size: [.72, .16] },
    { id: "air-pad", name: "Воздушная подушка", note: "медленно возвращает форму", footprint: .55, color: "#81b9b0", surface: "floor", shape: "air-pad", size: [.82, .62] },
  ]},
  { id: "stand", label: "Вставать", verb: "подтягиваться и держаться", mark: "↑", color: "#bf7b3f", items: [
    { id: "rail", name: "Тактильный поручень", note: "два уровня захвата", footprint: .3, color: "#b47b51", surface: "wall", shape: "rail", size: [1.0, .12] },
    { id: "mirror", name: "Низкое зеркало", note: "безопасный акрил", footprint: .35, color: "#8aa6bd", surface: "wall", shape: "mirror", size: [.65, .14] },
    { id: "podium", name: "Устойчивый подиум", note: "опора и смена уровня", footprint: .7, color: "#dca65c", surface: "floor", shape: "podium", size: [.9, .7] },
    { id: "support-column", name: "Опорный столбик", note: "круговой обход", footprint: .4, color: "#789984", surface: "floor", shape: "column", size: [.38, .38] },
  ]},
  { id: "move", label: "Перемещать", verb: "толкать и вести по маршруту", mark: "↔", color: "#4d7891", items: [
    { id: "ball-track", name: "Закрытый шаровой трек", note: "крупный шар полностью заключён внутри", footprint: .45, color: "#5c8ab4", surface: "wall", shape: "ball-track", size: [1.05, .16] },
    { id: "slider", name: "Большой ползунок", note: "движение по широкой щели", footprint: .3, color: "#d26754", surface: "wall", shape: "slider", size: [.78, .14] },
    { id: "roller", name: "Тактильный барабан", note: "вращается двумя руками", footprint: .45, color: "#d49b46", surface: "wall", shape: "roller", size: [.56, .22] },
    { id: "soft-block", name: "Крупный мягкий блок", note: "толкать и переставлять", footprint: .65, color: "#879e65", surface: "mobile", shape: "block", size: [.62, .52] },
  ]},
  { id: "search", label: "Искать", verb: "находить исчезнувшее", mark: "◌", color: "#87658f", items: [
    { id: "peek-window", name: "Окна-прятки", note: "фактуры за створками", footprint: .35, color: "#a77aac", surface: "wall", shape: "peek-window", size: [.62, .18] },
    { id: "disappear-ball", name: "Исчезающий шар", note: "появляется в другом окне", footprint: .45, color: "#e06a4e", surface: "wall", shape: "disappear-track", size: [.85, .17] },
    { id: "hidden-textures", name: "Тактильные карманы", note: "несъёмные предметы внутри", footprint: .3, color: "#b18d5c", surface: "wall", shape: "pockets", size: [.72, .18] },
    { id: "color-windows", name: "Цветные окошки", note: "смотреть сквозь фильтр", footprint: .25, color: "#6ea6a0", surface: "wall", shape: "color-window", size: [.7, .15] },
  ]},
  { id: "rotate", label: "Вращать", verb: "запускать длительное движение", mark: "↻", color: "#c38a48", items: [
    { id: "liquid-discs", name: "Жидкостные диски", note: "вязкое медленное течение", footprint: .3, color: "#6ca5d5", surface: "wall", shape: "liquid-discs", size: [.58, .16] },
    { id: "safe-gears", name: "Крупные шестерни", note: "без щелей для пальцев", footprint: .35, color: "#e18b4f", surface: "wall", shape: "gears", size: [.66, .18] },
    { id: "noise-cylinder", name: "Шумовой цилиндр", note: "тихий пересыпающийся звук", footprint: .35, color: "#a77b9f", surface: "wall", shape: "cylinder", size: [.52, .2] },
  ]},
  { id: "climb", label: "Залезать", verb: "менять высоту и положение", mark: "⌁", color: "#688367", items: [
    { id: "wide-step", name: "Широкая ступень", note: "один безопасный уровень", footprint: .6, color: "#d29a55", surface: "floor", shape: "step", size: [.85, .65] },
    { id: "soft-roller", name: "Мягкий валик", note: "перелезать и обнимать", footprint: .6, color: "#7e9d73", surface: "mobile", shape: "soft-roller", size: [.82, .42] },
    { id: "nest", name: "Низкое гнездо", note: "углубление для отдыха", footprint: .8, color: "#c88472", surface: "floor", shape: "nest", size: [.95, .78] },
  ]},
  { id: "hide", label: "Прятаться", verb: "исчезать и выглядывать", mark: "⌂", color: "#997052", items: [
    { id: "niche", name: "Открытая ниша", note: "взрослый видит ребёнка", footprint: .8, color: "#9b775c", surface: "wall", shape: "niche", size: [.9, .22] },
    { id: "soft-screen", name: "Мягкая перегородка", note: "полупрозрачная и короткая", footprint: .45, color: "#758f83", surface: "mobile", shape: "screen", size: [1.0, .16] },
    { id: "peek-holes", name: "Смотровые отверстия", note: "на двух уровнях", footprint: .3, color: "#6f8eac", surface: "wall", shape: "peek-holes", size: [.7, .16] },
  ]},
];

const presets: Record<string, Preset> = {
  "6 мес · близкий контакт": { items: countsFrom(["liquid-floor", "silicone", "mirror"]), diameter: 3.8, parentDepth: .9, shape: "form-c", center: "free", readiness: "age6" },
  "12 мес · короткая петля": { items: countsFrom(["liquid-floor", "gel-membrane", "rail", "mirror"]), diameter: 4.2, parentDepth: .9, shape: "form-a", center: "support", readiness: "age12" },
  "18 мес · два выбора": { items: countsFrom(["silicone", "rail", "air-pad", "slider", "color-windows"]), diameter: 4.8, parentDepth: .9, shape: "form-c", center: "relief", readiness: "age18" },
  "24 мес · своя петля": { items: countsFrom(["slider", "soft-block", "peek-window", "liquid-discs", "nest"]), diameter: 5.2, parentDepth: 1, shape: "form-b", center: "free", readiness: "age24" },
};

export default function Home() {
  const initialPreset = presets["12 мес · короткая петля"];
  const [diameter, setDiameter] = useState(initialPreset.diameter);
  const [parentDepth, setParentDepth] = useState(initialPreset.parentDepth);
  const [islandShape, setIslandShape] = useState<IslandShape>(initialPreset.shape);
  const [centerMode, setCenterMode] = useState<CenterMode>(initialPreset.center);
  const [activeGroup, setActiveGroup] = useState("crawl");
  const [selected, setSelected] = useState<Record<string, number>>(initialPreset.items);
  const [preset, setPreset] = useState("12 мес · короткая петля");
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ floor: true, relief: true, vertical: true, links: true });
  const [positions, setPositions] = useState<Record<string, PlanPosition>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness>(initialPreset.readiness);
  const [lastRemoved, setLastRemoved] = useState<UndoState | null>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ item: PlacedItem; x: number; y: number; pointerId: number } | null>(null);
  const movedRef = useRef<string | null>(null);
  const allItems: CatalogItem[] = groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label, mark: group.mark })));
  const instances: PlacedItem[] = allItems.flatMap((item) => Array.from({ length: selected[item.id] ?? 0 }, (_, index) => ({ ...item, copy: index + 1, instanceId: `${item.id}-${index + 1}` })));
  const floorItems = instances.filter((item) => item.surface === "floor");
  const wallItems = instances.filter((item) => item.surface === "wall");
  const mobileItems = instances.filter((item) => item.surface === "mobile");
  const centerOption = centerOptions.find((option) => option.id === centerMode)!;
  const activeShape = shapeOptions.find((option) => option.id === islandShape)!;
  const islandWidth = activeShape.aspect >= 1 ? diameter : diameter * activeShape.aspect;
  const islandHeight = activeShape.aspect >= 1 ? diameter / activeShape.aspect : diameter;
  const area = diameter * diameter * activeShape.areaFactor;
  const parentCutY = Math.max(58, 100 - (parentDepth / islandHeight) * 100);
  const parentPolygon = clipPolygonBelow(activeShape.points, parentCutY);
  const parentShare = parentPolygon.length >= 3 ? polygonArea(parentPolygon) / polygonArea(activeShape.points) : 0;
  const parentArea = area * parentShare;
  const playArea = Math.max(.1, area - parentArea);
  const used = instances.reduce((sum, item) => sum + item.footprint * (item.surface === "wall" ? .18 : 1), centerOption.footprint);
  const freeRatio = Math.max(0, 1 - used / (playArea * .62));
  const status = freeRatio > .35 ? "Свободная сборка" : freeRatio > .12 ? "Плотная сборка" : "Слишком плотно";
  const islandScale = Math.min(1, .8 + ((diameter - 3.2) / 3.6) * .2);
  const selectedActions = groups.filter((group) => group.items.some((item) => (selected[item.id] ?? 0) > 0)).length;
  const active = groups.find((g) => g.id === activeGroup)!;
  const readinessOption = readinessOptions.find((option) => option.id === readiness)!;
  const activeRoute = routes[islandShape][readiness];
  const centerPoint = { x: activeShape.center[0], y: activeShape.center[1] };

  const floorEntries: PlanEntry[] = floorItems.map((item, index) => {
    const anchor = placementAnchors[islandShape].floor[index % placementAnchors[islandShape].floor.length];
    const radiusX = item.size[0] / islandWidth * 52;
    const radiusY = item.size[1] / islandHeight * 52;
    const [x, y] = constrainInside(anchor, activeShape.points, activeShape.center, radiusX, radiusY);
    return { item, x, y, rotation: index % 2 ? -6 : 5, index };
  });

  const mobileEntries: PlanEntry[] = mobileItems.map((item, index) => {
    const anchor = placementAnchors[islandShape].mobile[index % placementAnchors[islandShape].mobile.length];
    const radiusX = item.size[0] / islandWidth * 52;
    const radiusY = item.size[1] / islandHeight * 52;
    const [x, y] = constrainInside(anchor, activeShape.points, activeShape.center, radiusX, radiusY);
    return { item, x, y, rotation: index % 2 ? -12 : 9, index: floorEntries.length + index };
  });

  const wallEntries: PlanEntry[] = wallItems.map((item, index) => {
    const pointIndex = Math.floor((index + .35) * activeShape.points.length / Math.max(1, wallItems.length)) % activeShape.points.length;
    const [x, y] = activeShape.points[pointIndex];
    const previous = activeShape.points[(pointIndex + activeShape.points.length - 1) % activeShape.points.length];
    const next = activeShape.points[(pointIndex + 1) % activeShape.points.length];
    const rotation = Math.atan2(next[1] - previous[1], next[0] - previous[0]) * 180 / Math.PI;
    return { item, x, y, rotation, index: floorEntries.length + mobileEntries.length + index };
  });

  const planEntries = [...floorEntries, ...mobileEntries, ...wallEntries];
  const connectionEntries = planEntries.filter((entry) => ["Нажимать", "Перемещать", "Вращать"].includes(entry.item.group)).slice(0, 4);
  const activeStimuli = instances.filter((item) => !quietIds.has(item.id)).length + (centerMode === "effect" ? 1 : 0);
  const sensoryLabel = activeStimuli <= 3 ? "Спокойная" : activeStimuli <= 6 ? "Сбалансированная" : "Высокая";
  const singleStations = allItems.filter((item) => (selected[item.id] ?? 0) === 1 && maxCountFor(item) > 1 && usersFor(item) === 1);
  const hardGates: string[] = [];
  const conflicts: string[] = [];
  const activeGroupIds = groups.filter((group) => group.items.some((item) => (selected[item.id] ?? 0) > 0)).map((group) => group.id);
  const offStageActions = activeGroupIds.filter((id) => !readinessOption.actions.includes(id));
  const floorLikeEntries = planEntries.filter((entry) => entry.item.surface !== "wall");
  const hasOverlap = floorLikeEntries.some((entry, index) => floorLikeEntries.slice(index + 1).some((other) => {
    const first = positions[entry.item.instanceId] ?? { x: entry.x, y: entry.y };
    const second = positions[other.item.instanceId] ?? { x: other.x, y: other.y };
    const firstRadius = Math.max(entry.item.size[0] / islandWidth, entry.item.size[1] / islandHeight) * 44;
    const secondRadius = Math.max(other.item.size[0] / islandWidth, other.item.size[1] / islandHeight) * 44;
    return Math.hypot(first.x - second.x, first.y - second.y) < (firstRadius + secondRadius) * .72;
  }));
  const parentShoreBlocked = floorLikeEntries.some((entry) => {
    const position = positions[entry.item.instanceId] ?? { x: entry.x, y: entry.y };
    const halfHeight = entry.item.size[1] / islandHeight * 50;
    return position.y + halfHeight > parentCutY;
  });
  const hasQuietPosition = centerMode === "nest" || centerMode === "free" || instances.some((item) => quietIds.has(item.id));
  if (freeRatio <= .12) hardGates.push("Оборудование вытеснило свободное движение и доступ взрослого");
  if (selectedActions > 3) hardGates.push("Для компактного острова выбрано больше трёх семейств действий");
  if (hasOverlap) hardGates.push("На плане пересекаются напольные элементы");
  if (parentShoreBlocked) hardGates.push("Напольный элемент перекрывает коричневую зону родителей");
  if (diameter < activeShape.min) conflicts.push(`Для «${activeShape.label}» рекомендуемый наибольший габарит — от ${activeShape.min.toFixed(1)} м`);
  if (parentDepth < .7) conflicts.push("Глубина зоны родителей меньше рекомендуемой проектной гипотезы 0,7 м");
  if (parentArea < 1.8) conflicts.push("В расчётной зоне родителей мало места для спокойной посадки и быстрого доступа");
  if (instances.length >= 5 && singleStations.length >= 2) conflicts.push(`Возможна очередь: ${singleStations.slice(0, 2).map((item) => item.name.toLowerCase()).join(", ")}`);
  if (activeStimuli > 6) conflicts.push("Слишком много активных стимулов");
  if (activeStimuli > readinessOption.maxStimuli) conflicts.push(`Для этапа «${readinessOption.label}» лучше сократить число активных стимулов`);
  if (offStageActions.length > 2) conflicts.push(`Сборка слабо сфокусирована на готовности «${readinessOption.label}»`);
  if (!readinessOption.centers.includes(centerMode)) conflicts.push(`Центр «${centerOption.label}» не основной для выбранной готовности`);
  if (!hasQuietPosition && activeStimuli > 3) conflicts.push("Нет спокойной точки для паузы и саморегуляции");
  if (diameter < centerOption.min) conflicts.push(`Центру «${centerOption.label}» нужен габарит от ${centerOption.min.toFixed(1)} м`);
  if ((selected["soft-screen"] ?? 0) > 0) conflicts.push("Полупрозрачную перегородку нужно проверить на обзор и быстрый доступ взрослого");
  const allIssues = [...hardGates, ...conflicts];
  const baseCapacity = playArea < 8 ? 3 : playArea < 13 ? 4 : 5;
  const capacityPenalty = (freeRatio < .35 ? 1 : 0) + (hardGates.length ? 1 : 0);
  const capacityUpper = Math.max(2, baseCapacity - capacityPenalty);
  const capacityLower = Math.max(2, capacityUpper - 1);
  const capacityLabel = capacityLower === capacityUpper ? `${capacityUpper}` : `${capacityLower}–${capacityUpper}`;
  const minimumDiameter = 3.2;
  const centerLayer: Layer = centerMode === "relief" || centerMode === "nest" ? "relief" : centerMode === "support" ? "vertical" : centerMode === "effect" ? "links" : "floor";

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const start = dragStartRef.current;
      const island = islandRef.current;
      if (!start || start.pointerId !== event.pointerId || !island) return;

      event.preventDefault();
      const item = start.item;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 3) movedRef.current = item.instanceId;
      const bounds = island.getBoundingClientRect();
      const rawX = ((event.clientX - bounds.left) / bounds.width) * 100;
      const rawY = ((event.clientY - bounds.top) / bounds.height) * 100;

      let x = rawX;
      let y = rawY;
      if (item.surface === "wall") {
        [x, y] = nearestPointOnPolygon([rawX, rawY], activeShape.points);
      } else {
        const radiusX = item.size[0] / islandWidth * 52;
        const radiusY = item.size[1] / islandHeight * 52;
        [x, y] = constrainInside([rawX, rawY], activeShape.points, activeShape.center, radiusX, radiusY);
      }

      setPositions((current) => ({ ...current, [item.instanceId]: { x, y } }));
    }

    function handlePointerEnd(event: PointerEvent) {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== event.pointerId) return;
      dragStartRef.current = null;
      setDragging(null);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [activeShape, islandHeight, islandWidth]);

  function changeCount(id: string, delta: number) {
    const item = allItems.find((candidate) => candidate.id === id);
    if (!item) return;
    const currentCount = selected[id] ?? 0;
    const nextCount = Math.max(0, Math.min(maxCountFor(item), currentCount + delta));
    if (nextCount === currentCount) return;
    setLastRemoved(null);
    setPreset("");
    setSelected((current) => ({ ...current, [id]: nextCount }));
    if (nextCount < currentCount) {
      const removedId = `${id}-${currentCount}`;
      setPositions((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== removedId)));
    }
  }

  function removeInstance(item: PlacedItem) {
    const currentCount = selected[item.id] ?? 0;
    if (currentCount === 0) return;
    setLastRemoved({ name: item.name, selected: { ...selected }, positions: { ...positions } });
    setPreset("");
    setSelected((current) => ({ ...current, [item.id]: Math.max(0, (current[item.id] ?? 0) - 1) }));
    setPositions((current) => {
      const next: Record<string, PlanPosition> = {};
      for (const [key, position] of Object.entries(current)) {
        if (key === item.instanceId) continue;
        if (key.startsWith(`${item.id}-`)) {
          const copy = Number(key.slice(item.id.length + 1));
          next[copy > item.copy ? `${item.id}-${copy - 1}` : key] = position;
        } else {
          next[key] = position;
        }
      }
      return next;
    });
  }

  function choosePreset(name: string) {
    const nextPreset = presets[name];
    setLastRemoved(null);
    setPreset(name);
    setSelected(nextPreset.items);
    setDiameter(nextPreset.diameter);
    setParentDepth(nextPreset.parentDepth);
    setIslandShape(nextPreset.shape);
    setCenterMode(nextPreset.center);
    setReadiness(nextPreset.readiness);
    setPositions({});
  }

  function chooseShape(nextShape: IslandShape) {
    setLastRemoved(null);
    setPreset("");
    setIslandShape(nextShape);
    setPositions({});
  }

  function chooseCenter(nextCenter: CenterMode) {
    setLastRemoved(null);
    setPreset("");
    setCenterMode(nextCenter);
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, item: PlacedItem) {
    event.preventDefault();
    dragStartRef.current = { item, x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    movedRef.current = null;
    setDragging(item.instanceId);
  }

  function renderPlanObject(entry: PlanEntry) {
    const { item, x, y, rotation, index } = entry;
    const objectWidth = `${(item.size[0] / islandWidth) * 100}%`;
    const objectDepth = `${(item.size[1] / islandHeight) * 100}%`;
    const customPosition = positions[item.instanceId];
    const objectX = customPosition?.x ?? x;
    const objectY = customPosition?.y ?? y;
    const objectRotation = item.surface === "wall" && customPosition
      ? Math.atan2(objectY - 50, objectX - 50) * 180 / Math.PI + 90
      : rotation;

    return <button
      title={`${item.name}. Нажмите, чтобы удалить; перетащите, чтобы переместить. ${surfaceLabels[item.surface]}. Габарит ${item.size[0]} × ${item.size[1]} м`}
      aria-label={`${item.name}, экземпляр ${item.copy}. Нажмите, чтобы удалить; перетащите, чтобы переместить`}
      onPointerDown={(event) => startDrag(event, item)}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const step = event.shiftKey ? 4 : 1.5;
        const current = positions[item.instanceId] ?? { x: objectX, y: objectY };
        const requested: Point = [
          current.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
          current.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
        ];
        const [nextX, nextY] = item.surface === "wall"
          ? nearestPointOnPolygon(requested, activeShape.points)
          : constrainInside(
            requested,
            activeShape.points,
            activeShape.center,
            item.size[0] / islandWidth * 52,
            item.size[1] / islandHeight * 52,
          );
        const next = { x: nextX, y: nextY };
        setPositions((value) => ({ ...value, [item.instanceId]: next }));
      }}
      onClick={() => {
        if (movedRef.current === item.instanceId) {
          movedRef.current = null;
          return;
        }
        removeInstance(item);
      }}
      key={item.instanceId}
      className={`plan-object surface-${item.surface} layer-${layerFor(item)} ${layers[layerFor(item)] ? "" : "layer-hidden"} ${dragging === item.instanceId ? "dragging" : ""}`}
      style={{
        left: `${objectX}%`,
        top: `${objectY}%`,
        width: objectWidth,
        height: objectDepth,
        "--item-color": item.color,
        "--object-r": `${objectRotation}deg`,
        "--i": index,
      } as React.CSSProperties}
    >
      <span className={`object-body shape-${item.shape}`} aria-hidden="true">
        <span className="object-symbol">{item.mark}</span>
      </span>
      <small className="object-label">{item.name}{(selected[item.id] ?? 0) > 1 ? ` ${item.copy}` : ""}<span>Нажать — удалить</span></small>
    </button>;
  }

  return (
    <main id="main-content">
      <a className="skip-link" href="#configurator">К конфигуратору</a>

      <header className="topbar">
        <div className="brand">Остров <span>6–24 мес</span></div>
        <p>Конфигуратор среды первых движений</p>
        <button className="reset-button" disabled={instances.length === 0 && centerMode === "free"} onClick={() => { setSelected({}); setCenterMode("free"); setPreset(""); setPositions({}); setLastRemoved(null); }}>
          Очистить сборку
        </button>
      </header>

      <section className="product-intro" aria-labelledby="page-title">
        <h1 id="page-title">Соберите остров первых открытий</h1>
        <p>Не удерживать внимание любой ценой, а создать цикл: войти → попробовать → увидеть результат → сделать паузу → вернуться.</p>
      </section>

      <section className="workspace" id="configurator">
        <aside className="controls panel" aria-label="Параметры острова">
          <section className="age-control">
            <div className="section-title"><h2>Возраст и маршрут</h2><span>{readinessOption.ageHint}</span></div>
            <div className="age-list" role="group" aria-label="Возраст и маршрут ребёнка">
              {readinessOptions.map((option) => <button
                key={option.id}
                aria-pressed={readiness === option.id}
                className={readiness === option.id ? "active" : ""}
                onClick={() => { setReadiness(option.id); setLastRemoved(null); setPreset(""); }}
              >{option.label}</button>)}
            </div>
            <strong className="readiness-stage">{readinessOption.stage}</strong>
            <p className="age-focus">{readinessOption.focus}</p>
          </section>

          <section className="diameter-control">
            <div className="section-title">
              <h2>Наибольший габарит</h2>
              <output htmlFor="diameter-range"><strong>{diameter.toFixed(1)}</strong> м</output>
            </div>
            <input id="diameter-range" aria-label="Наибольший габарит острова в метрах" type="range" min={minimumDiameter} max="6.8" step="0.1" value={diameter} onChange={(e) => { setPreset(""); setDiameter(Number(e.target.value)); setPositions({}); }} />
            <div className="range-labels" aria-hidden="true"><span>{minimumDiameter.toFixed(1)} м</span><span>5 м</span><span>6,8 м</span></div>
            <p className="dimension-note">{islandWidth.toFixed(1)} × {islandHeight.toFixed(1)} м · площадь {area.toFixed(1)} м²</p>
          </section>

          <section className="parent-control">
            <div className="section-title">
              <h2>Место родителей</h2>
              <output htmlFor="parent-range"><strong>{parentDepth.toFixed(1)}</strong> м</output>
            </div>
            <input id="parent-range" aria-label="Глубина зоны родителей в метрах" type="range" min=".6" max="1.2" step=".1" value={parentDepth} onChange={(e) => { setPreset(""); setParentDepth(Number(e.target.value)); }} />
            <div className="range-labels" aria-hidden="true"><span>0,6 м</span><span>0,9 м</span><span>1,2 м</span></div>
            <p className="dimension-note">Коричневая зона ≈ {parentArea.toFixed(1)} м² внутри контура</p>
          </section>

          <section className="geometry-section">
            <div className="section-title"><h2>Форма</h2><span>{shapeOptions.find((option) => option.id === islandShape)!.label}</span></div>
            <div className="shape-list">
              {shapeOptions.map((option) => <button key={option.id} className={islandShape === option.id ? "active" : ""} aria-pressed={islandShape === option.id} onClick={() => chooseShape(option.id)}>
                <i className="shape-icon" style={{ clipPath: `polygon(${pointsToPolygon(option.points)})`, aspectRatio: `${option.aspect}` }} aria-hidden="true" /><span><strong>{option.label}</strong><small>{option.note}</small></span>
              </button>)}
            </div>
          </section>

          <section className="center-section">
            <div className="section-title"><h2>Центр</h2><span>1 вариант</span></div>
            <div className="center-list">
              {centerOptions.map((option) => <button key={option.id} className={centerMode === option.id ? "active" : ""} aria-pressed={centerMode === option.id} onClick={() => chooseCenter(option.id)}>
                <span>{option.label}</span><small>{option.min > diameter ? `от ${option.min.toFixed(1)} м` : option.note}</small>
              </button>)}
            </div>
          </section>

          <section className="actions-section">
            <div className="section-title">
              <h2>Действия</h2>
              <span>{selectedActions} из {groups.length}</span>
            </div>
            <div className="action-list">
              {groups.map((group) => {
                const count = group.items.reduce((sum, item) => sum + (selected[item.id] ?? 0), 0);
                const current = activeGroup === group.id;
                return <button key={group.id} aria-pressed={current} className={`action-button ${current ? "active" : ""}`} onClick={() => setActiveGroup(group.id)}>
                  <span>{group.label}</span><span className="action-meta">{count || ""}</span>
                </button>;
              })}
            </div>
          </section>
        </aside>

        <section className="canvas panel" aria-label="План острова">
          <div className="canvas-head">
            <div><h2>План острова</h2><p>{activeShape.label} · {islandWidth.toFixed(1)} × {islandHeight.toFixed(1)} м · {area.toFixed(1)} м²</p></div>
            <div className="canvas-head-meta">
              <span className={`status ${hardGates.length ? "critical" : allIssues.length ? "warn" : ""}`}>{hardGates.length ? `${hardGates.length} критич.` : allIssues.length ? `${allIssues.length} замеч.` : status}</span>
              <div className="plan-legend" aria-label="Тип размещения">
                <span className="legend-floor"><i />Пол</span>
                <span className="legend-wall"><i />Стена</span>
                <span className="legend-mobile"><i />Перемещаемое</span>
              </div>
            </div>
          </div>
          <div className="capacity-strip" aria-label="Модель использования">
            <span><small>Проектная группа*</small><strong>4–5 детей</strong></span>
            <span><small>Одновременно внутри*</small><strong>{capacityLabel}</strong></span>
            <span><small>Основной этап</small><strong>{readinessOption.label}</strong></span>
          </div>

          <div className="layer-toolbar" aria-label="Слои плана">
            <span>Показать:</span>
            {layerOptions.map((layer) => <button key={layer.id} aria-pressed={layers[layer.id]} className={layers[layer.id] ? "active" : ""} onClick={() => setLayers((current) => ({ ...current, [layer.id]: !current[layer.id] }))}>{layer.label}</button>)}
          </div>
          <div className="route-summary" aria-live="polite">
            <span>{readinessOption.label}</span>
            <div><strong>{activeRoute.title}</strong><p>{activeRoute.instruction}</p></div>
          </div>
          <p className="interaction-help" id="interaction-help">Перетащите объект, чтобы переместить. Нажмите, чтобы удалить. Стрелки клавиатуры двигают объект точно.</p>

          <div className="island-wrap">
            <div className="measure measure-top">{islandWidth.toFixed(1)} м</div>
            <div className="measure measure-side">{islandHeight.toFixed(1)} м</div>
            <div className="island-stage">
              <div
                className="island"
                ref={islandRef}
                style={{
                  "--island-scale": islandScale,
                  "--island-width": `${activeShape.aspect >= 1 ? 100 : activeShape.aspect * 100}%`,
                  "--island-height": `${activeShape.aspect >= 1 ? 100 / activeShape.aspect : 100}%`,
                  "--shape-polygon": `polygon(${pointsToPolygon(activeShape.points)})`,
                } as React.CSSProperties}
              >
                <div className="island-surface" aria-hidden="true" />
                <div className="island-grid" aria-hidden="true" />
                <svg className={`route-overlay ${layers.links ? "" : "layer-hidden"}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Маршрут: ${activeRoute.title}`}>
                  <defs>
                    <clipPath id={`shape-clip-${islandShape}`}>
                      <polygon points={activeShape.points.map((point) => point.join(",")).join(" ")} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#shape-clip-${islandShape})`}>
                    <rect className="parent-shore" x="0" y={parentCutY} width="100" height={100 - parentCutY} />
                    {activeRoute.placement && <circle className="reach-sector" cx={activeRoute.placement.point[0]} cy={activeRoute.placement.point[1]} r={activeRoute.placement.radius} />}
                    <polyline className={`route-line route-${readiness}`} points={activeRoute.path.map((point) => point.join(",")).join(" ")} />
                  </g>
                  <polygon className="perimeter-line" points={activeShape.points.map((point) => point.join(",")).join(" ")} />
                  {activeRoute.stops.map((stop, index) => <g className={`route-stop stop-${stop.kind ?? "action"}`} key={`${stop.label}-${index}`} transform={`translate(${stop.point[0]} ${stop.point[1]})`}>
                    <circle r={stop.kind === "start" ? 2.25 : 1.8} />
                    <text x="2.8" y="-2.2">{stop.label}</text>
                  </g>)}
                  <text className="parent-label" x={activeRoute.path[0][0]} y="98">родители</text>
                </svg>
                {centerMode === "effect" && layers.links && connectionEntries.map((entry) => {
                  const position = positions[entry.item.instanceId] ?? { x: entry.x, y: entry.y };
                  const dx = position.x - centerPoint.x;
                  const dy = position.y - centerPoint.y;
                  return <span key={`link-${entry.item.instanceId}`} className="effect-link" style={{ left: `${centerPoint.x}%`, top: `${centerPoint.y}%`, width: `${Math.hypot(dx, dy)}%`, transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)` } as React.CSSProperties} />;
                })}
                <div className={`center-module center-${centerMode} ${layers[centerLayer] ? "" : "layer-hidden"}`} style={{ left: `${centerPoint.x}%` }}>
                  <span className="center-visual" aria-hidden="true"><i /><i /><i /></span>
                  <strong>{centerOption.label}</strong><small>{centerOption.note}</small>
                </div>
                {instances.length === 0 && centerMode === "free" && <div className="empty-state"><strong>Начните с действия</strong><span>Добавьте элемент справа или выберите готовую сборку</span></div>}
                {planEntries.map((entry) => renderPlanObject(entry))}
              </div>
            </div>
          </div>

          <div className="canvas-foot" aria-live="polite">
            <div><span>Игровые точки</span><strong>{instances.length + 1}</strong></div>
            <div><span>Одновременно внутри*</span><strong>{capacityLabel}</strong></div>
            <div><span>Зона родителей*</span><strong>≈ {parentArea.toFixed(1)} м²</strong></div>
            <div><span>Свободная площадь*</span><strong>{Math.round(freeRatio * 100)}%</strong></div>
            <div><span>Стимульность*</span><strong>{sensoryLabel}</strong></div>
          </div>
        </section>

        <aside className="catalog panel" aria-label={`Элементы действия ${active.label}`}>
          <div className="catalog-head"><h2>{active.label}</h2><p>{active.verb}</p></div>
          <div className="item-list">
            {active.items.map((item) => {
              const count = selected[item.id] ?? 0;
              const maxCount = maxCountFor(item);
              return <article key={item.id} className={`item-card ${count ? "selected" : ""}`}>
                <span className={`swatch surface-${item.surface}`} style={{ "--item-color": item.color } as React.CSSProperties} aria-hidden="true">
                  <span className={`mini-object shape-${item.shape}`} />
                  <b>{count || "+"}</b>
                </span>
                <span className="item-copy"><strong>{item.name}</strong><small>{item.note}</small><em className={`surface-label surface-label-${item.surface}`}>{surfaceLabels[item.surface]} · {usersFor(item)} {usersFor(item) === 1 ? "ребёнок" : "ребёнка"}</em></span>
                <span className="quantity-control" aria-label={`Количество: ${item.name}`}>
                  <button disabled={count === 0} onClick={() => changeCount(item.id, -1)} aria-label={`Уменьшить количество: ${item.name}`}>−</button>
                  <output>{count}</output>
                  <button disabled={count >= maxCount} onClick={() => changeCount(item.id, 1)} aria-label={`Добавить: ${item.name}`}>+</button>
                </span>
              </article>;
            })}
          </div>
          <div className={`rule ${hardGates.length ? "rule-critical" : conflicts.length ? "rule-warning" : ""}`}>
            <strong>{hardGates.length ? "Сначала исправьте" : conflicts.length ? "Что стоит улучшить" : "Концепция собрана связно"}</strong>
            {allIssues.length ? <ul>{allIssues.map((message) => <li key={message}>{message}</li>)}</ul> : <p>Свободное движение остаётся главным, а активные и спокойные стимулы не конкурируют.</p>}
            {singleStations.length > 0 && instances.length >= 4 && <button className="rule-action" onClick={() => changeCount(singleStations[0].id, 1)}>Добавить второй: {singleStations[0].name.toLowerCase()}</button>}
          </div>
          <section className="review-panel" aria-labelledby="review-title">
            <h3 id="review-title">Проверка проекта</h3>
            <div className="review-grid">
              <article>
                <span>Педагог</span>
                <strong>{offStageActions.length <= 2 ? "Фокус понятен" : "Слишком много разных задач"}</strong>
                <p>{readinessOption.stage}. {readinessOption.focus}</p>
              </article>
              <article>
                <span>Архитектор</span>
                <strong>{hasOverlap || parentShoreBlocked || freeRatio <= .12 ? "Нужно развести потоки" : "Маршрут читается"}</strong>
                <p>Проверьте вход, обзор взрослого, реальные зазоры, высоты креплений и доступ для уборки.</p>
              </article>
              <article>
                <span>Родитель</span>
                <strong>{hasQuietPosition && activeStimuli <= readinessOption.maxStimuli ? "Есть выбор и пауза" : "Нужна тихая пауза"}</strong>
                <p>Ребёнок должен оставаться видимым и достижимым с любой точки острова.</p>
              </article>
            </div>
          </section>
        </aside>
      </section>

      <section className="presets" aria-labelledby="presets-title">
        <div><h2 id="presets-title">Связные сборки</h2><p>Каждая сохраняет один основной двигательный этап, свободный пол и не более трёх семейств действий.</p></div>
        <div className="preset-row">{Object.entries(presets).map(([name, config]) => <button key={name} onClick={() => choosePreset(name)} aria-pressed={preset === name} className={preset === name ? "active" : ""}>
          <strong>{name}</strong><span>{readinessOptions.find((option) => option.id === config.readiness)!.label} · {centerOptions.find((option) => option.id === config.center)!.label}</span>
        </button>)}</div>
      </section>

      <section className="observation-plan" aria-labelledby="observation-title">
        <div>
          <span className="eyebrow">Проверка идеи вживую</span>
          <h2 id="observation-title">Измеряйте возвращение, а не «удержание внимания»</h2>
          <p>Один тест не даёт универсального времени. Сравните минимум две сборки в свободной игре и фиксируйте контекст каждого наблюдения.</p>
        </div>
        <ol>
          <li><strong>Вошёл сам</strong><span>без приглашения взрослого</span></li>
          <li><strong>Сделал действие</strong><span>без физической помощи</span></li>
          <li><strong>Сменил маршрут</strong><span>пол → опора → другой элемент</span></li>
          <li><strong>Вернулся</strong><span>после выхода или тихой паузы</span></li>
          <li><strong>Не конфликтовал</strong><span>ожидание, вытеснение и столкновения</span></li>
        </ol>
      </section>

      <footer className="site-foot"><p>* Одновременная вместимость, площадь зоны родителей, свободная площадь и стимульность — проектные гипотезы, а не нормативный расчёт. Возраст обозначает типичный сценарий, но фактическая двигательная готовность ребёнка важнее календаря. Для реализации отдельно проверяются помещение, обзор и доступ взрослого, реальные зазоры, высоты, крепления, материалы, пожарные пути и местные требования.</p></footer>
      {lastRemoved && <div className="undo-toast" role="status">
        <span>Удалено: {lastRemoved.name}</span>
        <button onClick={() => {
          setSelected(lastRemoved.selected);
          setPositions(lastRemoved.positions);
          setLastRemoved(null);
        }}>Вернуть</button>
        <button className="undo-close" aria-label="Закрыть сообщение" onClick={() => setLastRemoved(null)}>×</button>
      </div>}
    </main>
  );
}
