import { Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/i18n.jsx'

/** Strip markdown and FORMAT sections the AI may have leaked into the summary. */
function cleanSummaryText(text: string): string {
  let t = text
  t = t.split(/\n?PRIORITIES:/)[0] ?? ''
  t = t.split(/\n?TIME_BLOCKS:/)[0] ?? ''
  t = t
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
  return t.trim()
}

interface Props {
  text?: string | null
  priorities?: string[]
}

export function AISummaryCard({ text, priorities = [] }: Props): JSX.Element | null {
  const { t } = useI18n()
  if (!text && priorities.length === 0) return null

  const paragraphs = text
    ? cleanSummaryText(text)
        .split(/\n+/)
        .map(l => l.trim())
        .filter(Boolean)
    : []

  return (
    <Card variant="elevated" className="bg-primary-container text-primary-container-foreground border-0">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground">
            <Sparkles className="w-5 h-5" />
          </span>
          <h2 className="text-title-lg">{t('briefingTitle')}</h2>
        </div>
        {paragraphs.length > 0 && (
          <div className="space-y-2 text-body-lg leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={`${i}-${p.slice(0, 16)}`}>{p}</p>
            ))}
          </div>
        )}
        {priorities.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-label-md uppercase opacity-80">{t('topPriorities')}</p>
            <ol className="space-y-2">
              {priorities.map((p, i) => (
                <li key={`${i}-${String(p).slice(0, 16)}`} className="flex items-start gap-3">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-label-md font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-body-md leading-relaxed flex-1">{p}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
