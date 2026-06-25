import { Flame, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import { leadTemperature } from "@/lib/score";

export function TemperatureBadge({
  score,
  noWebsite,
  broken,
  className,
}: {
  score: number;
  noWebsite?: boolean;
  broken?: boolean;
  className?: string;
}) {
  const { key, label, color } = leadTemperature(score, { noWebsite, broken });
  const flames = key === "EXPLOSIVE" ? 2 : key === "HOT" ? 1 : 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{ color, backgroundColor: `${color}1a` }}
      title={`Температура лида: ${label}`}
    >
      {flames > 0 ? (
        <span className="inline-flex">
          {Array.from({ length: flames }).map((_, i) => (
            <Flame key={i} className="size-3" />
          ))}
        </span>
      ) : (
        <Snowflake className="size-3" />
      )}
      {label}
    </span>
  );
}
