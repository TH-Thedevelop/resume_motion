import type { Project } from "@/content/projects";
import { NeonSign } from "./NeonSign";

export function ConstructionLot({ project }: { project: Project }) {
  const { name, sign, palette } = project;

  return (
    <article
      aria-label={`${name}, under construction`}
      className="flex w-[86vw] shrink-0 snap-center items-end justify-center px-4 md:w-[60vw]"
    >
      <div className="relative h-[min(68dvh,34rem)] w-full max-w-[30rem]">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 480 400"
          preserveAspectRatio="xMidYMax meet"
        >
          {/* Crane */}
          <g stroke="var(--sub)" strokeWidth="5" fill="none">
            <path d="M120 400 V60" />
            <path d="M150 400 V60" />
            <path d="M120 340 L150 290 L120 240 L150 190 L120 140 L150 90" strokeWidth="2.5" />
            <path d="M50 60 H440" />
            <path d="M135 20 L50 60 M135 20 L440 60 M135 20 V60" strokeWidth="2.5" />
            <path d="M360 60 V170" strokeWidth="2" />
          </g>
          <rect x="340" y="170" width="40" height="22" fill={palette.neon} />

          {/* Fence */}
          <rect x="0" y="310" width="480" height="90" fill={palette.brick} stroke="var(--edge)" strokeWidth="2" />
          {[40, 130, 220, 310, 400].map((x) => (
            <path
              key={x}
              d={`M${x} 310 l40 90`}
              stroke={palette.neon}
              strokeWidth="10"
              opacity="0.7"
            />
          ))}
        </svg>

        <div className="absolute inset-x-8 bottom-[8%]">
          <NeonSign text={sign} color={palette.neon} />
        </div>
      </div>
    </article>
  );
}
