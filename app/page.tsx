import { PixelStreet } from "@/components/street/PixelStreet";
import { projects } from "@/content/projects";

export default function Home() {
  return <PixelStreet projects={projects} />;
}
