import type { Project } from "@/content/projects";
import { site } from "@/content/site";
import {
  COLORS,
  HEIGHT,
  SKY_COLORS,
  CHARACTER,
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

// Stars scattered over a wide, tall patch of sky, the same on every visit.
// y is in scene rows, so negative values sit in the extra sky above the scene
// on tall windows. The field repeats sideways on very wide windows.
const STAR_FIELD_W = 2048;
const STAR_TOP = -512;
const STAR_BOTTOM = 60;
const STARS: [number, number][] = [];
let starSeed = 7;
const starRandom = () => (starSeed = (starSeed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 700; i += 1) {
  STARS.push([
    Math.floor(starRandom() * STAR_FIELD_W),
    Math.floor(STAR_TOP + starRandom() * (STAR_BOTTOM - STAR_TOP)),
  ]);
}

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

/**
 * What the canvas shows, in art pixels. The camera is framed on the storefront
 * band (FRAME_TOP to FRAME_BOTTOM); width grows with the window, so wider
 * screens see more of the street. sceneTop is where scene row 0 lands in the
 * view: positive means extra sky above, negative means the camera is zoomed in
 * and the top rows are cropped. bottom is the road below row HEIGHT, left free
 * for the controls bar (negative when the view ends above it).
 */
export type View = {
  width: number;
  height: number;
  scale: number; // device pixels per art pixel, always a whole number
  sceneTop: number;
  bottom: number;
};

export const DEFAULT_VIEW: View = {
  width: WIDTH,
  height: HEIGHT,
  scale: 1,
  sceneTop: 0,
  bottom: 0,
};

// The camera frames these scene rows: just above the tallest roof and the title,
// down through the sidewalk, the curb and a strip of road.
const FRAME_TOP = 20;
const FRAME_BOTTOM = 126;
const FRAME_ROWS = FRAME_BOTTOM - FRAME_TOP;

const MIN_VIEW_WIDTH = 96; // narrow screens keep one storefront plus margins in view
const MAX_SCALE = 8; // in CSS pixels; above this, wider screens show more street instead

/**
 * Picks a whole-number scale in device pixels, so every art pixel is the same
 * size on any screen and zoom level. The scale is as large as the framing band
 * allows, which zooms the camera in on the storefronts. All sizes passed in are
 * device pixels.
 */
export function fitView(
  stageWidth: number,
  stageHeight: number,
  controlsHeight: number,
  devicePixelRatio: number,
): View {
  const byHeight = Math.floor((stageHeight - controlsHeight) / FRAME_ROWS);
  const byWidth = Math.floor(stageWidth / MIN_VIEW_WIDTH);
  const maxScale = Math.max(1, Math.round(MAX_SCALE * devicePixelRatio));
  const scale = Math.max(1, Math.min(byHeight, byWidth, maxScale));

  const width = Math.ceil(stageWidth / scale);
  const height = Math.ceil(stageHeight / scale);
  const controlsRows = Math.ceil(controlsHeight / scale);
  // Row FRAME_BOTTOM sits right on top of the controls bar.
  const sceneTop = height - controlsRows - FRAME_BOTTOM;
  return { width, height, scale, sceneTop, bottom: height - HEIGHT - sceneTop };
}

export type WalkState = {
  x: number;
  facing: 1 | -1;
  moving: boolean;
  animTicks: number; // ticks since the character started walking or stopped
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
    moving: false,
    animTicks: 0,
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

  const moving = direction !== 0;
  if (moving !== state.moving) {
    state.moving = moving;
    state.animTicks = 0; // start the new animation from its first frame
  }
  state.animTicks += 1;
  if (moving) {
    state.facing = direction > 0 ? 1 : -1;
    state.x += direction * WALK_SPEED;
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

// Which cell of the sprite sheet to show: [row, column].
function characterCell(state: WalkState, reducedMotion: boolean): [number, number] {
  if (state.moving) {
    const { row, frames, ticksPerFrame } = CHARACTER.walk;
    return [row, Math.floor(state.animTicks / ticksPerFrame) % frames];
  }
  const { row, timeline } = CHARACTER.idle;
  if (reducedMotion) return [row, timeline[0][0]]; // hold still: no breathing or blinking
  const total = timeline.reduce((sum, [, ticks]) => sum + ticks, 0);
  let t = state.animTicks % total;
  for (const [column, ticks] of timeline) {
    if (t < ticks) return [row, column];
    t -= ticks;
  }
  return [row, timeline[0][0]];
}

// The character from its sprite sheet, bottom of the cell on the sidewalk,
// centered on the player, mirrored when walking left. Nothing is drawn until
// the sheet has loaded (it's a 2 KB image).
function drawPlayer(
  ctx: Ctx,
  state: WalkState,
  playerX: number,
  sprites: Sprites,
  reducedMotion: boolean,
) {
  const sheet = sprites.get(CHARACTER.sheet);
  if (!sheet) return;
  const { frameWidth: w, frameHeight: h } = CHARACTER;
  const [row, column] = characterCell(state, reducedMotion);
  const left = playerX + Math.floor((SPRITE_W - w) / 2);
  const top = FEET_Y - h;
  ctx.save();
  if (state.facing < 0) {
    ctx.translate(left + w, top);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(left, top);
  }
  ctx.drawImage(sheet, column * w, row * h, w, h, 0, 0, w, h);
  ctx.restore();
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

export type SkyPhase = keyof typeof SKY_COLORS;

/**
 * Which sky to draw for a local time of day (hours, 0 to 24). Fixed hours, as an
 * approximation: real sunrise and sunset move with the seasons and location.
 */
export function skyPhaseAt(hours: number): SkyPhase {
  if (hours >= 7 && hours < 18) return "day";
  if ((hours >= 5.5 && hours < 7) || (hours >= 18 && hours < 19.5)) return "twilight";
  return "night";
}

function drawSun(ctx: Ctx, x: number, y: number) {
  const radius = 6;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const half = Math.round(Math.sqrt(radius * radius - dy * dy));
    rect(ctx, COLORS.amber, x - half, y + dy, half * 2, 1);
  }
  // Pixel rays, straight and diagonal.
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    rect(ctx, COLORS.amber, x + dx * 9 - (dx === 0 ? 1 : 0), y + dy * 9 - (dy === 0 ? 1 : 0), dx === 0 ? 2 : 2, dy === 0 ? 2 : 2);
  }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    rect(ctx, COLORS.amber, x + dx * 7 - (dx < 0 ? 1 : 0), y + dy * 7 - (dy < 0 ? 1 : 0), 1, 1);
  }
}

function drawSky(
  ctx: Ctx,
  ticks: number,
  reducedMotion: boolean,
  view: View,
  phase: SkyPhase,
) {
  rect(ctx, SKY_COLORS[phase], 0, -view.sceneTop, view.width, view.height);

  // Sun by day, moon otherwise, near the right edge a little below the top of the view.
  const bodyX = view.width - 34;
  const bodyY = -view.sceneTop + 12;
  if (phase === "day") {
    drawSun(ctx, bodyX, bodyY);
    return; // no stars in daylight
  }

  const radius = 8;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const half = Math.round(Math.sqrt(radius * radius - dy * dy));
    rect(ctx, COLORS.amber, bodyX - half, bodyY + dy, half * 2, 1);
  }
  if (phase !== "night") return; // stars only once it is fully dark

  for (let offset = 0; offset < view.width; offset += STAR_FIELD_W) {
    STARS.forEach(([x, y], index) => {
      if (y < -view.sceneTop || offset + x >= view.width) return;
      const blinking =
        !reducedMotion && (ticks + index * 37) % TWINKLE_CYCLE < TWINKLE_OFF;
      if (!blinking) rect(ctx, COLORS.sub, offset + x, y, 1, 1);
    });
  }

}

function drawSkyline(ctx: Ctx, scroll: number, width: number, phase: SkyPhase) {
  let x = -mod(scroll, SKYLINE_W);
  while (x < width) {
    SKYLINE.forEach(([w, h], building) => {
      const top = SIDEWALK_Y - h;
      rect(ctx, COLORS.street, x, top, w, h);
      // Windows light up once the sun goes down.
      for (let wy = top + 4; phase !== "day" && wy < SIDEWALK_Y - 4; wy += 5) {
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

function drawGround(ctx: Ctx, cam: number, view: View) {
  const { width } = view;
  rect(ctx, COLORS.edge, 0, SIDEWALK_Y, width, ROAD_Y - SIDEWALK_Y);
  for (let x = -mod(cam, 16); x < width; x += 16) {
    rect(ctx, COLORS.street, x, SIDEWALK_Y, 1, ROAD_Y - SIDEWALK_Y);
  }
  rect(ctx, COLORS.sub, 0, ROAD_Y - 1, width, 1);
  // The road runs on under the controls bar.
  rect(ctx, COLORS.street, 0, ROAD_Y, width, HEIGHT - ROAD_Y + view.bottom);
  for (let x = -mod(cam, 20); x < width; x += 20) {
    rect(ctx, COLORS.amber, x, 131, 10, 1);
  }
}

export const TITLE_X = 16;

// Scene rows the HTML overlays in PixelStreet line up with.
export const GUIDE_ROW = 46; // key guide: just under "Little Saigon" (rows 38-42)
export const DOOR_TOP_ROW = SIDEWALK_Y - GROUND_FLOOR_H; // top of every shop door

// Wide enough for the full-size title and the key prompts under it.
function hasRoomForTitle(viewWidth: number) {
  return textWidth(site.name) * 2 + 32 <= viewWidth;
}

function drawTitle(ctx: Ctx, cam: number, viewWidth: number) {
  const x = TITLE_X - cam;
  // On narrow, zoomed-in screens the 2x name would run off the edge, so use 1x.
  const size = hasRoomForTitle(viewWidth) ? 2 : 1;
  if (x + textWidth(site.name) * size < 0) return;
  drawText(ctx, site.name, x, size === 2 ? 22 : 28, COLORS.paper, size);
  drawText(ctx, "Software from the coutner side", x, 38, COLORS.teal);
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

/** Street-sized sprites (see lib/pixel/sprites.ts), keyed by a project's `icon` path. */
export type Sprites = ReadonlyMap<string, HTMLCanvasElement>;

// A store's rooftop icon, centered, sitting on the roof edge at row `roof`.
// Already fitted to the street by toSprite, so it is drawn 1:1 and stays crisp.
function drawRoofIcon(
  ctx: Ctx,
  store: Store,
  sx: number,
  roof: number,
  sprites: Sprites,
) {
  const image = store.project.icon && sprites.get(store.project.icon);
  if (!image) return; // not loaded yet, or no icon
  const left = sx + Math.floor((store.width - image.width) / 2);
  const top = roof + 1 - (image.height - 1);
  ctx.drawImage(image, Math.round(left), Math.round(top));
}

function drawOpenStore(
  ctx: Ctx,
  store: Store,
  sx: number,
  shutter: number,
  sprites: Sprites,
) {
  const { width, project } = store;
  const { building, palette } = project;

  const height = building === "kitchen" ? 72 : 60;
  const top = SIDEWALK_Y - height;
  const groundY = SIDEWALK_Y - GROUND_FLOOR_H;
  const awningY = groundY - AWNING_H;
  const signY = awningY - SIGN_H;

  rect(ctx, palette.brick, sx, top, width, height);
  rect(ctx, COLORS.edge, sx, top, width, 2);
  drawRoofIcon(ctx, store, sx, top, sprites);
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

function lampPositions(scroll: number, width: number) {
  const positions: number[] = [];
  let i = Math.floor((scroll - 24) / LAMP_SPACING);
  for (let x = i * LAMP_SPACING + 76 - scroll; x < width + 24;) {
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

/**
 * Left edge of the view in world pixels. Shared with the HTML overlays.
 * Snapped to whole device pixels (not art pixels), so the street scrolls
 * smoothly even when one art pixel is several screen pixels wide. The offset
 * from the player is a whole number, so the character never twitches on screen.
 */
export function cameraX(world: World, state: WalkState, view: View) {
  // On a window wider than the whole street, the camera simply stays at 0.
  const target = clamp(
    state.x + SPRITE_W / 2 - Math.floor(view.width / 2),
    0,
    Math.max(0, world.width - view.width),
  );
  return Math.round(target * view.scale) / view.scale;
}

/**
 * Draws one scrolling layer. The art inside stays on its own whole-pixel grid
 * (draw receives a whole-number scroll); the layer itself is shifted by the
 * leftover fraction, in whole device pixels, so pixels stay crisp.
 */
function scrolled(ctx: Ctx, view: View, offset: number, draw: (scroll: number) => void) {
  const devicePx = Math.round(offset * view.scale);
  const scroll = Math.floor(devicePx / view.scale);
  ctx.save();
  ctx.translate(-(devicePx - scroll * view.scale) / view.scale, 0);
  draw(scroll);
  ctx.restore();
}

export function draw(
  ctx: Ctx,
  world: World,
  state: WalkState,
  reducedMotion: boolean,
  view: View,
  sprites: Sprites,
  phase: SkyPhase,
) {
  const cam = cameraX(world, state, view);
  const { scale } = view;
  // Scrolling layers can shift up to one pixel left, so they draw one extra column.
  const wide: View = { ...view, width: view.width + 1 };

  // The canvas is in device pixels; everything is drawn in art pixels, scaled
  // up. Scene rows start at sceneTop; the extra sky sits above row 0.
  ctx.setTransform(scale, 0, 0, scale, 0, view.sceneTop * scale);
  ctx.imageSmoothingEnabled = false;

  drawSky(ctx, state.ticks, reducedMotion, view, phase);
  scrolled(ctx, view, cam * (reducedMotion ? 1 : SKYLINE_SPEED), (scroll) =>
    drawSkyline(ctx, scroll, wide.width, phase),
  );

  scrolled(ctx, view, cam, (scroll) => {
    drawTitle(ctx, scroll, view.width);
    drawGround(ctx, scroll, wide);
    world.stores.forEach((store, index) => {
      const sx = store.x - scroll;
      if (sx > wide.width || sx + store.width < 0) return;
      if (isOpen(store)) drawOpenStore(ctx, store, sx, state.shutters[index], sprites);
      else drawConstructionLot(ctx, store, sx);
    });
  });

  const lampScroll = cam * (reducedMotion ? 1 : LAMP_SPEED);
  scrolled(ctx, view, lampScroll, (scroll) =>
    lampPositions(scroll, wide.width).forEach((x) => drawLampLight(ctx, x)),
  );

  // The player, placed to the device pixel like the camera.
  scrolled(ctx, view, cam, (scroll) => {
    const playerX = Math.round(state.x * scale) / scale - scroll;
    drawPlayer(ctx, state, playerX, sprites, reducedMotion);
  });

  scrolled(ctx, view, lampScroll, (scroll) =>
    lampPositions(scroll, wide.width).forEach((x) => drawLampPost(ctx, x)),
  );
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
