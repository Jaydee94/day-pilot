import { useI18n } from '../i18n.jsx'
import './MemberFilter.css'

/** @param {{ members: string[], selected: string|null, onChange: (name: string|null) => void }} props */
export default function MemberFilter({ members, selected, onChange }) {
  const { t } = useI18n()
  if (!members || members.length === 0) return null

  return (
    <div className="member-filter" role="group" aria-label={t('filterByMember')}>
      <button
        type="button"
        className={`member-filter__chip${selected === null ? ' member-filter__chip--active' : ''}`}
        onClick={() => onChange(null)}
      >
        {t('allMembers')}
      </button>
      {members.map(name => (
        <button
          key={name}
          type="button"
          className={`member-filter__chip${selected === name ? ' member-filter__chip--active' : ''}`}
          onClick={() => onChange(selected === name ? null : name)}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
