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
  // Rooftop icon: an image in public/sprites/. Any size; big pixel art is shrunk to fit the roof.
  icon?: string;
};

export const projects: Project[] = [
  {
    slug: "chef-nourish",
    name: "Chef Nourish",
    kind: "Client project",
    sign: "CHEF NOURISH",
    building: "kitchen",
    icon: "/sprites/chef-hat.png",
    status: "open",
    palette: { neon: "#FF5C9E", awning: "#45E3D2", brick: "#3A2A3F" },
    summary:
      "An AI-powered ingredient substitution engine for a meal-prep catering business.",
    problem:
      "A meal-prep catering business needed ingredient substitutes that match each client's dietary restrictions, and no substitute that violates a restriction can reach a client.",
    built:
      "A cache-first architecture keyed on dietary-restriction tags that calls the LLM only on cache misses, to cut API cost and latency. Structured LLM output goes through deterministic validation in application code. Underneath are diet templates, an ingredient taxonomy, and a multi-factor substitution ranker, structured from thousands of entries extracted from hundreds of kitchen cut-sheets.",
    result: "Deliverying a working ingredient substitution system that help them to deal with their client's restriction and generate the menu base on that.",
    stack: ["Next.js 16", "TypeScript", "OpenAI Responses API", "PostgreSQL on Neon", "Vercel"],
  },
  {
    slug: "pickle-banh-mi",
    name: "Pickle Banh Mi Co.",
    kind: "Freelance contract",
    sign: "PICKLE BANH MI",
    building: "shopfront",
    icon: "/sprites/banh-mi.png",
    status: "open",
    palette: { neon: "#45E3D2", awning: "#FFC24B", brick: "#2B3A33" },
    summary:
      "Overhauling and maintaining the website for a Fountain Valley banh mi shop, as a contracted freelance web developer.",
    problem:
      "The company website, picklebanhmi.co, messy and outdated. It does not reflect the quality of the food and service they provide.",
    built:
      "Revamping their website's UI/UX and content. Improve their online presence to attract more customers and make it easier for them to order online.",
    result: "Successfully improved their online presence and make it easier for customers to order online.",
    stack: ["Wix"],
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
