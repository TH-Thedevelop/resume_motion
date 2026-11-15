import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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
export default function StorePage({ params }: Props) {
  return (
    <div className="min-h-dvh bg-night p-4">
      <SiteHeader />
      <main
        className={`mx-auto mt-8 max-w-[1440px] px-6 pt-5 pb-8 md:px-10 md:pt-8 md:pb-10 ${interiorPanelClass}`}
      >
        {/* A link, not router.back(): a visitor from a shared link has no street to go back to. */}
        <Link href="/" className={`mb-4 ${leaveStoreClass}`}>
          &larr; Leave store
        </Link>
        <Suspense fallback={null}>
          <StoreContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function StoreContent({ params }: Props) {
  const { slug } = await params;
  const project = getOpenProject(slug);
  if (!project) notFound();

  return (
    <Interior
      project={project}
      titleId={`store-${project.slug}-title`}
      headingLevel={1}
    />
  );
}
