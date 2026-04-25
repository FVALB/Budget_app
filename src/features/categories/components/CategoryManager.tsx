'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Category } from '@/types/app'

interface Props {
  initialCategories: Category[]
}

interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[]
}

function buildTree(flat: Category[]): CategoryWithChildren[] {
  const map = new Map<string, CategoryWithChildren>(
    flat.map((c) => [c.id, { ...c, children: [] }])
  )
  const roots: CategoryWithChildren[] = []
  for (const c of map.values()) {
    if (c.parent_id) {
      map.get(c.parent_id)?.children.push(c)
    } else {
      roots.push(c)
    }
  }
  return roots
}

interface EditingState {
  id: string
  field: 'name' | 'color'
  value: string
}

interface AddingState {
  parent_id: string | null
  name: string
  color: string
}

export function CategoryManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [adding, setAdding] = useState<AddingState | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const tree = buildTree(categories)

  async function saveEdit() {
    if (!editing) return
    setLoading(editing.id)
    const res = await fetch(`/api/categories/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [editing.field]: editing.value }),
    })
    setLoading(null)
    if (!res.ok) { toast.error('Failed to save'); return }

    setCategories((prev) =>
      prev.map((c) => c.id === editing.id ? { ...c, [editing.field]: editing.value } : c)
    )
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Transactions will become uncategorized.')) return
    setLoading(id)
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setLoading(null)
    if (!res.ok) { toast.error('Failed to delete'); return }
    setCategories((prev) => prev.filter((c) => c.id !== id))
    toast.success('Category deleted')
  }

  async function handleAdd() {
    if (!adding || !adding.name.trim()) return
    setLoading('add')
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: adding.name.trim(),
        color: adding.color,
        parent_id: adding.parent_id,
      }),
    })
    setLoading(null)
    if (!res.ok) { toast.error('Failed to create category'); return }
    const created = await res.json()
    setCategories((prev) => [...prev, created])
    setAdding(null)
    toast.success('Category created')
  }

  function renderCategory(cat: CategoryWithChildren, depth = 0) {
    const isEditingName = editing?.id === cat.id && editing.field === 'name'
    const isEditingColor = editing?.id === cat.id && editing.field === 'color'
    const isLoading = loading === cat.id

    return (
      <div key={cat.id}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 group hover:bg-muted/40',
            depth > 0 && 'ml-6 border-l border-border pl-4'
          )}
        >
          {/* Color picker */}
          <div className="relative shrink-0">
            <span
              className="h-3 w-3 rounded-full block cursor-pointer ring-offset-1 hover:ring-2 ring-muted-foreground"
              style={{ backgroundColor: isEditingColor ? editing!.value : cat.color }}
              onClick={() => setEditing({ id: cat.id, field: 'color', value: cat.color })}
            />
            {isEditingColor && (
              <input
                type="color"
                className="absolute inset-0 opacity-0 cursor-pointer w-3 h-3"
                value={editing!.value}
                onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
                onBlur={saveEdit}
              />
            )}
          </div>

          {/* Name */}
          {isEditingName ? (
            <Input
              className="h-7 py-0 text-sm flex-1"
              value={editing!.value}
              autoFocus
              onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') setEditing(null)
              }}
            />
          ) : (
            <span
              className="text-sm flex-1 cursor-pointer hover:underline decoration-dotted"
              onDoubleClick={() => setEditing({ id: cat.id, field: 'name', value: cat.name })}
            >
              {cat.name}
            </span>
          )}

          {/* Actions (visible on hover) */}
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              className="text-xs text-muted-foreground hover:text-foreground px-1"
              onClick={() => setEditing({ id: cat.id, field: 'name', value: cat.name })}
              title="Rename"
            >
              ✏️
            </button>
            {depth === 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground px-1"
                onClick={() => setAdding({ parent_id: cat.id, name: '', color: cat.color })}
                title="Add subcategory"
              >
                +sub
              </button>
            )}
            <button
              className="text-xs text-muted-foreground hover:text-destructive px-1"
              onClick={() => handleDelete(cat.id)}
              disabled={isLoading}
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Inline add subcategory form */}
        {adding?.parent_id === cat.id && (
          <div className="ml-6 border-l border-border pl-4 pr-3 py-1 flex items-center gap-2">
            <input
              type="color"
              className="h-6 w-6 rounded cursor-pointer border-0 p-0"
              value={adding.color}
              onChange={(e) => setAdding({ ...adding, color: e.target.value })}
            />
            <Input
              className="h-7 py-0 text-sm flex-1"
              placeholder="Subcategory name…"
              value={adding.name}
              autoFocus
              onChange={(e) => setAdding({ ...adding, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') setAdding(null)
              }}
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAdd} disabled={loading === 'add'}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdding(null)}>
              Cancel
            </Button>
          </div>
        )}

        {cat.children.map((child) => renderCategory(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tree.map((cat) => renderCategory(cat))}

      {/* Add top-level category form */}
      {adding?.parent_id === null ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            type="color"
            className="h-6 w-6 rounded cursor-pointer border-0 p-0 shrink-0"
            value={adding.color}
            onChange={(e) => setAdding({ ...adding, color: e.target.value })}
          />
          <Input
            className="h-7 py-0 text-sm flex-1"
            placeholder="Category name…"
            value={adding.name}
            autoFocus
            onChange={(e) => setAdding({ ...adding, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') setAdding(null)
            }}
          />
          <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAdd} disabled={loading === 'add'}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdding(null)}>
            Cancel
          </Button>
        </div>
      ) : (
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground w-full rounded-lg hover:bg-muted/40"
          onClick={() => setAdding({ parent_id: null, name: '', color: '#64748B' })}
        >
          <span className="text-base leading-none">+</span>
          Add category
        </button>
      )}
    </div>
  )
}
