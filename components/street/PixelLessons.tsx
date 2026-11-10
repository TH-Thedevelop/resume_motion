"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Project } from "@/content/projects";
import {
  COLORS,
  HEIGHT,
  SPRITE_COLORS,
  WALK_A,
  WALK_B,
  WIDTH,
} from "@/lib/pixel/art";
import { LAMP_SPEED, SKYLINE_SPEED, WALK_FRAME_TICKS } from "@/lib/pixel/scene";

// "How pixel art works" and "Fitting it into your build", following the
// Pixel Street document. Previews use the same data the canvas draws with.

export function scaleLabel(scale: number | null) {
  if (scale === null) return "–";
  if (Number.isInteger(scale)) return `${scale}×`;
  return `${scale.toFixed(2)}× (fractional)`;
}

const code = "rounded-sm bg-sign px-1 font-mono text-sm text-paper";

const toggleClass =
  "rounded-md border border-edge bg-sign px-3 py-2 font-mono text-xs text-sub hover:border-neon-teal aria-pressed:border-neon-teal aria-pressed:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal";

function Card({
  label,
  title,
  children,
  preview,
}: {
  label?: string;
  title: string;
  children: ReactNode;
  preview?: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-edge bg-street p-6">
      {label && (
        <p className="font-mono text-xs uppercase tracking-widest text-neon-teal">
          {label}
        </p>
      )}
      <h3 className="mt-2 font-display text-xl font-bold text-paper">
        {title}
      </h3>
      <div className="mt-2 leading-relaxed text-sub">{children}</div>
      {preview && <div className="mt-4">{preview}</div>}
    </article>
  );
}

function Toggle({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={toggleClass}
      onClick={onToggle}
    >
      {children}
    </button>
  );
}

function Sprite({ rows, caption }: { rows: string[]; caption: string }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        aria-hidden="true"
        className="grid w-20 rounded-sm bg-sign"
        style={{ gridTemplateColumns: `repeat(${rows[0].length}, 1fr)` }}
      >
        {rows.flatMap((row, y) =>
          row.split("").map((letter, x) => (
            <span
              key={`${x}-${y}`}
              className="aspect-square"
              style={{
                background:
                  letter === "." ? "transparent" : SPRITE_COLORS[letter],
              }}
            />
          )),
        )}
      </div>
      <figcaption className="font-mono text-xs text-sub">{caption}</figcaption>
    </figure>
  );
}

// Card 3 preview: the same 16 x 16 checkerboard at 2x, 3x and 2.5x. Sizes are
// in real screen pixels, so 2.5x shows uneven pixels on any display.
const SAMPLE = 16;

