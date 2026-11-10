import Link from "next/link";
import { site } from "@/content/site";
import { ContactLinks } from "./ContactLinks";

const navLink =
  "text-sub hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal";

// Shown on every page: name, Classic view, Résumé, Contact.
export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <Link
        href="/"
        className="font-display text-xl font-bold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal md:text-2xl"
      >
        {site.name}
      </Link>

      <nav aria-label="Site" className="flex items-center gap-5 font-mono text-sm">
        <Link href="/classic" className={navLink}>
          Classic view
        </Link>
        <a href={site.resume} className={navLink}>
          Résumé
        </a>
        {/* <details> opens and closes without any JavaScript. */}
        <details className="relative">
          <summary
            className={`${navLink} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
          >
            Contact
          </summary>
          <ContactLinks className="absolute right-0 top-full z-10 mt-2 flex w-max flex-col gap-2 rounded-md border border-edge bg-sign p-4 font-sans" />
        </details>
      </nav>
    </header>
  );
}
