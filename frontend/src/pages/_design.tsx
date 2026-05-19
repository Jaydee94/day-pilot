import { useState } from 'react'
import { Cake, Calendar, Cloud, ListTodo, Settings, Sparkles, Trash2 } from 'lucide-react'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Spinner } from '@/components/feedback/Spinner'

/**
 * Design-system playground. Not linked from the navigation.
 * Used as a smoke-test that every shadcn / M3 primitive renders correctly in
 * both light and dark themes.
 */
export default function DesignPlayground(): JSX.Element {
  const [progress] = useState(67)

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-display-sm text-foreground">Design System</h1>
        <p className="text-body-lg text-muted-foreground max-w-2xl">
          Smoke-test of Tailwind + Material&nbsp;3 tokens and the shadcn-based primitives library.
          Toggle the theme top-right to verify both palettes.
        </p>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Filled</Button>
          <Button variant="tonal">Tonal</Button>
          <Button variant="elevated">Elevated</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Settings">
            <Settings />
          </Button>
          <Button variant="fab" size="fab" aria-label="Create">
            <Sparkles />
          </Button>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated</CardTitle>
              <CardDescription>Floating surface with subtle shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body-md text-muted-foreground">Used for most foreground cards.</p>
            </CardContent>
          </Card>
          <Card variant="filled">
            <CardHeader>
              <CardTitle>Filled</CardTitle>
              <CardDescription>Flat surface, no shadow</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body-md text-muted-foreground">For grouping inside scrollers.</p>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Outlined</CardTitle>
              <CardDescription>Background-matched, bordered</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body-md text-muted-foreground">Lowest emphasis card.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="tonal">Tonal</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="tertiary">Tertiary</Badge>
          <Badge variant="success">Connected</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Failed</Badge>
          <Badge variant="outline">Outlined</Badge>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          <div className="space-y-2">
            <Label htmlFor="ex-input">Event title</Label>
            <Input id="ex-input" placeholder="e.g. Family dinner" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-select">Assigned to</Label>
            <Select>
              <SelectTrigger id="ex-select">
                <SelectValue placeholder="Choose a family member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anna">Anna</SelectItem>
                <SelectItem value="ben">Ben</SelectItem>
                <SelectItem value="clara">Clara</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ex-textarea">Notes</Label>
            <Textarea id="ex-textarea" placeholder="Optional notes…" />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="ex-switch" />
            <Label htmlFor="ex-switch">Enable notifications</Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="ex-check" />
            <Label htmlFor="ex-check">Mark as completed</Label>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Priority</Label>
            <RadioGroup defaultValue="medium" className="flex gap-6">
              {(['low', 'medium', 'high'] as const).map(p => (
                <div key={p} className="flex items-center gap-2">
                  <RadioGroupItem value={p} id={`prio-${p}`} />
                  <Label htmlFor={`prio-${p}`}>{p}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="events" className="max-w-xl">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="shopping">Shopping</TabsTrigger>
          </TabsList>
          <TabsContent value="events" className="text-body-md text-muted-foreground">
            Today&apos;s calendar events live here.
          </TabsContent>
          <TabsContent value="todos" className="text-body-md text-muted-foreground">
            Outstanding tasks appear here.
          </TabsContent>
          <TabsContent value="shopping" className="text-body-md text-muted-foreground">
            Shopping list contents preview.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-3">
          <Avatar size="sm" name="Anna" />
          <Avatar size="md" name="Ben Mustermann" color="hsl(var(--secondary-container))" />
          <Avatar size="lg" name="Clara" />
          <Avatar size="xl" name="Dan Doe" />
        </div>
      </Section>

      <Section title="Dialog & Sheet">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="tonal">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete event</DialogTitle>
                <DialogDescription>This action cannot be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="text">Cancel</Button>
                <Button variant="destructive">
                  <Trash2 /> Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outlined">Open bottom sheet</Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Adjust which family members are shown.</SheetDescription>
              </SheetHeader>
              <div className="py-6 text-body-md text-muted-foreground">Bottom-sheet body content.</div>
            </SheetContent>
          </Sheet>

          <Button variant="text" onClick={() => toast.success('Event created', { description: 'See you on Friday at 18:00' })}>
            Show toast
          </Button>
        </div>
      </Section>

      <Section title="Feedback states">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="filled">
            <CardContent className="pt-6">
              <Progress value={progress} className="mb-4" />
              <div className="flex items-center gap-3">
                <Spinner size="sm" />
                <span className="text-body-md text-muted-foreground">Syncing calendars…</span>
              </div>
            </CardContent>
          </Card>
          <EmptyState
            icon={ListTodo}
            title="No tasks yet"
            description="When you add a task it will show up here."
            action={<Button variant="tonal">Add your first task</Button>}
          />
        </div>
        <div className="space-y-3 max-w-md">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Section>

      <Section title="Tonal sample cards">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'AI Briefing', icon: Sparkles, container: 'bg-primary-container text-primary-container-foreground' },
            { title: 'Calendar', icon: Calendar, container: 'bg-secondary-container text-secondary-container-foreground' },
            { title: 'Tasks', icon: ListTodo, container: 'bg-tertiary-container text-tertiary-container-foreground' },
            { title: 'Weather', icon: Cloud, container: 'bg-surface-container-high text-foreground' },
            { title: 'Birthdays', icon: Cake, container: 'bg-warning-container text-warning-container-foreground' },
          ].map(({ title, icon: Icon, container }) => (
            <div
              key={title}
              className={`${container} rounded-2xl p-5 shadow-elev1 transition-transform duration-medium2 ease-emphasized hover:-translate-y-1 hover:shadow-elev3`}
            >
              <Icon className="w-7 h-7 mb-3" />
              <p className="text-title-md">{title}</p>
              <p className="text-body-sm opacity-80 mt-1">Material 3 tonal card example</p>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Typography scale">
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-display-md">Display medium</p>
            <p className="text-headline-md">Headline medium</p>
            <p className="text-title-lg">Title large</p>
            <p className="text-body-lg">Body large — the quick brown fox jumps over the lazy dog.</p>
            <p className="text-body-md text-muted-foreground">Body medium — secondary information.</p>
            <p className="text-label-md text-muted-foreground uppercase">Label medium</p>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="text-headline-sm">{title}</h2>
      {children}
    </section>
  )
}