function ScaleSample({ factor, caption }: { factor: number; caption: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    for (let y = 0; y < SAMPLE; y += 1) {
      for (let x = 0; x < SAMPLE; x += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.sub : COLORS.sign;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const size = (SAMPLE * factor) / (window.devicePixelRatio || 1);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
  }, [factor]);

  return (
    <figure className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={SAMPLE}
        height={SAMPLE}
        aria-hidden="true"
        className="[image-rendering:pixelated]"
      />
      <figcaption className="text-center font-mono text-xs text-sub">
        {caption}
      </figcaption>
    </figure>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="size-5 shrink-0 rounded-sm border border-edge"
        style={{ background: color }}
      />
      <span className="font-mono text-xs text-sub">{label}</span>
    </li>
  );
}

export function PixelLessons({
  projects,
  scale,
  showGrid,
  smooth,
  onToggleGrid,
  onToggleSmooth,
}: {
  projects: Project[];
  scale: number | null;
  showGrid: boolean;
  smooth: boolean;
  onToggleGrid: () => void;
  onToggleSmooth: () => void;
}) {
  return (
    <section
      aria-labelledby="pixel-lessons-title"
      className="mx-auto max-w-5xl px-4 pb-12 pt-8"
    >
      <h2
        id="pixel-lessons-title"
        className="font-display text-3xl font-bold text-paper"
      >
        How pixel art works
      </h2>
      <p className="mt-2 max-w-2xl text-lg text-sub">
        Pixel art is drawing on a tiny grid on purpose, where every square is a
        decision. This screen is only {WIDTH} × {HEIGHT} pixels. Here are the
        six techniques it uses, with a switch or preview for each.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card
          label="1 · Tiny canvas"
          title="Draw small, then scale up"
          preview={
            <div className="flex flex-wrap items-center gap-4">
              <Toggle pressed={showGrid} onToggle={onToggleGrid}>
                Show pixel grid
              </Toggle>
              <p className="font-mono text-sm text-paper">
                Scale: {scaleLabel(scale)}
              </p>
            </div>
          }
        >
          <p>
            Everything is drawn at {WIDTH} × {HEIGHT} and the browser enlarges
            it. Turn on <strong className="text-paper">Show pixel grid</strong>{" "}
            to see each real pixel.
          </p>
        </Card>

        <Card
          label="2 · Nearest-neighbor"
          title="Keep the edges sharp"
          preview={
            <Toggle pressed={smooth} onToggle={onToggleSmooth}>
              Smooth scaling
            </Toggle>
          }
        >
          <p>
            Normal image scaling blends neighboring pixels into blur.{" "}
            <code className={code}>image-rendering: pixelated</code> copies each
            pixel into a hard block instead. Press{" "}
            <strong className="text-paper">Smooth scaling</strong> to see the
            blur you&apos;re avoiding.
          </p>
        </Card>

        <Card
          label="3 · Whole numbers"
          title="Snap everything to the grid"
          preview={
            <div className="flex flex-wrap items-end gap-6">
              <ScaleSample factor={2} caption="2×: all even" />
              <ScaleSample factor={3} caption="3×: all even" />
              <ScaleSample factor={2.5} caption="2.5×: uneven" />
            </div>
          }
        >
          <p>
            The camera and the character use{" "}
            <code className={code}>Math.round</code>, so nothing ever lands
            between pixels. Scaling by a whole number (2×, 3×) keeps every pixel
            the same size. On a phone the screen falls back to a fractional
            scale so it stays readable.
          </p>
        </Card>

        <Card
          label="4 · Sprites"
          title="A character is a tiny grid"
          preview={
            <div className="flex gap-8">
              <Sprite rows={WALK_A} caption="Frame A" />
              <Sprite rows={WALK_B} caption="Frame B" />
            </div>
          }
        >
          <p>
            The walker is {WALK_A[0].length} × {WALK_A.length} pixels written as
            text, one letter per color. Walking swaps two frames every{" "}
            {WALK_FRAME_TICKS} game ticks, a slower beat than the 60 fps camera,
            which is what makes it read as pixel art.
          </p>
        </Card>

        <Card
          label="5 · Limited palette"
          title="Pick colors on purpose"
          preview={
            <div className="flex flex-col gap-4">
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(COLORS).map(([name, hex]) => (
                  <Swatch key={name} color={hex} label={`${name} ${hex}`} />
                ))}
              </ul>
              {projects.map((project) => (
                <div key={project.slug}>
                  <p className="font-mono text-xs text-sub">{project.name}</p>
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                    {Object.entries(project.palette).map(([part, hex]) => (
                      <Swatch key={part} color={hex} label={`${part} ${hex}`} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          }
        >
          <p>Every color in the scene comes from one fixed list.</p>
        </Card>

        <Card
          label="6 · Dithering and layers"
          title="Texture without new colors"
          preview={
            <div
              aria-hidden="true"
              className="h-12 rounded-sm"
              style={{
                backgroundColor: COLORS.edge,
                backgroundImage: `conic-gradient(${COLORS.sub} 25%, transparent 0 50%, ${COLORS.sub} 0 75%, transparent 0)`,
                backgroundSize: "8px 8px",
              }}
            />
          }
        >
          <p>
            The lamp light on the sidewalk is a checkerboard of two colors, not
            a new shade. The skyline, the street, and the lamp posts scroll at{" "}
            {SKYLINE_SPEED}×, 1× and {LAMP_SPEED}× speed, which creates depth.
          </p>
        </Card>
      </div>
    </section>
  );
}

export function PixelBuildNotes() {
  return (
    <section
      aria-labelledby="pixel-build-title"
      className="mx-auto max-w-5xl px-4 pb-12"
    >
      <h2
        id="pixel-build-title"
        className="font-display text-3xl font-bold text-paper"
      >
        Fitting it into your build
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card title="One component swaps in">
          <p>
            Build it as <code className={code}>PixelStreet.tsx</code>, a client
            component that draws on a canvas and reads the same{" "}
            <code className={code}>projects.ts</code>. Adding a project still
            adds a storefront.
          </p>
        </Card>

        <Card title="Doors stay real links">
          <p>
            Pressing Enter calls{" "}
            <code className={code}>router.push(&quot;/work/&quot; + slug)</code>
            , so the interior, the intercepted route, and{" "}
            <code className={code}>/classic</code> all work exactly as in the
            blueprint.
          </p>
        </Card>

        <Card title="Motion still has a job">
          <p>
            The canvas handles the world. Motion for React animates the HTML on
            top of it: the interior panel, the header, and the transitions.
          </p>
        </Card>

        <Card title="Tools for the art">
          <p>
            Draw sprites in Piskel (free, runs in the browser) or Aseprite. If
            you later want collisions or physics, a small engine like Kaplay can
            run inside the same component.
          </p>
        </Card>
      </div>
    </section>
  );
}
