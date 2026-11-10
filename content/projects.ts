export type Project = {
  slug: string;
  name: string;
  kind: string; // shown above the name inside the store, e.g. "Client project"
  sign: string; // neon text, uppercase, short
  building: "kitchen" | "shopfront" | "construction";
  status: "open" | "construction";
  palette: { neon: string; awning: string; brick: string };
  summary: string; // one line
  problem: string;
  built: string;
  result: string; // a number or a link; never invented
  stack: string[];
  links?: { live?: string; github?: string };
  images?: { src: string; alt: string }[];
};

export const projects: Project[] = [
  {
    slug: "chef-nourish",
    name: "Chef Nourish",
    kind: "Client project",
    sign: "CHEF NOURISH",
    building: "kitchen",
    status: "open",
    palette: { neon: "#FF5C9E", awning: "#45E3D2", brick: "#3A2A3F" },
    summary:
      "An AI-powered ingredient substitution engine for a meal-prep catering business.",
    problem:
      "A meal-prep catering business needed ingredient substitutes that match each client's dietary restrictions, and no substitute that violates a restriction can reach a client.",
    built:
      "A cache-first architecture keyed on dietary-restriction tags that calls the LLM only on cache misses, to cut API cost and latency. Structured LLM output goes through deterministic validation in application code. Underneath are diet templates, an ingredient taxonomy, and a multi-factor substitution ranker, structured from thousands of entries extracted from hundreds of kitchen cut-sheets.",
    result: "[TODO]",
    stack: ["Python", "LLM APIs", "Data Modeling"],
  },
  {
    slug: "pickle-banh-mi",
    name: "Pickle Banh Mi Co.",
    kind: "Freelance contract",
    sign: "PICKLE BANH MI",
    building: "shopfront",
    status: "open",
    palette: { neon: "#45E3D2", awning: "#FFC24B", brick: "#2B3A33" },
    summary:
      "Overhauling and maintaining the website for a Fountain Valley banh mi shop, as a contracted freelance web developer.",
    problem:
      "The company website, picklebanhmi.co, had long-standing usability and content issues.",
    built:
      "Contracted by the business owners, I scoped the requirements, negotiated a services agreement, and am fixing the site's usability and content issues. I manage ongoing site updates through the end of 2026.",
    result: "[TODO]",
    stack: [],
    links: { live: "https://picklebanhmi.co" },
  },
  {
    // Placeholder lot. Unfinished projects are never named on the street.
    slug: "next-build",
    name: "Next build",
    kind: "[TODO]",
    sign: "NEXT BUILD",
    building: "construction",
    status: "construction",
    palette: { neon: "#FFC24B", awning: "#39425E", brick: "#191F31" },
    summary: "[TODO]",
    problem: "[TODO]",
    built: "[TODO]",
    result: "[TODO]",
    stack: [],
  },
];

// Only finished stores can be entered. Construction lots never get a page.
export const openProjects = projects.filter((p) => p.status === "open");

export function getOpenProject(slug: string): Project | undefined {
  return openProjects.find((p) => p.slug === slug);
}
