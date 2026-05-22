'use client'

import { RotateCcw, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RunResult } from '@/lib/flow/engine'
import { type BotMessage, createSession, type FlowGraph, type FlowSession } from '@/lib/flow/types'
import { cn } from '@/lib/utils'

interface TestPanelProps {
  graph: FlowGraph
}

type Phase = 'idle' | 'running' | 'awaiting-input' | 'ended' | 'error'

/** A transcript entry with a stable key for rendering. */
interface Turn extends BotMessage {
  id: string
}

function turn(message: BotMessage): Turn {
  return { ...message, id: crypto.randomUUID() }
}

/** Interactive widget that runs a flow graph against the /api/bot/run endpoint. */
export function TestPanel({ graph }: TestPanelProps) {
  const [session, setSession] = useState<FlowSession>(createSession)
  const [transcript, setTranscript] = useState<Turn[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoStartedRef = useRef(false)

  const step = useCallback(
    async (currentSession: FlowSession, userInput: string | null) => {
      setPhase('running')
      setError(null)
      try {
        const res = await fetch('/api/bot/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graph, session: currentSession, input: userInput }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          setError(data.error ?? `Request failed (${res.status})`)
          setPhase('error')
          return
        }
        const result = (await res.json()) as RunResult
        setSession(result.session)
        setTranscript((prev) => [...prev, ...result.messages.map(turn)])
        if (result.status === 'error') {
          setError(result.error ?? 'Flow error')
          setPhase('error')
        } else {
          setPhase(result.status)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error')
        setPhase('error')
      }
    },
    [graph],
  )

  const restart = useCallback(() => {
    const fresh = createSession()
    setSession(fresh)
    setTranscript([])
    setInput('')
    void step(fresh, null)
  }, [step])

  // Auto-start the run on mount. A ref guard keeps it idempotent so React
  // StrictMode's deliberate double-invoke (dev) doesn't run the flow twice.
  useEffect(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    restart()
  }, [restart])

  // biome-ignore lint/correctness/useExhaustiveDependencies: transcript length is an intentional scroll trigger
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [transcript.length])

  const sendUserInput = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || phase !== 'awaiting-input') return
    setTranscript((prev) => [...prev, turn({ role: 'user', text })])
    setInput('')
    void step(session, text)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
        <span className="text-sm font-semibold">Test run</span>
        <Button type="button" variant="ghost" size="sm" onClick={restart}>
          <RotateCcw className="h-3.5 w-3.5" />
          Restart
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {transcript.length === 0 && phase === 'running' ? (
          <p className="text-center text-xs text-zinc-400">Starting…</p>
        ) : null}
        {transcript.map((m) => (
          <div
            key={m.id}
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'bg-zinc-900 text-zinc-50'
                  : 'bg-white text-zinc-900 ring-1 ring-zinc-200',
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {phase === 'running' && transcript.length > 0 ? (
          <p className="text-xs text-zinc-400">…</p>
        ) : null}
        {phase === 'ended' ? (
          <p className="text-center text-xs text-zinc-400">— conversation ended —</p>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={sendUserInput}
        className="flex items-center gap-2 border-t border-zinc-200 p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={phase === 'awaiting-input' ? 'Type a reply…' : 'Waiting…'}
          aria-label="Test message"
          disabled={phase !== 'awaiting-input'}
        />
        <Button type="submit" size="icon" disabled={phase !== 'awaiting-input' || !input.trim()}>
          <Send />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}
