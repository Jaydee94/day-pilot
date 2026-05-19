import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/feedback/EmptyState'
import {
  createFamilyMember,
  deleteFamilyMember,
  fetchFamilyProfiles,
  updateFamilyMember,
} from '@/lib/api'
import type { FamilyMemberProfile } from '@/lib/types'
import { useI18n } from '@/i18n.jsx'

interface MemberFormData {
  name: string
  age: number | null
  notes: string[]
}

interface MemberFormProps {
  initial?: FamilyMemberProfile
  onSave: (data: MemberFormData) => void | Promise<void>
  onCancel: () => void
}

function MemberForm({ initial, onSave, onCancel }: MemberFormProps): JSX.Element {
  const { t } = useI18n()
  const [name, setName] = useState(initial?.name ?? '')
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : '')
  const [notes, setNotes] = useState<string[]>(initial?.notes?.length ? initial.notes : [''])

  function addNote(): void {
    setNotes(prev => [...prev, ''])
  }
  function removeNote(i: number): void {
    setNotes(prev => prev.filter((_, idx) => idx !== i))
  }
  function setNote(i: number, val: string): void {
    setNotes(prev => prev.map((n, idx) => (idx === i ? val : n)))
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const cleanNotes = notes.map(n => n.trim()).filter(Boolean)
    onSave({
      name: name.trim(),
      age: age !== '' ? parseInt(age, 10) : null,
      notes: cleanNotes,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-surface-container p-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="family-name">{t('familyMemberName')} *</Label>
          <Input
            id="family-name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="family-age">{t('familyMemberAge')}</Label>
          <Input
            id="family-age"
            type="number"
            min={0}
            max={120}
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="—"
            className="sm:w-24"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('familyMemberNotes')}</Label>
        <p className="text-body-sm text-muted-foreground">{t('familyMemberNotesHint')}</p>
        <div className="space-y-2">
          {notes.map((note, i) => (
            <div key={`note-${i}`} className="flex gap-2">
              <Input
                value={note}
                onChange={e => setNote(i, e.target.value)}
                placeholder={`Notiz ${i + 1}`}
              />
              {notes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeNote(i)}
                  aria-label={t('familyRemoveNote')}
                >
                  <X />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="text" size="sm" onClick={addNote}>
          {t('familyAddNote')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" variant="filled">
          {t('familySaveMember')}
        </Button>
        <Button type="button" variant="text" onClick={onCancel}>
          {t('familyCancelEdit')}
        </Button>
      </div>
    </form>
  )
}

interface MemberCardProps {
  member: FamilyMemberProfile
  onEdit: () => void
  onDelete: () => void
}

function MemberCard({ member, onEdit, onDelete }: MemberCardProps): JSX.Element {
  const { t } = useI18n()
  return (
    <div className="rounded-2xl bg-surface-container p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-title-md text-foreground">{member.name}</p>
          {member.age != null && (
            <p className="text-body-sm text-muted-foreground">
              {member.age} {t('familyYears')}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={t('familyEditMember')}
            title={t('familyEditMember')}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={t('familyDeleteMember')}
            title={t('familyDeleteMember')}
            className="text-error"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {member.notes?.length > 0 && (
        <ul className="space-y-1 list-disc list-inside text-body-sm text-muted-foreground">
          {member.notes.map((note, i) => (
            <li key={`${member.id}-note-${i}`}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function FamilySettingsSection(): JSX.Element {
  const { t } = useI18n()
  const [members, setMembers] = useState<FamilyMemberProfile[]>([])
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load(): Promise<void> {
    try {
      const data = await fetchFamilyProfiles()
      setMembers(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(data: MemberFormData): Promise<void> {
    try {
      await createFamilyMember({
        name: data.name,
        ...(data.age != null ? { age: data.age } : {}),
        notes: data.notes,
      })
      setAdding(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleUpdate(id: string, data: MemberFormData): Promise<void> {
    try {
      await updateFamilyMember(id, {
        name: data.name,
        age: data.age,
        notes: data.notes,
      })
      setEditingId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await deleteFamilyMember(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground flex-shrink-0">
            <Users className="w-5 h-5" />
          </span>
          <div className="space-y-0.5 min-w-0 flex-1">
            <h2 className="text-title-lg text-foreground">{t('familySectionTitle')}</h2>
            <p className="text-body-sm text-muted-foreground">{t('familySectionDesc')}</p>
          </div>
        </div>

        {error && (
          <p className="text-body-sm text-error-container-foreground bg-error-container rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {members.length === 0 && !adding && (
            <EmptyState
              icon={Users}
              title={t('familyNoMembers')}
              className="py-6"
            />
          )}
          {members.map(m =>
            editingId === m.id ? (
              <MemberForm
                key={m.id}
                initial={m}
                onSave={data => handleUpdate(m.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <MemberCard
                key={m.id}
                member={m}
                onEdit={() => {
                  setAdding(false)
                  setEditingId(m.id)
                }}
                onDelete={() => handleDelete(m.id)}
              />
            ),
          )}
          {adding && (
            <MemberForm
              onSave={handleCreate}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>

        {!adding && editingId === null && (
          <Button
            type="button"
            variant="tonal"
            onClick={() => {
              setEditingId(null)
              setAdding(true)
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('familyAddMember')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
