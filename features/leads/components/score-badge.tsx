import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { scorePriority } from "@/lib/score";

export function ScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const { label, color } = scorePriority(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <Flame className="size-3" />
      {score}
      <span className="hidden font-normal opacity-80 sm:inline">· {label}</span>
    </span>
  );
}
