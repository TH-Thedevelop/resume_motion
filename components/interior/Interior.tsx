import Image from "next/image";
import { openProjects, type Project } from "@/content/projects";

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-interior-accent";

// Shared by the modal's "Leave store" button and the full page's "Leave store" link.
export const leaveStoreClass = `inline-flex min-h-11 items-center self-start border-2 border-interior-fg px-3.5 font-pixel text-[13px] font-bold text-interior-fg hover:bg-interior-fg hover:text-interior-bg ${focusRing}`;

// The warm paper panel a store's interior sits on.
export const interiorPanelClass =
  "rounded-lg border border-interior-line bg-interior-bg text-interior-fg";

const linkClass = `text-interior-accent underline ${focusRing}`;

// The case study. Shared by the modal over the street and the full /work/[slug] page.
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
    <article className="flex flex-col gap-4">
      <p className="font-mono text-sm uppercase tracking-[0.08em] text-interior-muted">
        {number} · {kind}
      </p>
      <Heading
        id={titleId}
        className="font-pixel text-3xl leading-tight font-bold md:text-5xl"
      >
        {name}
      </Heading>
      <p className="text-xl leading-relaxed md:text-2xl">{summary}</p>

      <dl className="mt-2 grid grid-cols-[96px_minmax(0,1fr)] gap-x-6 gap-y-5 border-t-2 border-interior-line pt-5 md:grid-cols-[120px_minmax(0,1fr)]">
        {details.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="pt-1 font-pixel text-sm text-interior-muted">
              {label}
            </dt>
            <dd className="leading-relaxed md:text-lg">{value}</dd>
          </div>
        ))}
      </dl>

      <ul aria-label="Stack" className="mt-2 flex flex-wrap gap-2">
        {(stack.length > 0 ? stack : ["[TODO]"]).map((tool) => (
          <li
            key={tool}
            className="border border-interior-line px-2.5 py-1 font-mono text-sm"
          >
            {tool}
          </li>
        ))}
      </ul>

      {(links?.live || links?.github) && (
        <div className="mt-2 flex flex-wrap gap-4">
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
          className="relative mt-4 aspect-video overflow-hidden border border-interior-line"
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            className="object-cover"
          />
        </div>
      ))}
    </article>
  );
}
