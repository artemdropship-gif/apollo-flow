import { cn } from "@/lib/utils";

/**
 * Animated vector "core" mark: a central nucleus with electrons orbiting on
 * tilted elliptical paths. Monochrome (uses currentColor), Vercel-minimal.
 */
export function ApolloCore({ className }: { className?: string }) {
  const orbits = [
    { rx: 46, ry: 18, rotate: 0, dur: "8s", reverse: false },
    { rx: 46, ry: 18, rotate: 60, dur: "11s", reverse: true },
    { rx: 46, ry: 18, rotate: 120, dur: "14s", reverse: false },
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("text-foreground", className)}
      role="img"
      aria-label="Apollo core"
      fill="none"
    >
      {orbits.map((o, i) => (
        <g
          key={i}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: `${o.reverse ? "apollo-spin-rev" : "apollo-spin"} ${o.dur} linear infinite`,
          }}
          className="motion-reduce:[animation:none]"
        >
          <g transform={`rotate(${o.rotate} 50 50)`}>
            <ellipse
              cx="50"
              cy="50"
              rx={o.rx}
              ry={o.ry}
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.35"
            />
            <circle cx={50 + o.rx} cy="50" r="4.5" fill="currentColor" />
          </g>
        </g>
      ))}
      <circle cx="50" cy="50" r="9" fill="currentColor" />
    </svg>
  );
}
