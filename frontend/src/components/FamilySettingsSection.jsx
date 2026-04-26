import { useState, useEffect } from 'react'
import { useI18n } from '../i18n.jsx'
import AppIcon from './AppIcon.jsx'
import { fetchFamilyProfiles, createFamilyMember, updateFamilyMember, deleteFamilyMember } from '../api.js'
import './FamilySettingsSection.css'

function MemberForm({ initial, onSave, onCancel }) {
  const { t } = useI18n()
  const [name, setName] = useState(initial?.name || '')
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : '')
  const [notes, setNotes] = useState(initial?.notes?.length ? initial.notes : [''])

  function addNote() { setNotes([...notes, '']) }
  function removeNote(i) { setNotes(notes.filter((_, idx) => idx !== i)) }
  function setNote(i, val) { setNotes(notes.map((n, idx) => idx === i ? val : n)) }

  function handleSubmit(e) {
    e.preventDefault()
    const cleanNotes = notes.map(n => n.trim()).filter(Boolean)
    onSave({
      name: name.trim(),
      age: age !== '' ? parseInt(age, 10) : null,
      notes: cleanNotes,
    })
  }

  return (
    <form className="family-form" onSubmit={handleSubmit}>
      <label className="family-form__label">
        {t('familyMemberName')} *
        <input
          className="family-form__input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label className="family-form__label">
        {t('familyMemberAge')}
        <input
          className="family-form__input family-form__input--short"
          type="number"
          min="0"
          max="120"
          value={age}
          onChange={e => setAge(e.target.value)}
          placeholder="—"
        />
      </label>
      <div className="family-form__notes-section">
        <span className="family-form__label">{t('familyMemberNotes')}</span>
        <p className="family-form__notes-hint">{t('familyMemberNotesHint')}</p>
        {notes.map((note, i) => (
          <div key={i} className="family-form__note-row">
            <input
              className="family-form__input"
              type="text"
              value={note}
              onChange={e => setNote(i, e.target.value)}
              placeholder={`Notiz ${i + 1}`}
            />
            {notes.length > 1 && (
              <button type="button" className="family-form__remove-note" onClick={() => removeNote(i)}>
                <AppIcon name="close" className="family-form__remove-icon" />
              </button>
            )}
          </div>
        ))}
        <button type="button" className="family-form__add-note btn btn--ghost" onClick={addNote}>
          {t('familyAddNote')}
        </button>
      </div>
      <div className="family-form__actions">
        <button type="submit" className="btn">{t('familySaveMember')}</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('familyCancelEdit')}</button>
      </div>
    </form>
  )
}

function MemberCard({ member, onEdit, onDelete }) {
  const { t } = useI18n()
  return (
    <div className="family-card">
      <div className="family-card__header">
        <span className="family-card__name">{member.name}</span>
        {member.age != null && (
          <span className="family-card__age">{member.age} {t('familyYears')}</span>
        )}
        <div className="family-card__actions">
          <button type="button" className="family-card__btn" onClick={onEdit} title={t('familyEditMember')}>
            <AppIcon name="pencil" className="family-card__icon" />
          </button>
          <button type="button" className="family-card__btn family-card__btn--danger" onClick={onDelete} title={t('familyDeleteMember')}>
            <AppIcon name="trash" className="family-card__icon" />
          </button>
        </div>
      </div>
      {member.notes?.length > 0 && (
        <ul className="family-card__notes">
          {member.notes.map((note, i) => (
            <li key={i} className="family-card__note">{note}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FamilySettingsSection() {
  const { t } = useI18n()
  const [members, setMembers] = useState([])
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  async function load() {
    try {
      const data = await fetchFamilyProfiles()
      setMembers(data)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(data) {
    try {
      await createFamilyMember(data)
      setAdding(false)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleUpdate(id, data) {
    try {
      await updateFamilyMember(id, data)
      setEditingId(null)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteFamilyMember(id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <section className="family-section settings-group">
      <div className="settings-group__header">
        <span className="settings-group__icon">
          <AppIcon name="robot" className="icon" />
        </span>
        <div>
          <h2 className="settings-group__title">{t('familySectionTitle')}</h2>
          <p className="settings-group__desc">{t('familySectionDesc')}</p>
        </div>
      </div>

      {error && <p className="family-section__error">⚠️ {error}</p>}

      <div className="family-section__list">
        {members.length === 0 && !adding && (
          <p className="family-section__empty">{t('familyNoMembers')}</p>
        )}
        {members.map(m => (
          editingId === m.id
            ? <MemberForm
                key={m.id}
                initial={m}
                onSave={data => handleUpdate(m.id, data)}
                onCancel={() => setEditingId(null)}
              />
            : <MemberCard
                key={m.id}
                member={m}
                onEdit={() => { setAdding(false); setEditingId(m.id) }}
                onDelete={() => handleDelete(m.id)}
              />
        ))}
        {adding && (
          <MemberForm
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>

      {!adding && editingId === null && (
        <button
          type="button"
          className="btn family-section__add-btn"
          onClick={() => { setEditingId(null); setAdding(true) }}
        >
          <AppIcon name="plus" className="btn__icon-svg" />
          {t('familyAddMember')}
        </button>
      )}
    </section>
  )
}
