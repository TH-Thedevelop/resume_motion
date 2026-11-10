import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Interior,
  interiorPanelClass,
  leaveStoreClass,
} from "@/components/interior/Interior";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getOpenProject, openProjects } from "@/content/projects";
import { site } from "@/content/site";

type Props = { params: Promise<{ slug: string }> };

// Cache Components needs at least one path here, so at least one project must be open.
export function generateStaticParams() {
  return openProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getOpenProject(slug);
  if (!project) return {};
  return {
    title: `${project.name} | ${site.name}`,
    description: project.summary,
  };
}

// A direct visit or shared link: the full page, no street behind it.
export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const project = getOpenProject(slug);
  if (!project) notFound();

  return (
    <div className="min-h-dvh bg-night p-4">
      <SiteHeader />
      <main
        className={`mx-auto mt-8 max-w-4xl px-6 pt-5 pb-8 md:px-14 md:pt-10 md:pb-14 ${interiorPanelClass}`}
      >
        {/* A link, not router.back(): a visitor from a shared link has no street to go back to. */}
        <Link href="/" className={`mb-4 ${leaveStoreClass}`}>
          &larr; Leave store
        </Link>
        <Interior
          project={project}
          titleId={`store-${project.slug}-title`}
          headingLevel={1}
        />
      </main>
    </div>
  );
}
