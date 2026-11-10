import type { Project } from "@/content/projects";
import { site } from "@/content/site";
import {
  COLORS,
  HEIGHT,
  SPRITE_COLORS,
  WALK_A,
  WALK_B,
  WIDTH,
  charWidth,
  glyph,
  textWidth,
} from "./art";

type Ctx = CanvasRenderingContext2D;

const SIDEWALK_Y = 104;
const ROAD_Y = 118;
const FEET_Y = 114;
const SPRITE_W = 8;
const SPRITE_H = 12;

const WALK_SPEED = 1.25; // pixels per tick
export const WALK_FRAME_TICKS = 8; // technique 4: slower beat than the 60 fps camera
const NEAR_DOOR = 18; // how close you must be to go inside
const SHUTTER_RANGE = 48; // how close you must be for shutters to roll up
const SHUTTER_SPEED = 1 / 24; // fraction per tick

const FIRST_STORE_X = 168; // leaves room for the name drawn at 2x
const STORE_GAP = 44;
const END_MARGIN = 44;
const MIN_STORE_W = 72;

const GROUND_FLOOR_H = 26;
const AWNING_H = 6;
const SIGN_H = 11;
const DOOR_W = 12;

// Technique 6: layers scroll at different speeds to create depth.
export const SKYLINE_SPEED = 0.4;
export const LAMP_SPEED = 1.2;
const LAMP_SPACING = 152;

const STARS = [
  [14, 12],
  [46, 24],
  [79, 9],
  [112, 30],
  [143, 14],
  [176, 26],
  [201, 8],
  [238, 34],
];

const SKYLINE = [
  [18, 30],
  [14, 44],
  [22, 26],
  [12, 38],
  [20, 34],
  [16, 48],
  [24, 28],
];
const SKYLINE_W = SKYLINE.reduce((sum, [w]) => sum + w, 0);

export type Store = {
  project: Project;
  x: number;
  width: number;
  doorX: number;
};

export type World = { stores: Store[]; width: number };

export type WalkState = {
  x: number;
  facing: 1 | -1;
  walkFrame: 0 | 1;
  ticks: number;
  shutters: number[]; // 0 is closed, 1 is rolled all the way up
};

export function createWorld(projects: Project[]): World {
  let x = FIRST_STORE_X;
  const stores = projects.map((project) => {
    const needed = Math.max(MIN_STORE_W, textWidth(project.sign) + 16);
    const width = needed + (needed % 2);
    const store = { project, x, width, doorX: x + width / 2 };
    x += width + STORE_GAP;
    return store;
  });
  return { stores, width: Math.max(WIDTH, x - STORE_GAP + END_MARGIN) };
}

export function createWalkState(world: World): WalkState {
  return {
    x: 44,
    facing: 1,
    walkFrame: 1,
    ticks: 0,
    shutters: world.stores.map(() => 0),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mod(value: number, by: number) {
  return ((value % by) + by) % by;
}

function isOpen(store: Store) {
  return store.project.status === "open";
}

/** Advances one game tick. Returns the store you can walk into, if any. */
export function update(
  world: World,
  state: WalkState,
  direction: number,
  reducedMotion: boolean,
): Store | null {
  state.ticks += 1;

  if (direction !== 0) {
    state.facing = direction > 0 ? 1 : -1;
    state.x += direction * WALK_SPEED;
    if (state.ticks % WALK_FRAME_TICKS === 0) {
      state.walkFrame = state.walkFrame === 0 ? 1 : 0;
    }
  } else {
    state.walkFrame = 1;
  }
  state.x = clamp(state.x, 2, world.width - SPRITE_W - 2);

  const center = state.x + SPRITE_W / 2;
  let near: Store | null = null;

  world.stores.forEach((store, index) => {
    const distance = Math.abs(center - store.doorX);
    if (isOpen(store) && distance <= NEAR_DOOR) near = store;

    const target = distance <= SHUTTER_RANGE ? 1 : 0;
    const current = state.shutters[index];
    state.shutters[index] = reducedMotion
      ? target
      : clamp(
          current + Math.sign(target - current) * SHUTTER_SPEED,
          Math.min(current, target),
          Math.max(current, target),
        );
  });

  return near;
}

// Technique 3: every position that reaches the canvas is a whole number.
function rect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 1,
) {
  let cursor = 0;
  text.split("").forEach((char) => {
    const letter = glyph(char);
    letter?.rows.forEach((bits, row) => {
      for (let col = 0; col < letter.width; col += 1) {
        if (bits & (1 << (letter.width - 1 - col))) {
          rect(ctx, color, x + (cursor + col) * size, y + row * size, size, size);
        }
      }
    });
    cursor += charWidth(char) + 1;
  });
}

function drawSprite(ctx: Ctx, rows: string[], x: number, y: number, flip: boolean) {
  rows.forEach((row, rowIndex) => {
    row.split("").forEach((letter, col) => {
      if (letter === ".") return;
      const drawCol = flip ? SPRITE_W - 1 - col : col;
      rect(ctx, SPRITE_COLORS[letter], x + drawCol, y + rowIndex, 1, 1);
    });
  });
}

// Technique 6: texture from two existing colors instead of a new shade.
function dither(ctx: Ctx, color: string, x: number, y: number, w: number, h: number) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      if (((px + py) & 1) === 0) rect(ctx, color, px, py, 1, 1);
    }
  }
}

