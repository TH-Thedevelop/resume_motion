import type { Metadata } from "next";
import Link from "next/link";
import { ContactLinks } from "@/components/site/ContactLinks";
import { SiteHeader } from "@/components/site/SiteHeader";
import { openProjects, projects } from "@/content/projects";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `Classic view | ${site.name}`,
  description: site.tagline,
};

const linkClass =
  "text-neon-teal underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal";

// The recruiter fast path: every project as a plain list, no animation, no game.
export default function ClassicPage() {
  const underConstruction = projects.some((p) => p.status === "construction");

  return (
    <div className="min-h-dvh bg-night p-4">
      <SiteHeader />

      <main className="mx-auto max-w-3xl py-10">
        <h1 className="font-display text-4xl font-bold text-paper">Projects</h1>
        <p className="mt-2 text-lg text-sub">{site.tagline}</p>

        <ul className="mt-10 flex flex-col gap-10">
          {openProjects.map((project) => (
            <li key={project.slug} className="border-t border-edge pt-6">
              <h2 className="font-display text-2xl font-bold text-paper">
                {project.name}
              </h2>
              <p className="mt-2 text-paper">{project.summary}</p>
              {project.stack.length > 0 && (
                <p className="mt-2 font-mono text-sm text-sub">
                  {project.stack.join(" · ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-4">
                <Link href={`/work/${project.slug}`} className={linkClass}>
                  Read the case study
                </Link>
                {project.links?.live && (
                  <a href={project.links.live} className={linkClass}>
                    Visit the live site
                  </a>
                )}
                {project.links?.github && (
                  <a href={project.links.github} className={linkClass}>
                    View the code on GitHub
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>

        {underConstruction && (
          <p className="mt-10 text-sub">One more project is under construction.</p>
        )}

        <section className="mt-12 border-t border-edge pt-6">
          <h2 className="font-display text-2xl font-bold text-paper">Contact</h2>
          <ContactLinks className="mt-3 flex flex-col gap-2" />
          <p className="mt-4">
            <a href={site.resume} className={linkClass}>
              Download my résumé (PDF)
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
