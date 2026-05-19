import { ListTodo } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { TodoItem } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

const PRIORITY_BADGE: Record<number, { label: 'priorityHigh' | 'priorityMedium' | 'priorityLow'; variant: 'error' | 'warning' | 'success' }> = {
  1: { label: 'priorityHigh', variant: 'error' },
  5: { label: 'priorityMedium', variant: 'warning' },
  9: { label: 'priorityLow', variant: 'success' },
}

interface Props {
  todos: TodoItem[]
  onComplete?: (todoId: string) => void
}

export function TodosListCard({ todos, onComplete }: Props): JSX.Element {
  const { t, locale } = useI18n()
  const open = todos.filter(t => !t.completed)
  const done = todos.filter(t => t.completed)

  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-primary" />
          <h2 className="text-title-lg">{t('tasksOpenCount', { count: open.length })}</h2>
        </div>

        {open.length === 0 && done.length === 0 ? (
          <EmptyState icon={ListTodo} title={t('noTasks')} className="py-6" />
        ) : (
          <ul className="space-y-1.5">
            {open.map(item => {
              const prio = item.priority != null ? PRIORITY_BADGE[item.priority] : null
              const due = item.due ? formatDate(item.due, locale, { month: 'short', day: 'numeric' }) : null
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl bg-surface-container px-4 py-2.5 group"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => onComplete?.(item.id)}
                    aria-label={t('completeTask')}
                  />
                  <span className="text-body-md text-foreground flex-1 truncate">{item.title}</span>
                  {item.recurrence && (
                    <span className="text-label-sm text-muted-foreground">{t(`recurrence_${item.recurrence}`)}</span>
                  )}
                  {item.assigned_to && <Badge variant="outline">{item.assigned_to}</Badge>}
                  {due && <span className="text-label-sm text-muted-foreground tabular-nums">{due}</span>}
                  {prio && <Badge variant={prio.variant}>{t(prio.label)}</Badge>}
                </li>
              )
            })}
            {done.map(item => (
              <li
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl bg-surface-container/50 px-4 py-2.5 opacity-60',
                )}
              >
                <Checkbox checked disabled aria-label={t('completeTask')} />
                <span className="text-body-md text-muted-foreground line-through truncate">{item.title}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
