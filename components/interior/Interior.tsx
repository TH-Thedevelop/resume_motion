import Image from "next/image";
import { openProjects, type Project } from "@/content/projects";

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-interior-accent";

// Shared by the modal's "Leave store" button and the full page's "Leave store" link.
// Sizes are in em, so the button scales with the panel it sits in.
export const leaveStoreClass = `inline-flex min-h-[2.75em] items-center self-start border-2 border-interior-fg px-[0.875em] font-pixel text-[0.8125em] font-bold text-interior-fg hover:bg-interior-fg hover:text-interior-bg ${focusRing}`;

// The warm paper panel a store's interior sits on.
export const interiorPanelClass =
  "rounded-lg border border-interior-line bg-interior-bg text-interior-fg";

const linkClass = `text-interior-accent underline ${focusRing}`;

// The case study. Shared by the modal over the street and the full /work/[slug] page.
// Every size is in em, relative to the font size of the panel around it: the
// modal sets a fluid size so it grows with the window; the full page uses 16px.
export function Interior({
  project,
  titleId,
  headingLevel,
}: {
  project: Project;
  titleId: string;
  headingLevel: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const {
    slug,
    name,
    kind,
    summary,
    problem,
    built,
    result,
    stack,
    links,
    images,
  } = project;
  const number = String(
    openProjects.findIndex((p) => p.slug === slug) + 1,
  ).padStart(2, "0");

  const details = [
    ["Problem", problem],
    ["Built", built],
    ["Result", result],
  ];

  return (
    <article className="flex flex-col gap-[1em]">
      <p className="font-mono text-[0.875em] uppercase tracking-[0.08em] text-interior-muted">
        {number} · {kind}
      </p>
      <Heading
        id={titleId}
        className="font-pixel text-[1.875em] leading-tight font-bold md:text-[3em]"
      >
        {name}
      </Heading>
      <p className="text-[1.25em] leading-relaxed md:text-[1.5em]">{summary}</p>

      <dl className="mt-[0.5em] grid grid-cols-[6em_minmax(0,1fr)] gap-x-[1.5em] gap-y-[1.25em] border-t-2 border-interior-line pt-[1.25em] md:grid-cols-[7.5em_minmax(0,1fr)]">
        {details.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="pt-[0.25em] font-pixel text-[0.875em] text-interior-muted">
              {label}
            </dt>
            <dd className="leading-relaxed md:text-[1.125em]">{value}</dd>
          </div>
        ))}
      </dl>

      <ul aria-label="Stack" className="mt-[0.5em] flex flex-wrap gap-[0.5em]">
        {(stack.length > 0 ? stack : ["[TODO]"]).map((tool) => (
          <li
            key={tool}
            className="border border-interior-line px-[0.7em] py-[0.3em] font-mono text-[0.875em]"
          >
            {tool}
          </li>
        ))}
      </ul>

      {(links?.live || links?.github) && (
        <div className="mt-[0.5em] flex flex-wrap gap-[1em]">
          {links.live && (
            <a href={links.live} className={linkClass}>
              Visit the live site
            </a>
          )}
          {links.github && (
            <a href={links.github} className={linkClass}>
              View the code on GitHub
            </a>
          )}
        </div>
      )}

      {images?.map((image) => (
        <div
          key={image.src}
          className="relative mt-[1em] aspect-video overflow-hidden border border-interior-line"
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 768px) 1080px, 100vw"
            className="object-cover"
          />
        </div>
      ))}
    </article>
  );
}
