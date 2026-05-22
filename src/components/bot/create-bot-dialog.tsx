'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { createBotAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function CreateBotDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New bot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a bot</DialogTitle>
          <DialogDescription>
            Give the bot a name. You will design its conversation flow next.
          </DialogDescription>
        </DialogHeader>
        <form action={createBotAction} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Name</span>
            <Input
              name="name"
              required
              maxLength={80}
              placeholder="e.g. 問い合わせボット"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Description (optional)</span>
            <Textarea
              name="description"
              maxLength={280}
              rows={2}
              placeholder="What is this bot for?"
            />
          </label>
          <div className="flex justify-end">
            <Button type="submit">Create &amp; open editor</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
