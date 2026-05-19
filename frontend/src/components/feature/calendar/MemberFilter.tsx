import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

interface Props {
  members: string[]
  selected: string | null
  onChange: (name: string | null) => void
  className?: string
}

/**
 * Material 3 input chip row for filtering lists by family member.
 * Renders nothing if no members are configured.
 */
export function MemberFilter({ members, selected, onChange, className }: Props): JSX.Element | null {
  const { t } = useI18n()
  if (!members || members.length === 0) return null

  return (
    <div role="group" aria-label={t('filterByMember')} className={cn('flex flex-wrap gap-2', className)}>
      <Chip active={selected === null} onClick={() => onChange(null)}>
        {t('allMembers')}
      </Chip>
      {members.map(name => (
        <Chip key={name} active={selected === name} onClick={() => onChange(selected === name ? null : name)}>
          {name}
        </Chip>
      ))}
    </div>
  )
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'state-layer h-9 px-4 rounded-full text-label-md transition-colors duration-short3',
        active
          ? 'bg-secondary-container text-secondary-container-foreground border border-transparent'
          : 'bg-transparent border border-outline text-foreground hover:bg-surface-container',
      )}
    >
      {children}
    </button>
  )
}
