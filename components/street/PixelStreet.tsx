"use client";

import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import type { Project } from "@/content/projects";
import { ARROW_LEFT, ARROW_RIGHT, ARROW_UP, CHARACTER } from "@/lib/pixel/art";
import { toCanvas, toSprite } from "@/lib/pixel/sprites";
import {
  DEFAULT_VIEW,
  DOOR_TOP_ROW,
  GUIDE_ROW,
  TITLE_X,
  cameraX,
  skyPhaseAt,
  createWalkState,
  createWorld,
  draw,
  fitView,
  update,
  type View,
  type WalkState,
} from "@/lib/pixel/scene";

const TICK_MS = 1000 / 60;
const BUTTON_STEP = 16; // pixels moved per keyboard press of an on-screen button

const buttonClass =
  "pointer-events-auto rounded-md border border-edge bg-sign px-5 py-3 font-mono text-sm text-paper select-none touch-none hover:border-neon-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal disabled:opacity-40 disabled:hover:border-edge";

// Key guide pieces: HTML over the canvas, so sizes are exact CSS pixels
// (30px keycaps, 16px labels) in the Silkscreen pixel font.
const guideLabelClass =
  "font-pixel text-[16px] leading-none uppercase text-paper";

function PixelArrow({ rows }: { rows: string[] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      width={18}
      height={18}
      shapeRendering="crispEdges"
      className="block"
    >
      {rows.flatMap((row, y) =>
        row
          .split("")
          .map((cell, x) =>
            cell === "#" ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
            ) : null,
          ),
      )}
    </svg>
  );
}

// Primary keys are gold; alternate keys are muted gray.
function Keycap({
  tone,
  children,
}: {
  tone: "primary" | "alternate";
  children: ReactNode;
}) {
  const color =
    tone === "primary"
      ? "border-neon-amber text-neon-amber"
      : "border-sub text-sub";
  return (
    <span
      className={`inline-flex h-[30px] min-w-[30px] items-center justify-center border-2 bg-night px-1.5 font-pixel text-sm leading-none uppercase shadow-[0_3px_0_0_var(--edge)] ${color}`}
    >
      {children}
    </span>
  );
}

function GuideDot() {
  return <span className="px-1 font-pixel text-[16px] text-sub">·</span>;
}

function WalkButton({
  label,
  direction,
  onHold,
  onStep,
  children,
}: {
  label: string;
  direction: number;
  onHold: (direction: number) => void;
  onStep: (direction: number) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={buttonClass}
      onPointerDown={() => onHold(direction)}
      onPointerUp={() => onHold(0)}
      onPointerLeave={() => onHold(0)}
      onPointerCancel={() => onHold(0)}
      // detail is 0 when the button was pressed from the keyboard.
      onClick={(event) => {
        if (event.detail === 0) onStep(direction);
      }}
    >
      {children}
    </button>
  );
}

