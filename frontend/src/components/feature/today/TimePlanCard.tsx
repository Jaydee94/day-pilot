import { Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TimeBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

const TYPE_VARIANT: Record<string, 'tonal' | 'secondary' | 'tertiary'> = {
  focus: 'tonal',
  buffer: 'secondary',
  break: 'tertiary',
}

const TYPE_BAR: Record<string, string> = {
  focus: 'bg-primary',
  buffer: 'bg-secondary',
  break: 'bg-tertiary',
}

interface Props {
  timeBlocks: TimeBlock[]
}

export function TimePlanCard({ timeBlocks }: Props): JSX.Element | null {
  const { t } = useI18n()
  if (!timeBlocks || timeBlocks.length === 0) return null

  function typeLabel(type?: string): string {
    if (type === 'focus') return t('timePlanFocus')
    if (type === 'buffer') return t('timePlanBuffer')
    if (type === 'break') return t('timePlanBreak')
    return type ?? ''
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-title-lg">{t('timePlanTitle')}</h2>
        </div>
        <ol aria-label={t('timePlanTitle')} className="space-y-2">
          {timeBlocks.map((block, i) => (
            <li
              key={`${block.start}-${i}`}
              className="grid grid-cols-[6px_auto_1fr_auto] items-center gap-3 rounded-xl bg-surface-container px-4 py-3"
            >
              <span className={cn('h-full w-1.5 rounded-full', TYPE_BAR[block.type ?? 'focus'])} aria-hidden />
              <span className="text-label-lg text-muted-foreground tabular-nums">
                {block.start}–{block.end}
              </span>
              <span className="text-body-md text-foreground truncate">{block.task}</span>
              <Badge variant={TYPE_VARIANT[block.type ?? 'focus'] ?? 'tonal'}>{typeLabel(block.type)}</Badge>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
