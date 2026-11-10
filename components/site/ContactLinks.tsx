import { site } from "@/content/site";

const linkClass =
  "text-neon-teal underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal";

export function ContactLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={className}>
      <li>
        <a href={`mailto:${site.email}`} className={linkClass}>
          {site.email}
        </a>
      </li>
      <li>
        <a href={site.phone.href} className={linkClass}>
          {site.phone.display}
        </a>
      </li>
      <li>
        <a href={site.github.href} className={linkClass}>
          {site.github.display}
        </a>
      </li>
    </ul>
  );
}