export function PixelStreet({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion() ?? false;
  const world = useMemo(() => createWorld(projects), [projects]);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>(DEFAULT_VIEW);
  const cssScaleRef = useRef(1); // CSS pixels per art pixel
  const guideRef = useRef<HTMLDivElement>(null);
  const doorPromptRef = useRef<HTMLDivElement>(null);
  const walkRef = useRef<WalkState | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const pointerRef = useRef(0);
  // ?hour=14 (or 6.5, 22...) in the address previews that time of day.
  const hourOverrideRef = useRef<number | null>(null);
  const spritesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const [nearSlug, setNearSlug] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const nearName = projects.find((p) => p.slug === nearSlug)?.name;

  // Size the canvas to fill the stage. Measured in real screen pixels so the
  // scale is always whole (technique 3), even on zoomed or high-density screens.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const controls = controlsRef.current;
    if (!stage || !canvas || !controls) return;

    const measure = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = stage.getBoundingClientRect();
      const view = fitView(
        width * dpr,
        height * dpr,
        controls.offsetHeight * dpr,
        dpr,
      );
      // The canvas is in device pixels (not art pixels), so the camera can
      // scroll by single screen pixels; each art pixel is still a whole block.
      const canvasWidth = view.width * view.scale;
      const canvasHeight = view.height * view.scale;
      if (canvas.width !== canvasWidth) canvas.width = canvasWidth;
      if (canvas.height !== canvasHeight) canvas.height = canvasHeight;

      const cssScale = view.scale / dpr;
      canvas.style.width = `${view.width * cssScale}px`;
      canvas.style.height = `${view.height * cssScale}px`;
      viewRef.current = view;
      cssScaleRef.current = cssScale;
    };

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(controls);
    // Browser zoom changes devicePixelRatio, which a ResizeObserver can miss.
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Read the ?hour= preview switch once, if it is there.
  useEffect(() => {
    const hour = Number(new URLSearchParams(window.location.search).get("hour"));
    if (Number.isFinite(hour) && hour >= 0 && hour < 24) hourOverrideRef.current = hour;
  }, []);

  // Load each store's rooftop icon (an image in public/sprites/) once and fit it
  // to the street. Any size works; big pixel art is shrunk by toSprite.
  useEffect(() => {
    const sprites = spritesRef.current;
    for (const path of new Set(projects.map((p) => p.icon).filter(Boolean))) {
      if (!path || sprites.has(path)) continue;
      const image = new Image();
      image.onload = () => sprites.set(path, toSprite(image));
      image.src = path;
    }
    // The character's sprite sheet, used as it is (not shrunk like icons).
    if (!sprites.has(CHARACTER.sheet)) {
      const image = new Image();
      image.onload = () => sprites.set(CHARACTER.sheet, toCanvas(image));
      image.src = CHARACTER.sheet;
    }
  }, [projects]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Kept in a ref so your spot on the street survives leaving and coming back.
    walkRef.current ??= createWalkState(world);
    const walk = walkRef.current;

    let frameId = 0;
    let last = performance.now();
    let pending = 0;
    let previousX = walk.x; // where the player was one tick ago, for smoothing
    let near: ReturnType<typeof update> = null;
    let reportedSlug: string | null = null;

    // Footsteps: loop while walking (holding a key plays it to the end and
    // repeats); the moment the character stops, pause and rewind to 0:00.
    // preload "none": the file only downloads the first time you walk.
    const footsteps = new Audio(CHARACTER.footsteps);
    footsteps.loop = true;
    footsteps.preload = "none";
    let stepsPlaying = false;
    const stopSteps = () => {
      footsteps.pause();
      footsteps.currentTime = 0;
      stepsPlaying = false;
    };
    // A hidden tab stops the game loop, so stop the sound there too.
    const onVisibility = () => {
      if (document.hidden) stopSteps();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const frame = (now: number) => {
      pending += Math.min(now - last, 100);
      last = now;

      while (pending >= TICK_MS) {
        const { left, right } = keysRef.current;
        const direction = pointerRef.current || Number(right) - Number(left);
        previousX = walk.x;
        near = update(world, walk, direction, reducedMotion);
        pending -= TICK_MS;
      }

      if (walk.moving && !stepsPlaying) {
        stepsPlaying = true;
        // Browsers allow this because walking always starts from a key press,
        // click or tap. If playback is refused anyway, just stay silent.
        footsteps.play().catch(() => {
          stepsPlaying = false;
        });
      } else if (!walk.moving && stepsPlaying) {
        stopSteps();
      }

      const slug = near?.project.slug ?? null;
      if (slug !== reportedSlug) {
        reportedSlug = slug;
        setNearSlug(slug);
      }

      const view = viewRef.current;
      // The game runs 60 ticks a second, but screens refresh at 60, 90, 120 Hz
      // or unevenly on phones. Draw the player part of the way between its last
      // two positions, so movement looks even at any refresh rate.
      const shown = { ...walk, x: previousX + (walk.x - previousX) * (pending / TICK_MS) };
      // The sky follows the visitor's own clock, checked every frame.
      const clock = new Date();
      const hours =
        hourOverrideRef.current ?? clock.getHours() + clock.getMinutes() / 60;
      draw(ctx, world, shown, reducedMotion, view, spritesRef.current, skyPhaseAt(hours));

      // Keep the HTML overlays pinned to the scene as the camera moves. Set
      // directly on the elements, so walking never re-renders React.
      // Art pixels to CSS pixels, on the same device-pixel grid as the canvas.
      const dpr = view.scale / cssScaleRef.current;
      const toCss = (art: number) => Math.round(art * view.scale) / dpr;
      const cam = cameraX(world, shown, view);
      const guide = guideRef.current;
      if (guide) {
        const x = toCss(TITLE_X - cam);
        const y = toCss(view.sceneTop + GUIDE_ROW);
        guide.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      const doorPrompt = doorPromptRef.current;
      if (doorPrompt && near) {
        const x = toCss(near.doorX - cam);
        const y = toCss(view.sceneTop + DOOR_TOP_ROW);
        // Centered on the door, hanging just inside the top of the doorway so
        // the store's sign and awning stay readable.
        doorPrompt.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, 6px)`;
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      // Leaving the street (opening a store, another page) stops the sound.
      document.removeEventListener("visibilitychange", onVisibility);
      stopSteps();
    };
  }, [world, reducedMotion]);

  function goInside() {
    if (nearSlug) router.push(`/work/${nearSlug}`);
  }

  function setKey(event: KeyboardEvent<HTMLCanvasElement>, held: boolean) {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") keysRef.current.left = held;
    else if (key === "arrowright" || key === "d") keysRef.current.right = held;
    else return false;
    return true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key.toLowerCase();
    if (key === "enter" || key === "arrowup" || key === "w") {
      event.preventDefault();
      if (!event.repeat) goInside();
    } else if (event.key === "Escape") {
      event.currentTarget.blur();
    } else if (setKey(event, true)) {
      event.preventDefault();
    }
  }

  function hold(direction: number) {
    pointerRef.current = direction;
  }

  function step(direction: number) {
    if (walkRef.current) walkRef.current.x += direction * BUTTON_STEP;
  }

  return (
    <main className="bg-night">
      <h1 className="sr-only">
        Pixel Street: walk past each project and step inside
      </h1>
      {/* First screen: the header, then the street filling everything below it. */}
      <div className="flex h-dvh flex-col">
        <div className="p-4">
          <SiteHeader />
        </div>

        <div
          ref={stageRef}
          className="relative min-h-0 flex-1 overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            width={DEFAULT_VIEW.width}
            height={DEFAULT_VIEW.height}
            tabIndex={0}
            role="application"
            aria-label="Pixel art street. Use the left and right arrow keys or A and D to walk, and the up arrow, W, or Enter to go inside a store."
            className="absolute left-0 top-0 block outline-none [image-rendering:pixelated]"
            onKeyDown={handleKeyDown}
            onKeyUp={(event) => setKey(event, false)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              keysRef.current = { left: false, right: false };
              setFocused(false);
            }}
          />

          {/* The canvas runs past the stage edges, so the focus ring is drawn inside the stage. */}
          {focused && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-neon-teal"
            />
          )}

          {/* Key guide under "Little Saigon", lined up with the title's left edge.
              Desktop only: touch screens use the buttons along the bottom. */}
          <div
            ref={guideRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 hidden flex-col gap-2.5 will-change-transform md:flex"
          >
            <div className="flex items-center gap-1.5">
              <Keycap tone="primary">
                <PixelArrow rows={ARROW_LEFT} />
              </Keycap>
              <Keycap tone="primary">
                <PixelArrow rows={ARROW_RIGHT} />
              </Keycap>
              <span className={`ml-1.5 ${guideLabelClass}`}>Walk</span>
              <GuideDot />
              <Keycap tone="alternate">A</Keycap>
              <Keycap tone="alternate">D</Keycap>
            </div>
            <div className="flex items-center gap-1.5">
              <Keycap tone="primary">
                <PixelArrow rows={ARROW_UP} />
              </Keycap>
              <Keycap tone="primary">Enter</Keycap>
              <span className={`ml-1.5 ${guideLabelClass}`}>Go inside</span>
              <GuideDot />
              <Keycap tone="alternate">W</Keycap>
            </div>
            {/* The keys only work once the street has focus. */}
            {!focused && (
              <p className="font-pixel text-xs uppercase text-paper/80">
                Click the street to play
              </p>
            )}
          </div>

          {/* Shown at the doorway only while you are close enough to go in. */}
          <div
            ref={doorPromptRef}
            aria-hidden="true"
            className={`pointer-events-none absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap border border-edge bg-night/90 px-2 py-1.5 will-change-transform motion-safe:transition-opacity motion-safe:duration-150 ${
              nearSlug ? "opacity-100" : "opacity-0"
            }`}
          >
            <Keycap tone="primary">Enter</Keycap>
            <span className={guideLabelClass}>Go inside</span>
          </div>

          {/* Controls sit on the road along the bottom. The scene leaves room for them. */}
          <div
            ref={controlsRef}
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pb-4 pt-3"
          >
            <div className="flex items-center gap-2">
              <WalkButton
                label="Walk left"
                direction={-1}
                onHold={hold}
                onStep={step}
              >
                &larr;
              </WalkButton>
              <button
                type="button"
                disabled={!nearSlug}
                className={buttonClass}
                onClick={goInside}
              >
                Go inside
              </button>
              <WalkButton
                label="Walk right"
                direction={1}
                onHold={hold}
                onStep={step}
              >
                &rarr;
              </WalkButton>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {nearName ? `Standing at ${nearName}, press Enter to go inside.` : ""}
      </p>
    </main>
  );
}
