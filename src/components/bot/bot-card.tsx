'use client'

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteBotAction, renameBotAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

interface BotCardProps {
  id: string
  name: string
  description: string
  nodeCount: number
}

export function BotCard({ id, name, description, nodeCount }: BotCardProps) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [title, setTitle] = useState(name)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await renameBotAction(id, title)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setRenameOpen(false)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteBotAction(id)
    })
  }

  return (
    <div className="group relative flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/bots/${id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{name}</h3>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Bot actions"
              disabled={pending}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Link href={`/bots/${id}`} className="flex flex-col gap-2">
        <p className="line-clamp-2 min-h-8 text-xs text-zinc-500">
          {description || 'No description'}
        </p>
        <span className="text-xs text-zinc-400">{nodeCount} nodes</span>
      </Link>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename bot</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              aria-label="Bot name"
              autoFocus
            />
            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !title.trim()}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
