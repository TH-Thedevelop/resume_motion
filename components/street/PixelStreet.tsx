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
import { HEIGHT, WIDTH } from "@/lib/pixel/art";
import {
  createWalkState,
  createWorld,
  draw,
  update,
  type WalkState,
} from "@/lib/pixel/scene";

const TICK_MS = 1000 / 60;
const BUTTON_STEP = 16; // pixels moved per keyboard press of an on-screen button

const buttonClass =
  "rounded-md border border-edge bg-sign px-5 py-3 font-mono text-sm text-paper select-none touch-none hover:border-neon-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal disabled:opacity-40 disabled:hover:border-edge";

// Technique 3: use a whole-number scale when there's room for at least 2x.
// Smaller screens fall back to a fractional scale so the scene stays readable.
function fitScale(availableWidth: number, availableHeight: number) {
  const fit = Math.min(availableWidth / WIDTH, availableHeight / HEIGHT);
  const whole = Math.floor(fit);
  return whole >= 2 ? whole : fit;
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
  const walkRef = useRef<WalkState | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const pointerRef = useRef(0);

  const [nearSlug, setNearSlug] = useState<string | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [smooth, setSmooth] = useState(false);
  const [focused, setFocused] = useState(false);
  const nearName = projects.find((p) => p.slug === nearSlug)?.name;
  const openProjects = projects.filter((p) => p.status === "open");

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      const scale = fitScale(entry.contentRect.width, entry.contentRect.height);
      canvas.style.width = `${WIDTH * scale}px`;
      canvas.style.height = `${HEIGHT * scale}px`;
      setScale(scale);
    });
    observer.observe(stage);
    return () => observer.disconnect();
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

      draw(ctx, world, walk, reducedMotion, near);
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
      <div className="flex h-dvh flex-col gap-3 p-4">
        <SiteHeader />

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-teal">
            Pixel experiment
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-paper">
            Pixel Street
          </h1>
          <p className="mt-1 max-w-2xl text-sub">
            Your portfolio street redrawn as pixel art. Walk with the arrow keys
            or the buttons. Shutters roll up as you get close, and Enter takes
            you inside the store.
          </p>
        </div>

        <div
          ref={stageRef}
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              tabIndex={0}
              role="application"
              aria-label="Pixel art street. Use the left and right arrow keys to walk, and Enter to go inside a store."
              className={`block focus-visible:outline-2 focus-visible:outline-neon-teal ${
                smooth
                  ? "[image-rendering:auto]"
                  : "[image-rendering:pixelated]"
              }`}
              onKeyDown={handleKeyDown}
              onKeyUp={(event) => setKey(event, false)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                keysRef.current = { left: false, right: false };
                setFocused(false);
              }}
            />

            {/* Technique 1: one grid cell per real pixel, drawn over the canvas. */}
            {showGrid && scale && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgb(244 241 234 / 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgb(244 241 234 / 0.2) 1px, transparent 1px)",
                  backgroundSize: `${scale}px ${scale}px`,
                }}
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
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {nearName ? `Standing at ${nearName}, press Enter to go inside.` : ""}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
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

        <p className="hidden text-center font-mono text-xs text-sub md:block">
          &larr; &rarr; or A D walk &middot; Enter or &uarr; go inside &middot;
          Esc leave
        </p>
      </div>

      <PixelLessons
        projects={projects}
        scale={scale}
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
