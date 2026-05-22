'use client'

import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Bot, CircleHelp, Flag, GitBranch, MessageSquare, Play } from 'lucide-react'
import type { ReactNode } from 'react'
import type { NodeType } from '@/lib/flow/types'
import { cn } from '@/lib/utils'

/** Visual metadata per node type — also used by the palette. */
export const NODE_META: Record<NodeType, { label: string; icon: typeof Play; accent: string }> = {
  start: { label: 'Start', icon: Play, accent: 'border-emerald-400 bg-emerald-50' },
  message: { label: 'Message', icon: MessageSquare, accent: 'border-sky-400 bg-sky-50' },
  question: { label: 'Question', icon: CircleHelp, accent: 'border-amber-400 bg-amber-50' },
  condition: { label: 'Condition', icon: GitBranch, accent: 'border-violet-400 bg-violet-50' },
  ai: { label: 'AI reply', icon: Bot, accent: 'border-pink-400 bg-pink-50' },
  end: { label: 'End', icon: Flag, accent: 'border-zinc-400 bg-zinc-100' },
}

function Shell({
  type,
  selected,
  children,
}: {
  type: NodeType
  selected: boolean
  children?: ReactNode
}) {
  const meta = NODE_META[type]
  const Icon = meta.icon
  return (
    <div
      className={cn(
        'w-52 rounded-lg border-2 shadow-sm transition-shadow',
        meta.accent,
        selected ? 'ring-2 ring-zinc-900 ring-offset-1' : '',
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-black/10 px-3 py-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </div>
      {children ? <div className="px-3 py-2 text-xs text-zinc-700">{children}</div> : null}
    </div>
  )
}

const handleClass = '!h-2.5 !w-2.5 !border-2 !border-white !bg-zinc-500'

export function StartNode({ selected }: NodeProps) {
  return (
    <Shell type="start" selected={selected ?? false}>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </Shell>
  )
}

export function MessageNode({ data, selected }: NodeProps) {
  const text = String((data as { text?: string }).text ?? '')
  return (
    <Shell type="message" selected={selected ?? false}>
      <Handle type="target" position={Position.Top} className={handleClass} />
      <p className="line-clamp-3 whitespace-pre-wrap break-words">
        {text || <span className="text-zinc-400">(empty message)</span>}
      </p>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </Shell>
  )
}

export function QuestionNode({ data, selected }: NodeProps) {
  const d = data as { prompt?: string; variable?: string }
  return (
    <Shell type="question" selected={selected ?? false}>
      <Handle type="target" position={Position.Top} className={handleClass} />
      <p className="line-clamp-2 whitespace-pre-wrap break-words">
        {d.prompt || <span className="text-zinc-400">(empty prompt)</span>}
      </p>
      <p className="mt-1 font-mono text-[10px] text-zinc-500">→ {d.variable || '(no variable)'}</p>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </Shell>
  )
}

export function ConditionNode({ data, selected }: NodeProps) {
  const d = data as { variable?: string; cases?: { value: string; label: string }[] }
  const cases = d.cases ?? []
  // One source handle per case, plus an "else" fallback, spread along the bottom.
  const handles = [
    ...cases.map((c) => ({ id: c.value, label: c.label })),
    { id: 'else', label: 'else' },
  ]
  return (
    <Shell type="condition" selected={selected ?? false}>
      <Handle type="target" position={Position.Top} className={handleClass} />
      <p className="font-mono text-[10px] text-zinc-500">if {d.variable || '(no variable)'} ==</p>
      <div className="mt-1 flex flex-col gap-0.5">
        {handles.map((h) => (
          <span key={h.id} className="truncate rounded bg-white/70 px-1.5 py-0.5 text-[10px]">
            {h.label}
          </span>
        ))}
      </div>
      {handles.map((h, i) => (
        <Handle
          key={h.id}
          id={h.id}
          type="source"
          position={Position.Bottom}
          className={handleClass}
          style={{ left: `${((i + 1) / (handles.length + 1)) * 100}%` }}
        />
      ))}
    </Shell>
  )
}

export function AiNode({ data, selected }: NodeProps) {
  const d = data as { systemPrompt?: string; model?: string }
  return (
    <Shell type="ai" selected={selected ?? false}>
      <Handle type="target" position={Position.Top} className={handleClass} />
      <p className="line-clamp-2 whitespace-pre-wrap break-words">
        {d.systemPrompt || <span className="text-zinc-400">(no system prompt)</span>}
      </p>
      <p className="mt-1 font-mono text-[10px] text-zinc-500">{d.model || '(no model)'}</p>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </Shell>
  )
}

export function EndNode({ selected }: NodeProps) {
  return (
    <Shell type="end" selected={selected ?? false}>
      <Handle type="target" position={Position.Top} className={handleClass} />
    </Shell>
  )
}

/** Stable map passed to <ReactFlow nodeTypes>. */
export const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
  ai: AiNode,
  end: EndNode,
}