// Each star blinks off for a few ticks out of every cycle, each on its own offset.
const TWINKLE_CYCLE = 120;
const TWINKLE_OFF = 8;

function drawSky(ctx: Ctx, ticks: number, reducedMotion: boolean) {
  rect(ctx, COLORS.night, 0, 0, WIDTH, HEIGHT);
  STARS.forEach(([x, y], index) => {
    const blinking =
      !reducedMotion && (ticks + index * 37) % TWINKLE_CYCLE < TWINKLE_OFF;
    if (!blinking) rect(ctx, COLORS.sub, x, y, 1, 1);
  });

  const radius = 8;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const half = Math.round(Math.sqrt(radius * radius - dy * dy));
    rect(ctx, COLORS.amber, 222 - half, 20 + dy, half * 2, 1);
  }
}

function drawSkyline(ctx: Ctx, scroll: number) {
  let x = -mod(scroll, SKYLINE_W);
  while (x < WIDTH) {
    SKYLINE.forEach(([w, h], building) => {
      const top = SIDEWALK_Y - h;
      rect(ctx, COLORS.street, x, top, w, h);
      for (let wy = top + 4; wy < SIDEWALK_Y - 4; wy += 5) {
        for (let wx = 3; wx < w - 2; wx += 4) {
          if ((building * 7 + wx * 3 + wy * 5) % 4 === 0) {
            rect(ctx, COLORS.amber, x + wx, wy, 1, 1);
          }
        }
      }
      x += w;
    });
  }
}

function drawGround(ctx: Ctx, cam: number) {
  rect(ctx, COLORS.edge, 0, SIDEWALK_Y, WIDTH, ROAD_Y - SIDEWALK_Y);
  for (let x = -mod(cam, 16); x < WIDTH; x += 16) {
    rect(ctx, COLORS.street, x, SIDEWALK_Y, 1, ROAD_Y - SIDEWALK_Y);
  }
  rect(ctx, COLORS.sub, 0, ROAD_Y - 1, WIDTH, 1);
  rect(ctx, COLORS.street, 0, ROAD_Y, WIDTH, HEIGHT - ROAD_Y);
  for (let x = -mod(cam, 20); x < WIDTH; x += 20) {
    rect(ctx, COLORS.amber, x, 131, 10, 1);
  }
}

function drawTitle(ctx: Ctx, cam: number) {
  const x = 16 - cam;
  if (x + textWidth(site.name) * 2 < 0) return;
  drawText(ctx, site.name, x, 26, COLORS.paper, 2);
  drawText(ctx, "Little Saigon", x, 42, COLORS.teal);
  drawText(ctx, "Walk >", x, 50, COLORS.amber);
}

function drawLitWindow(ctx: Ctx, x: number, y: number, w: number, h: number) {
  rect(ctx, COLORS.sign, x, y, w, h);
  const lit = Math.ceil(h / 2);
  rect(ctx, COLORS.amber, x, y, w, lit);
  dither(ctx, COLORS.amber, x, y + lit, w, h - lit);
}

function drawSignBoard(ctx: Ctx, store: Store, sx: number, y: number) {
  const { sign, palette } = store.project;
  rect(ctx, COLORS.edge, sx + 4, y, store.width - 8, SIGN_H);
  rect(ctx, COLORS.sign, sx + 5, y + 1, store.width - 10, SIGN_H - 2);
  drawText(
    ctx,
    sign,
    sx + Math.floor((store.width - textWidth(sign)) / 2),
    y + 3,
    palette.neon,
  );
}

