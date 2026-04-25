import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types/app'

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
    .order('name')
  if (error) throw error
  return data ?? []
}

// Returns a tree: top-level categories with .children populated
export async function getCategoryTree(): Promise<Category[]> {
  const flat = await getCategories()
  const byId = new Map(flat.map((c) => ({ ...c, children: [] as Category[] })).map((c) => [c.id, c]))

  const roots: Category[] = []
  for (const c of byId.values()) {
    if (c.parent_id) {
      byId.get(c.parent_id)?.children?.push(c)
    } else {
      roots.push(c)
    }
  }
  return roots
}

export async function createCategory(
  category: Omit<Category, 'id' | 'created_at' | 'children'>
): Promise<Category> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'sort_order' | 'parent_id'>>
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = await createClient()
  // Transactions referencing this category are set to NULL via ON DELETE SET NULL
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
