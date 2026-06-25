import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { blockMeta } from "@/lib/workflow/blocks";

export interface BlockNodeData {
  label: string;
  type: string;
  tech: string;
  taskCount: number;
  [key: string]: unknown;
}

function BlockNodeImpl({ data, selected }: NodeProps) {
  const d = data as BlockNodeData;
  const meta = blockMeta(d.type);
  return (
    <div
      className="w-52 rounded-md border bg-card text-card-foreground shadow-sm transition-shadow"
      style={{
        borderColor: selected ? meta.color : "var(--border)",
        boxShadow: selected ? `0 0 0 1px ${meta.color}` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: meta.color }} />
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: meta.color }} />
        <span className="font-mono text-xs font-semibold">{d.label}</span>
        <span className="ml-auto text-[10px] uppercase text-muted-foreground">
          {d.type}
        </span>
      </div>
      <div className="space-y-1 px-3 py-2">
        {d.tech ? (
          <p className="line-clamp-2 text-[11px] text-muted-foreground">{d.tech}</p>
        ) : null}
        {d.taskCount > 0 ? (
          <p className="text-[10px] text-muted-foreground">
            Задач: {d.taskCount}
          </p>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: meta.color }} />
    </div>
  );
}

export const BlockNode = memo(BlockNodeImpl);
