"use client";

import { useReducedMotion } from "motion/react";
import Link from "next/link";
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
import {
  PixelBuildNotes,
  PixelLessons,
} from "@/components/street/PixelLessons";
import type { Project } from "@/content/projects";
import {
  DEFAULT_VIEW,
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

// The canvas as laid out on the page: the view in art pixels, and how many
// CSS pixels each art pixel covers (a whole number of real screen pixels).
type Layout = { view: View; cssScale: number };

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
  const walkRef = useRef<WalkState | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const pointerRef = useRef(0);

  const [nearSlug, setNearSlug] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [smooth, setSmooth] = useState(false);
  const [focused, setFocused] = useState(false);
  const nearName = projects.find((p) => p.slug === nearSlug)?.name;
  const openProjects = projects.filter((p) => p.status === "open");

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
      if (canvas.width !== view.width) canvas.width = view.width;
      if (canvas.height !== view.height) canvas.height = view.height;

      const cssScale = view.scale / dpr;
      canvas.style.width = `${view.width * cssScale}px`;
      canvas.style.height = `${view.height * cssScale}px`;
      viewRef.current = view;
      setLayout({ view, cssScale });
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

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Kept in a ref so your spot on the street survives leaving and coming back.
    walkRef.current ??= createWalkState(world);
    const walk = walkRef.current;

    let frameId = 0;
    let last = performance.now();
    let pending = 0;
    let near: ReturnType<typeof update> = null;
    let reportedSlug: string | null = null;

    const frame = (now: number) => {
      pending += Math.min(now - last, 100);
      last = now;

      while (pending >= TICK_MS) {
        const { left, right } = keysRef.current;
        const direction = pointerRef.current || Number(right) - Number(left);
        near = update(world, walk, direction, reducedMotion);
        pending -= TICK_MS;
      }

      const slug = near?.project.slug ?? null;
      if (slug !== reportedSlug) {
        reportedSlug = slug;
        setNearSlug(slug);
      }

      draw(ctx, world, walk, reducedMotion, near, viewRef.current);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
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

    if (event.key === "Enter" || event.key === "ArrowUp") {
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
            aria-label="Pixel art street. Use the left and right arrow keys to walk, and Enter to go inside a store."
            className={`absolute left-0 top-0 block outline-none ${
              smooth ? "[image-rendering:auto]" : "[image-rendering:pixelated]"
            }`}
            onKeyDown={handleKeyDown}
            onKeyUp={(event) => setKey(event, false)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              keysRef.current = { left: false, right: false };
              setFocused(false);
            }}
          />

          {/* Technique 1: one grid cell per art pixel, drawn over the canvas. */}
          {showGrid && layout && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0"
              style={{
                width: layout.view.width * layout.cssScale,
                height: layout.view.height * layout.cssScale,
                backgroundImage:
                  "linear-gradient(to right, rgb(244 241 234 / 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgb(244 241 234 / 0.2) 1px, transparent 1px)",
                backgroundSize: `${layout.cssScale}px ${layout.cssScale}px`,
              }}
            />
          )}

          {/* The canvas runs past the stage edges, so the focus ring is drawn inside the stage. */}
          {focused && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-neon-teal"
            />
          )}

          {!focused && (
            <p
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-3 hidden text-center font-mono text-xs text-paper md:block"
            >
              <span className="rounded-sm bg-sign px-2 py-1">
                Click here, then &larr; &rarr; to walk, Enter to go in
              </span>
            </p>
          )}

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
            <p className="hidden font-mono text-xs text-sub md:block">
              &larr; &rarr; or A D walk &middot; Enter or &uarr; go inside
              &middot; Esc leave
            </p>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {nearName ? `Standing at ${nearName}, press Enter to go inside.` : ""}
      </p>

      <section className="mx-auto max-w-5xl px-4 pt-12">
        <p className="font-mono text-xs uppercase tracking-widest text-neon-teal">
          Pixel experiment
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-paper">
          Pixel Street
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-sub">
          Your portfolio street redrawn as pixel art. Walk with the arrow keys or
          the buttons. Shutters roll up as you get close, and Enter takes you
          inside the store.
        </p>
      </section>

      <PixelLessons
        projects={projects}
        view={layout?.view ?? null}
        showGrid={showGrid}
        smooth={smooth}
        onToggleGrid={() => setShowGrid((on) => !on)}
        onToggleSmooth={() => setSmooth((on) => !on)}
      />

      <PixelBuildNotes />

      <nav
        aria-label="All stores"
        className="flex flex-wrap items-center justify-center gap-x-4 px-4 pb-16 text-sm text-sub"
      >
        <span>Same stores, no game:</span>
        {openProjects.map((project) => (
          <Link
            key={project.slug}
            href={`/work/${project.slug}`}
            className="text-neon-teal underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal"
          >
            {project.name}
          </Link>
        ))}
      </nav>
    </main>
  );
}
