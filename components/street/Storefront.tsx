import Link from "next/link";
import type { Project } from "@/content/projects";
import { NeonSign } from "./NeonSign";

const windowGlow = {
  background:
    "linear-gradient(180deg, rgb(255 194 75 / 0.55), rgb(255 194 75 / 0.15))",
};

function UpperFloor({
  building,
  accent,
}: {
  building: Project["building"];
  accent: string;
}) {
  const lit = "rgb(255 194 75 / 0.5)";

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox="0 0 400 120"
      preserveAspectRatio="xMidYMid meet"
    >
      {building === "kitchen" ? (
        <>
          <rect x="70" y="24" width="70" height="72" rx="3" fill={lit} />
          <rect x="260" y="24" width="70" height="72" rx="3" fill={lit} />
          <path
            d="M10 18 Q200 62 390 18"
            fill="none"
            stroke="var(--sub)"
            strokeWidth="1.5"
          />
          {[60, 130, 200, 270, 340].map((cx) => (
            <circle key={cx} cx={cx} cy={cx === 200 ? 52 : 42} r="9" fill={accent} />
          ))}
        </>
      ) : (
        [50, 165, 280].map((x) => (
          <rect key={x} x={x} y="24" width="70" height="72" rx="3" fill={lit} />
        ))
      )}
    </svg>
  );
}

export function Storefront({ project }: { project: Project }) {
  const { slug, name, sign, building, palette } = project;

  return (
    <article
      aria-label={name}
      className="flex w-[86vw] shrink-0 snap-center items-end justify-center px-4 md:w-[60vw]"
    >
      <div
        className="flex h-[min(68dvh,34rem)] w-full max-w-[30rem] flex-col rounded-t-md border border-b-0 border-edge"
        style={{ background: palette.brick }}
      >
        <div className="min-h-0 flex-1 p-3">
          <UpperFloor building={building} accent={palette.neon} />
        </div>

        <div className="px-6 pb-3">
          <NeonSign text={sign} color={palette.neon} />
        </div>

        <div
          aria-hidden="true"
          className="h-7 shrink-0"
          style={{
            background: `repeating-linear-gradient(90deg, ${palette.awning} 0 28px, var(--paper) 28px 56px)`,
          }}
        />

        <div className="flex h-[42%] shrink-0 gap-3 px-4 pt-4">
          <div
            aria-hidden="true"
            className="flex-1 self-stretch rounded-t-sm border border-edge"
            style={windowGlow}
          />
          <Link
            href={`/work/${slug}`}
            aria-label={`Enter ${name}`}
            className="flex w-24 shrink-0 items-end justify-center rounded-t-md border-2 border-edge bg-night pb-4 font-mono text-xs uppercase tracking-widest text-paper transition-colors hover:border-neon-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-teal"
          >
            Enter
          </Link>
          <div
            aria-hidden="true"
            className="flex-1 self-stretch rounded-t-sm border border-edge"
            style={windowGlow}
          />
        </div>
      </div>
    </article>
  );
}
