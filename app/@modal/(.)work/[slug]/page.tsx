import { notFound } from "next/navigation";
import { Interior } from "@/components/interior/Interior";
import { InteriorModal } from "@/components/interior/InteriorModal";
import { getOpenProject, openProjects } from "@/content/projects";

// Cache Components needs at least one path here, so at least one project must be open.
export function generateStaticParams() {
  return openProjects.map((project) => ({ slug: project.slug }));
}

// Opened from the street (client-side navigation): the store shows over the canvas.
export default async function InterceptedStore({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getOpenProject(slug);
  if (!project) notFound();

  const titleId = `store-${project.slug}-title`;

  return (
    <InteriorModal titleId={titleId}>
      <Interior project={project} titleId={titleId} headingLevel={2} />
    </InteriorModal>
  );
}
