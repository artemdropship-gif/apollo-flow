"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BLOCKS, blockMeta } from "@/lib/workflow/blocks";
import {
  addWorkflowNode,
  deleteWorkflowNode,
  saveWorkflowGraph,
  type WorkflowDetail,
  type WorkflowNodeData,
} from "@/features/workflow/actions";
import { BlockNode, type BlockNodeData } from "./block-node";

const nodeTypes = { block: BlockNode };

interface NodeMeta {
  description: string;
  tech: string;
  notes: string;
  tasks: string[];
}

function toFlowNode(n: WorkflowNodeData): Node<BlockNodeData> {
  return {
    id: n.id,
    type: "block",
    position: { x: n.posX, y: n.posY },
    data: {
      label: n.label,
      type: n.type,
      tech: n.tech,
      taskCount: n.tasks.length,
    },
  };
}

function Canvas({ workflow }: { workflow: WorkflowDetail }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BlockNodeData>>(
    workflow.nodes.map(toFlowNode),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    workflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
    })),
  );

  // Editable per-node metadata kept outside React Flow node.data.
  const metaRef = useRef<Record<string, NodeMeta>>(
    Object.fromEntries(
      workflow.nodes.map((n) => [
        n.id,
        { description: n.description, tech: n.tech, notes: n.notes, tasks: n.tasks },
      ]),
    ),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [, forceRender] = useState(0);

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) => addEdge({ ...conn, animated: true }, eds)),
    [setEdges],
  );

  const selectedMeta = selectedId ? metaRef.current[selectedId] : null;
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  function patchMeta(id: string, patch: Partial<NodeMeta>) {
    metaRef.current[id] = { ...metaRef.current[id], ...patch };
    forceRender((v) => v + 1);
  }

  async function onAddBlock(type: string) {
    const res = await addWorkflowNode(workflow.id, type);
    if (!res.ok || !res.node) {
      toast.error("Не удалось добавить блок");
      return;
    }
    metaRef.current[res.node.id] = {
      description: res.node.description,
      tech: res.node.tech,
      notes: res.node.notes,
      tasks: res.node.tasks,
    };
    setNodes((nds) => [...nds, toFlowNode(res.node!)]);
  }

  async function onDeleteSelected() {
    if (!selectedId) return;
    const id = selectedId;
    const res = await deleteWorkflowNode(id);
    if (!res.ok) {
      toast.error("Не удалось удалить блок");
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    delete metaRef.current[id];
    setSelectedId(null);
  }

  async function onSave() {
    setSaving(true);
    try {
      const res = await saveWorkflowGraph({
        id: workflow.id,
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        nodes: nodes.map((n) => {
          const m = metaRef.current[n.id];
          return {
            id: n.id,
            posX: Math.round(n.position.x),
            posY: Math.round(n.position.y),
            label: (n.data as BlockNodeData).label,
            description: m?.description,
            tech: m?.tech,
            notes: m?.notes,
            tasks: m?.tasks,
          };
        }),
      });
      if (res.ok) toast.success("Схема сохранена");
      else toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  function updateLabel(id: string, label: string) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n,
      ),
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-3">
      <div className="relative flex-1 overflow-hidden rounded-md border border-border bg-background">
        <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
          {BLOCKS.slice(0, 6).map((b) => (
            <button
              key={b.type}
              type="button"
              onClick={() => onAddBlock(b.type)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 font-mono text-[10px] hover:bg-accent"
            >
              <span className="size-2 rounded-sm" style={{ backgroundColor: b.color }} />
              {b.label}
            </button>
          ))}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => blockMeta((n.data as BlockNodeData).type).color}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>
      </div>

      <aside className="flex w-72 shrink-0 flex-col rounded-md border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="font-mono text-xs font-semibold">
            {selectedNode ? "Блок" : "Действия"}
          </span>
          <Button size="sm" onClick={onSave} disabled={saving}>
            <Save className="size-3.5" />
            {saving ? "Сохраняю…" : "Сохранить"}
          </Button>
        </div>

        {selectedNode && selectedMeta ? (
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Название</label>
              <Input
                value={(selectedNode.data as BlockNodeData).label}
                onChange={(e) => updateLabel(selectedNode.id, e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Технологии</label>
              <Input
                value={selectedMeta.tech}
                onChange={(e) => patchMeta(selectedNode.id, { tech: e.target.value })}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Описание</label>
              <Textarea
                value={selectedMeta.description}
                onChange={(e) => patchMeta(selectedNode.id, { description: e.target.value })}
                className="min-h-16 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Задачи (по строке)</label>
              <Textarea
                value={selectedMeta.tasks.join("\n")}
                onChange={(e) =>
                  patchMeta(selectedNode.id, {
                    tasks: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  })
                }
                className="min-h-20 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Заметки</label>
              <Textarea
                value={selectedMeta.notes}
                onChange={(e) => patchMeta(selectedNode.id, { notes: e.target.value })}
                className="min-h-16 font-mono text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteSelected}
              className="w-full text-red-500 hover:text-red-500"
            >
              <Trash2 className="size-3.5" />
              Удалить блок
            </Button>
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            <p className="text-[11px] text-muted-foreground">
              Кликните блок, чтобы отредактировать. Тяните от края к краю, чтобы соединить.
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">Добавить блок</p>
            <div className="grid grid-cols-2 gap-1">
              {BLOCKS.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => onAddBlock(b.type)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[10px] hover:bg-accent"
                >
                  <Plus className="size-3" style={{ color: b.color }} />
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export function WorkflowCanvas({ workflow }: { workflow: WorkflowDetail }) {
  return (
    <ReactFlowProvider>
      <Canvas workflow={workflow} />
    </ReactFlowProvider>
  );
}
