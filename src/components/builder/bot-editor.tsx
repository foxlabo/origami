'use client'

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { ArrowLeft, Play, Save } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState, useTransition } from 'react'
import { saveBotGraphAction } from '@/app/actions'
import { TestPanel } from '@/components/tester/test-panel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createNode } from '@/lib/flow/factory'
import type { FlowGraph, FlowNode, NodeType } from '@/lib/flow/types'
import { NodeConfigPanel } from './node-config-panel'
import { NODE_META, nodeTypes } from './nodes'

interface BotEditorProps {
  botId: string
  botName: string
  initialGraph: FlowGraph
}

const PALETTE: NodeType[] = ['message', 'question', 'condition', 'ai', 'end']

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function BotEditor({ botId, botName, initialGraph }: BotEditorProps) {
  // React Flow state. Nodes are typed loosely as Node — the strict FlowNode
  // shape is enforced on save via flowGraphSchema.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialGraph.nodes as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialGraph.edges as Edge[])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [testGraph, setTestGraph] = useState<FlowGraph | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  // The selected node cast to the strict union — runtime data is always a
  // valid FlowNode (only ever created via createNode / initialGraph).
  const selectedNode = nodes.find((n) => n.id === selectedId) as FlowNode | undefined

  const addNode = (type: NodeType) => {
    const node = createNode(type, {
      x: 80 + Math.random() * 220,
      y: 120 + Math.random() * 220,
    })
    setNodes((ns) => [...ns, node as Node])
    setSelectedId(node.id)
    setSaveState('idle')
  }

  const updateNodeData = (data: FlowNode['data']) => {
    if (!selectedId) return
    setNodes((ns) => ns.map((n) => (n.id === selectedId ? { ...n, data } : n)))
    setSaveState('idle')
  }

  const deleteNode = () => {
    if (!selectedId) return
    setNodes((ns) => ns.filter((n) => n.id !== selectedId))
    setEdges((es) => es.filter((e) => e.source !== selectedId && e.target !== selectedId))
    setSelectedId(null)
    setSaveState('idle')
  }

  const buildGraph = (): FlowGraph => ({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })) as FlowNode[],
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
    })),
  })

  const save = () => {
    setSaveState('saving')
    setSaveError(null)
    startTransition(async () => {
      const result = await saveBotGraphAction(botId, JSON.stringify(buildGraph()))
      if (result.ok) {
        setSaveState('saved')
      } else {
        setSaveState('error')
        setSaveError(result.error)
      }
    })
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to bots">
            <Link href="/">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="truncate text-sm font-semibold">{botName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveState === 'saved' ? <span className="text-xs text-emerald-600">Saved</span> : null}
          {saveState === 'error' ? (
            <span className="text-xs text-red-600" role="alert">
              {saveError ?? 'Save failed'}
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setTestGraph(buildGraph())}>
            <Play className="h-3.5 w-3.5" />
            Test
          </Button>
          <Button size="sm" onClick={save} disabled={saveState === 'saving'}>
            <Save className="h-3.5 w-3.5" />
            {saveState === 'saving' ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Node palette */}
        <aside className="w-44 shrink-0 space-y-1.5 border-r border-zinc-200 bg-white p-3">
          <p className="px-1 pb-1 text-xs font-semibold text-zinc-500">Add node</p>
          {PALETTE.map((type) => {
            const meta = NODE_META[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type)}
                className="flex w-full items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-zinc-100"
              >
                <meta.icon className="h-3.5 w-3.5" />
                {meta.label}
              </button>
            )
          })}
        </aside>

        {/* Canvas */}
        <div className="min-w-0 flex-1">
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
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        {/* Right panel: node config */}
        <aside className="w-72 shrink-0 border-l border-zinc-200 bg-white">
          {selectedNode ? (
            <NodeConfigPanel
              key={selectedNode.id}
              node={selectedNode}
              onChangeData={updateNodeData}
              onDelete={deleteNode}
            />
          ) : (
            <p className="p-4 text-xs text-zinc-500">
              Select a node to edit it, or add one from the palette. Drag between node handles to
              connect them.
            </p>
          )}
        </aside>
      </div>

      <Dialog open={testGraph !== null} onOpenChange={(open) => !open && setTestGraph(null)}>
        <DialogContent className="h-[80vh] max-w-md p-0">
          <DialogHeader className="border-b border-zinc-200 px-4 py-3">
            <DialogTitle>Test: {botName}</DialogTitle>
          </DialogHeader>
          {testGraph ? <TestPanel graph={testGraph} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
