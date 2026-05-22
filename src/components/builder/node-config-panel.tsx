'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { FlowNode } from '@/lib/flow/types'
import { NODE_META } from './nodes'

interface NodeConfigPanelProps {
  node: FlowNode
  onChangeData: (data: FlowNode['data']) => void
  onDelete: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  )
}

export function NodeConfigPanel({ node, onChangeData, onDelete }: NodeConfigPanelProps) {
  const meta = NODE_META[node.type]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 px-4 py-3 text-sm font-semibold">
        <meta.icon className="h-4 w-4" />
        {meta.label}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {node.type === 'start' && (
          <p className="text-xs text-zinc-500">
            The entry point of the flow. Connect its output to the first step.
          </p>
        )}

        {node.type === 'end' && (
          <p className="text-xs text-zinc-500">Terminates the conversation.</p>
        )}

        {node.type === 'message' && (
          <Field label="Message text">
            <Textarea
              rows={5}
              value={node.data.text}
              onChange={(e) => onChangeData({ text: e.target.value })}
              placeholder="ボットが送信するメッセージ。{{variable}} で変数を埋め込めます。"
            />
          </Field>
        )}

        {node.type === 'question' && (
          <>
            <Field label="Prompt">
              <Textarea
                rows={3}
                value={node.data.prompt}
                onChange={(e) =>
                  onChangeData({ prompt: e.target.value, variable: node.data.variable })
                }
                placeholder="ユーザーへの質問"
              />
            </Field>
            <Field label="Store answer in variable">
              <Input
                value={node.data.variable}
                onChange={(e) =>
                  onChangeData({ prompt: node.data.prompt, variable: e.target.value })
                }
                placeholder="answer"
              />
            </Field>
          </>
        )}

        {node.type === 'ai' && (
          <>
            <Field label="System prompt">
              <Textarea
                rows={5}
                value={node.data.systemPrompt}
                onChange={(e) =>
                  onChangeData({ systemPrompt: e.target.value, model: node.data.model })
                }
                placeholder="AI ノードのふるまいを指示"
              />
            </Field>
            <Field label="Model">
              <Input
                value={node.data.model}
                onChange={(e) =>
                  onChangeData({ systemPrompt: node.data.systemPrompt, model: e.target.value })
                }
                placeholder="gpt-5.4-mini"
              />
            </Field>
          </>
        )}

        {node.type === 'condition' && (
          <>
            <Field label="Branch on variable">
              <Input
                value={node.data.variable}
                onChange={(e) => onChangeData({ variable: e.target.value, cases: node.data.cases })}
                placeholder="answer"
              />
            </Field>
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-600">Cases</span>
              <p className="text-[11px] text-zinc-400">
                Each case is an outgoing branch. Unmatched values fall through the
                <span className="font-mono"> else </span>handle.
              </p>
              {node.data.cases.map((c, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cases are fully controlled inputs; index is acceptable
                <div key={`case-${i}`} className="flex items-center gap-1.5">
                  <Input
                    className="h-8"
                    value={c.value}
                    placeholder="value"
                    onChange={(e) => {
                      const cases = node.data.cases.map((x, xi) =>
                        xi === i ? { ...x, value: e.target.value } : x,
                      )
                      onChangeData({ variable: node.data.variable, cases })
                    }}
                  />
                  <Input
                    className="h-8"
                    value={c.label}
                    placeholder="label"
                    onChange={(e) => {
                      const cases = node.data.cases.map((x, xi) =>
                        xi === i ? { ...x, label: e.target.value } : x,
                      )
                      onChangeData({ variable: node.data.variable, cases })
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Remove case"
                    onClick={() =>
                      onChangeData({
                        variable: node.data.variable,
                        cases: node.data.cases.filter((_, xi) => xi !== i),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChangeData({
                    variable: node.data.variable,
                    cases: [...node.data.cases, { value: '', label: '' }],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add case
              </Button>
            </div>
          </>
        )}
      </div>

      {node.type !== 'start' && (
        <div className="border-t border-zinc-200 p-4">
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete node
          </Button>
        </div>
      )}
    </div>
  )
}
