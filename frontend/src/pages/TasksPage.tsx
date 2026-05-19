import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TodosListCard } from '@/components/feature/today/TodosListCard'
import { MemberFilter } from '@/components/feature/calendar/MemberFilter'
import { QuickAddSheet } from '@/components/feature/today/QuickAddSheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { completeTodo, fetchFamilyMembers, fetchTodos } from '@/lib/api'
import type { TodoItem } from '@/lib/types'
import { useI18n } from '@/i18n.jsx'

function classifyBucket(todo: TodoItem): 'today' | 'week' | 'later' | 'done' {
  if (todo.completed) return 'done'
  if (!todo.due) return 'later'
  const due = new Date(todo.due)
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const weekEnd = new Date(todayEnd.getTime() + 7 * 86_400_000)
  if (due <= todayEnd) return 'today'
  if (due <= weekEnd) return 'week'
  return 'later'
}

export default function TasksPage(): JSX.Element {
  const { t } = useI18n()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<string[]>([])
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  useEffect(() => {
    fetchFamilyMembers().then(setMembers).catch(() => setMembers([]))
  }, [])

  async function load(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTodos(selectedMember)
      setTodos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete(id: string): Promise<void> {
    try {
      await completeTodo(id)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember])

  const buckets: Record<'today' | 'week' | 'later' | 'done', TodoItem[]> = {
    today: [],
    week: [],
    later: [],
    done: [],
  }
  todos.forEach(todo => buckets[classifyBucket(todo)].push(todo))

  const SECTIONS: Array<{ key: 'today' | 'week' | 'later' | 'done'; titleKey: string }> = [
    { key: 'today', titleKey: 'tasksBucketToday' },
    { key: 'week', titleKey: 'tasksBucketWeek' },
    { key: 'later', titleKey: 'tasksBucketLater' },
    { key: 'done', titleKey: 'tasksBucketDone' },
  ]

  return (
    <>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-display-sm text-foreground">{t('tasksTitle')}</h1>
          <p className="text-body-lg text-muted-foreground">{t('tasksSubtitle')}</p>
        </header>

        <MemberFilter members={members} selected={selectedMember} onChange={setSelectedMember} />

        {loading && todos.length === 0 && (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}

        {error && <ErrorState message={error} onRetry={load} retryLabel={t('tryAgain')} />}

        {!loading &&
          !error &&
          SECTIONS.map(({ key, titleKey }) => {
            const items = buckets[key]
            if (items.length === 0) return null
            return (
              <section key={key} className="space-y-2">
                <h2 className="text-label-lg uppercase text-muted-foreground">{t(titleKey)}</h2>
                <TodosListCard todos={items} onComplete={handleComplete} />
              </section>
            )
          })}

        {!loading && !error && todos.length === 0 && <TodosListCard todos={[]} />}
      </div>
      <QuickAddSheet defaultTab="task" onSuccess={load} />
    </>
  )
}