function drawUpperFloor(ctx: Ctx, store: Store, sx: number, top: number, signY: number) {
  const { width, project } = store;
  const { building, palette } = project;

  for (let y = top + 4, row = 0; y < signY; y += 4, row += 1) {
    for (let x = row % 2 === 0 ? 2 : 6; x < width - 3; x += 8) {
      rect(ctx, COLORS.edge, sx + x, y, 3, 1);
    }
  }

  if (building === "kitchen") {
    drawLitWindow(ctx, sx + 14, top + 10, 12, 14);
    drawLitWindow(ctx, sx + width - 26, top + 10, 12, 14);

    // A sagging string of lanterns across the front.
    for (let x = 4; x < width - 4; x += 1) {
      const t = (x - width / 2) / (width / 2 - 4);
      const sag = Math.round((1 - t * t) * 4);
      rect(ctx, COLORS.sub, sx + x, top + 3 + sag, 1, 1);
      if (x % 12 === 6) rect(ctx, palette.neon, sx + x - 1, top + 4 + sag, 3, 3);
    }
  } else {
    const gap = Math.floor((width - 30) / 4);
    for (let i = 0; i < 3; i += 1) {
      drawLitWindow(ctx, sx + gap + i * (10 + gap), top + 4, 10, 9);
    }
  }
}

function drawOpenStore(ctx: Ctx, store: Store, sx: number, shutter: number) {
  const { width, project } = store;
  const { building, palette } = project;

  const height = building === "kitchen" ? 72 : 60;
  const top = SIDEWALK_Y - height;
  const groundY = SIDEWALK_Y - GROUND_FLOOR_H;
  const awningY = groundY - AWNING_H;
  const signY = awningY - SIGN_H;

  rect(ctx, palette.brick, sx, top, width, height);
  rect(ctx, COLORS.edge, sx, top, width, 2);
  drawUpperFloor(ctx, store, sx, top, signY);
  drawSignBoard(ctx, store, sx, signY);

  // Awning: stripes with a scalloped bottom edge.
  for (let x = 0; x < width; x += 1) {
    const stripe = Math.floor(x / 4) % 2 === 0 ? palette.awning : COLORS.paper;
    const scallop = x % 4 === 0 ? 0 : 1;
    rect(ctx, stripe, sx + x, awningY, 1, AWNING_H - 1 + scallop);
  }

  // Ground floor: door in the middle, a lit window on each side.
  const doorLeft = sx + width / 2 - DOOR_W / 2;
  const windowY = groundY + 3;
  const windowH = GROUND_FLOOR_H - 3;
  const windowW = doorLeft - sx - 6;
  drawLitWindow(ctx, sx + 3, windowY, windowW, windowH);
  drawLitWindow(ctx, doorLeft + DOOR_W + 3, windowY, windowW, windowH);

  rect(ctx, COLORS.edge, doorLeft, groundY + 1, DOOR_W, GROUND_FLOOR_H - 1);
  rect(ctx, COLORS.sign, doorLeft + 1, groundY + 2, DOOR_W - 2, GROUND_FLOOR_H - 2);
  rect(ctx, COLORS.amber, doorLeft + DOOR_W - 3, groundY + 14, 1, 2);

  // Shutter: its bottom edge rises as you approach.
  const rows = Math.round((1 - shutter) * GROUND_FLOOR_H);
  for (let row = 0; row < rows; row += 1) {
    const slat = row % 2 === 0 ? COLORS.edge : COLORS.street;
    rect(ctx, slat, sx + 2, groundY + row, width - 4, 1);
  }
}

