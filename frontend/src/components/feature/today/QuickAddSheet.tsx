import { useEffect, useState } from 'react'
import { Calendar, ListTodo, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createEvent, createTodo, fetchFamilyMembers } from '@/lib/api'
import { useI18n } from '@/i18n.jsx'

type Tab = 'event' | 'task'

function toLocalDateTimeInput(date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

interface Props {
  onSuccess?: () => void
  defaultTab?: Tab
}

/**
 * Floating Action Button that opens a bottom sheet (mobile) / center dialog
 * (handled by Sheet primitive) with two tabs: Event and Task.
 */
export function QuickAddSheet({ onSuccess, defaultTab = 'event' }: Props): JSX.Element {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [members, setMembers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Event form
  const [eventTitle, setEventTitle] = useState('')
  const [eventStart, setEventStart] = useState(toLocalDateTimeInput())
  const [eventEnd, setEventEnd] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventAssignedTo, setEventAssignedTo] = useState('')

  // Task form
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskRecurrence, setTaskRecurrence] = useState('')
  const [taskAssignedTo, setTaskAssignedTo] = useState('')

  useEffect(() => {
    if (!open) return
    fetchFamilyMembers().then(setMembers).catch(() => setMembers([]))
  }, [open])

  function resetForms(): void {
    setEventTitle('')
    setEventStart(toLocalDateTimeInput())
    setEventEnd('')
    setEventLocation('')
    setEventAssignedTo('')
    setTaskTitle('')
    setTaskDue('')
    setTaskRecurrence('')
    setTaskAssignedTo('')
    setTab(defaultTab)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (tab === 'event') {
        if (eventEnd && new Date(eventEnd) <= new Date(eventStart)) {
          throw new Error(t('endBeforeStartError'))
        }
        await createEvent({
          title: eventTitle,
          start: new Date(eventStart).toISOString(),
          ...(eventEnd ? { end: new Date(eventEnd).toISOString() } : {}),
          ...(eventLocation ? { location: eventLocation } : {}),
          ...(eventAssignedTo ? { assigned_to: eventAssignedTo } : {}),
        })
        toast.success(t('addedSuccess', { type: t('event') }))
      } else {
        await createTodo({
          title: taskTitle,
          ...(taskDue ? { due: new Date(taskDue).toISOString() } : {}),
          ...(taskRecurrence ? { recurrence: taskRecurrence as 'daily' | 'weekly' | 'monthly' } : {}),
          ...(taskAssignedTo ? { assigned_to: taskAssignedTo } : {}),
        })
        toast.success(t('addedSuccess', { type: t('task') }))
      }
      resetForms()
      setOpen(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="fab"
          size="fab"
          aria-label={t('quickAdd')}
          title={t('quickAdd')}
          className="fixed right-4 z-30 bottom-[88px] md:bottom-6 [&_svg]:size-6"
        >
          <Plus />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-w-lg sm:mx-auto sm:left-1/2 sm:-translate-x-1/2">
        <SheetHeader>
          <SheetTitle>{t('quickAdd')}</SheetTitle>
          <SheetDescription>{t('appTagline')}</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="mt-4">
          <TabsList>
            <TabsTrigger value="event" className="gap-2">
              <Calendar className="w-4 h-4" /> {t('event')}
            </TabsTrigger>
            <TabsTrigger value="task" className="gap-2">
              <ListTodo className="w-4 h-4" /> {t('task')}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="pt-2 space-y-4">
            <TabsContent value="event" className="space-y-3 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="qa-event-title">{t('title')} *</Label>
                <Input id="qa-event-title" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qa-event-start">{t('start')} *</Label>
                  <Input
                    id="qa-event-start"
                    type="datetime-local"
                    value={eventStart}
                    onChange={e => setEventStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qa-event-end">{t('end')}</Label>
                  <Input id="qa-event-end" type="datetime-local" value={eventEnd} min={eventStart} onChange={e => setEventEnd(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-event-loc">{t('location')}</Label>
                <Input id="qa-event-loc" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
              </div>
              {members.length > 0 && (
                <div className="space-y-1.5">
                  <Label>{t('assignTo')}</Label>
                  <Select value={eventAssignedTo} onValueChange={setEventAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="task" className="space-y-3 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="qa-task-title">{t('taskLabel')} *</Label>
                <Input id="qa-task-title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-task-due">{t('dueDate')}</Label>
                <Input id="qa-task-due" type="datetime-local" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('recurrenceLabel')}</Label>
                <Select value={taskRecurrence} onValueChange={v => setTaskRecurrence(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('recurrence_none')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('recurrence_none')}</SelectItem>
                    <SelectItem value="daily">{t('recurrence_daily')}</SelectItem>
                    <SelectItem value="weekly">{t('recurrence_weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('recurrence_monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {members.length > 0 && (
                <div className="space-y-1.5">
                  <Label>{t('assignTo')}</Label>
                  <Select value={taskAssignedTo} onValueChange={setTaskAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? t('save') : t('addItem', { type: tab === 'event' ? t('event') : t('task') })}
            </Button>
          </form>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
