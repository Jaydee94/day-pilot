import { useCallback, useEffect, useState } from 'react'
import { Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import {
  addShoppingItem,
  checkShoppingItem,
  clearCheckedShoppingItems,
  deleteShoppingItem,
  fetchShoppingItems,
} from '@/lib/api'
import type { ShoppingItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

type Grouped = Record<string, ShoppingItem[]>

export default function ShoppingPage(): JSX.Element {
  const { t } = useI18n()
  const [grouped, setGrouped] = useState<Grouped>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addName, setAddName] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [addQuantity, setAddQuantity] = useState('')
  const [adding, setAdding] = useState(false)

  const categories = t('shoppingCategories') as unknown as string[]
  const defaultCategory = Array.isArray(categories) ? categories[categories.length - 1]! : 'Other'

  const load = useCallback(async () => {
    try {
      const data = (await fetchShoppingItems()) as unknown as Grouped
      setGrouped(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!addName.trim()) return
    setAdding(true)
    try {
      await addShoppingItem(addName.trim(), addCategory || defaultCategory, addQuantity.trim() || null)
      setAddName('')
      setAddQuantity('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleCheck(id: string): Promise<void> {
    try {
      await checkShoppingItem(id)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await deleteShoppingItem(id)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleClearChecked(): Promise<void> {
    try {
      await clearCheckedShoppingItems()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const totalChecked = Object.values(grouped).flat().filter(i => i.checked).length

  return (
    <div className="space-y-6 pb-40 md:pb-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-container text-primary-container-foreground">
            <ShoppingCart className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-display-sm text-foreground">{t('shoppingTitle')}</h1>
          </div>
        </div>
        {totalChecked > 0 && (
          <Button variant="text" onClick={handleClearChecked} className="gap-2">
            <Trash2 /> {t('shoppingClearChecked')}
          </Button>
        )}
      </header>

      {error && <ErrorState message={error} onRetry={load} retryLabel={t('tryAgain')} />}

      {loading && Object.keys(grouped).length === 0 && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {!loading && !error && Object.keys(grouped).length === 0 && (
        <EmptyState icon={ShoppingCart} title={t('shoppingEmpty')} />
      )}

      {!loading &&
        Object.entries(grouped).map(([category, items]) => (
          <Card key={category} variant="elevated">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-title-lg text-foreground">{category}</h2>
                <span className="text-label-md text-muted-foreground">{items.length}</span>
              </div>
              <ul className="space-y-1">
                {items.map(item => (
                  <li
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 group transition-colors duration-short3',
                      item.checked ? 'opacity-50 bg-surface-container/50' : 'hover:bg-surface-container',
                    )}
                  >
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => handleCheck(item.id)}
                      aria-label={item.checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
                    />
                    <span
                      className={cn(
                        'flex-1 text-body-lg truncate',
                        item.checked && 'line-through text-muted-foreground',
                      )}
                    >
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="text-body-sm text-muted-foreground">{item.quantity}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(item.id)}
                      aria-label={`Delete ${item.name}`}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

      {/* Sticky quick-add bar */}
      <form
        onSubmit={handleAdd}
        className={cn(
          'fixed inset-x-0 z-30 bg-surface-container/95 backdrop-blur-md border-t border-outline-variant pb-safe',
          'bottom-[80px] md:bottom-0 md:left-20',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <Input
            type="text"
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder={t('shoppingAddPlaceholder')}
            required
            className="flex-1"
          />
          <div className="hidden sm:block">
            <Select value={addCategory || defaultCategory} onValueChange={setAddCategory}>
              <SelectTrigger className="w-40 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(categories) &&
                  categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="text"
            value={addQuantity}
            onChange={e => setAddQuantity(e.target.value)}
            placeholder={t('shoppingQuantity')}
            className="hidden sm:block w-28"
          />
          <Button type="submit" disabled={adding} size="icon" aria-label={t('shoppingAdd')}>
            <Plus />
          </Button>
        </div>
      </form>
    </div>
  )
}
