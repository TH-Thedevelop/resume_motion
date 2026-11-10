import type { Project } from "@/content/projects";
import { ConstructionLot } from "./ConstructionLot";
import { Storefront } from "./Storefront";

const stars = [
  [60, 40],
  [180, 110],
  [310, 55],
  [450, 130],
  [590, 35],
  [720, 95],
  [860, 50],
  [990, 140],
  [1110, 70],
  [1190, 25],
];

export function Street({ projects }: { projects: Project[] }) {
  return (
    <main className="relative h-dvh overflow-hidden bg-night">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMin slice"
      >
        {stars.map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="1.5" fill="var(--sub)" />
        ))}
        <circle cx="1020" cy="90" r="34" fill="var(--neon-amber)" opacity="0.85" />
      </svg>

      <div
        aria-hidden="true"
        className="lane pointer-events-none absolute inset-x-0 bottom-0 h-[16dvh] border-t-2 border-edge bg-street"
      />

      <section
        aria-label="The street. Scroll sideways to walk past each project."
        tabIndex={0}
        className="street-scroll relative flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden pb-[16dvh] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neon-teal"
      >
        <header className="flex w-[86vw] shrink-0 snap-center flex-col justify-center px-6 md:w-[60vw] md:px-16">
          <p className="font-mono text-sm uppercase tracking-widest text-neon-teal">
            Little Saigon
          </p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-none text-paper md:text-7xl">
            Nguyen Thien
          </h1>
          <p className="mt-4 max-w-md text-lg text-sub md:text-xl">
            Software built from the counter side.
          </p>
          <p className="mt-8 font-mono text-sm text-neon-amber">
            Walk the street &rarr;
          </p>
        </header>

        {projects.map((project) =>
          project.status === "construction" ? (
            <ConstructionLot key={project.slug} project={project} />
          ) : (
            <Storefront key={project.slug} project={project} />
          ),
        )}
      </section>
    </main>
  );
}