function drawConstructionLot(ctx: Ctx, store: Store, sx: number) {
  const { width, project } = store;
  const { sign, palette } = project;
  const fenceY = SIDEWALK_Y - 18;

  // Crane
  const towerX = sx + 18;
  rect(ctx, COLORS.sub, towerX, 34, 1, fenceY - 34);
  rect(ctx, COLORS.sub, towerX + 5, 34, 1, fenceY - 34);
  for (let y = 36; y < fenceY; y += 6) {
    for (let step = 0; step < 4; step += 1) {
      const px = Math.floor((y - 36) / 6) % 2 === 0 ? 1 + step : 4 - step;
      rect(ctx, COLORS.sub, towerX + px, y + step, 1, 1);
    }
  }
  rect(ctx, COLORS.sub, sx + 6, 34, width - 12, 2);
  const hookX = sx + width - 18;
  rect(ctx, COLORS.sub, hookX, 36, 1, 22);
  rect(ctx, palette.neon, hookX - 4, 58, 9, 5);

  // Fence with hazard stripes
  rect(ctx, palette.brick, sx, fenceY, width, 18);
  rect(ctx, COLORS.edge, sx, fenceY, width, 1);
  for (let y = fenceY + 1; y < SIDEWALK_Y; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mod(x + y, 12) < 3) rect(ctx, palette.neon, sx + x, y, 1, 1);
    }
  }

  const boardW = textWidth(sign) + 8;
  const boardX = sx + Math.floor((width - boardW) / 2);
  rect(ctx, COLORS.edge, boardX, fenceY + 3, boardW, SIGN_H);
  rect(ctx, COLORS.sign, boardX + 1, fenceY + 4, boardW - 2, SIGN_H - 2);
  drawText(ctx, sign, boardX + 4, fenceY + 6, palette.neon);
}

function lampPositions(cam: number, reducedMotion: boolean) {
  const scroll = Math.round(cam * (reducedMotion ? 1 : LAMP_SPEED));
  const positions: number[] = [];
  let i = Math.floor((scroll - 24) / LAMP_SPACING);
  for (let x = i * LAMP_SPACING + 76 - scroll; x < WIDTH + 24; ) {
    positions.push(x);
    i += 1;
    x = i * LAMP_SPACING + 76 - scroll;
  }
  return positions;
}

function drawLampLight(ctx: Ctx, x: number) {
  for (let y = SIDEWALK_Y; y < ROAD_Y - 1; y += 1) {
    const half = 6 + (y - SIDEWALK_Y);
    for (let px = x - half; px <= x + half; px += 1) {
      if (((px + y) & 1) === 0) rect(ctx, COLORS.sub, px, y, 1, 1);
    }
  }
}

// Kept below sign height so passing lamps never cover a store's name.
const LAMP_TOP = 80;

function drawLampPost(ctx: Ctx, x: number) {
  rect(ctx, COLORS.sub, x, LAMP_TOP, 1, 124 - LAMP_TOP);
  rect(ctx, COLORS.sign, x + 1, LAMP_TOP, 1, 124 - LAMP_TOP);
  rect(ctx, COLORS.amber, x - 2, LAMP_TOP - 2, 6, 2);
}

function drawPrompt(ctx: Ctx, x: number, bob: number) {
  const label = "Enter";
  const width = textWidth(label) + 4;
  const left = clamp(x + SPRITE_W / 2 - width / 2, 1, WIDTH - width - 1);
  const top = FEET_Y - SPRITE_H - 10 - bob;
  rect(ctx, COLORS.sign, left, top, width, 9);
  drawText(ctx, label, left + 2, top + 2, COLORS.paper);
}

export function draw(
  ctx: Ctx,
  world: World,
  state: WalkState,
  reducedMotion: boolean,
  near: Store | null,
) {
  const cam = clamp(
    Math.round(state.x + SPRITE_W / 2 - WIDTH / 2),
    0,
    world.width - WIDTH,
  );

  drawSky(ctx, state.ticks, reducedMotion);
  drawSkyline(ctx, Math.round(cam * (reducedMotion ? 1 : SKYLINE_SPEED)));
  drawTitle(ctx, cam);
  drawGround(ctx, cam);

  world.stores.forEach((store, index) => {
    const sx = store.x - cam;
    if (sx > WIDTH || sx + store.width < 0) return;
    if (isOpen(store)) drawOpenStore(ctx, store, sx, state.shutters[index]);
    else drawConstructionLot(ctx, store, sx);
  });

  const lamps = lampPositions(cam, reducedMotion);
  lamps.forEach((x) => drawLampLight(ctx, x));

  const playerX = Math.round(state.x) - cam;
  drawSprite(
    ctx,
    state.walkFrame === 0 ? WALK_A : WALK_B,
    playerX,
    FEET_Y - SPRITE_H,
    state.facing < 0,
  );

  if (near) {
    const bob = reducedMotion ? 0 : Math.floor(state.ticks / 16) % 2;
    drawPrompt(ctx, playerX, bob);
  }

  lamps.forEach((x) => drawLampPost(ctx, x));
}
