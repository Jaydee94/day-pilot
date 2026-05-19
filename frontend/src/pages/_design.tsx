import { Sparkles, Calendar, ListTodo, Cloud, Cake } from 'lucide-react'

/**
 * Internal design-system playground. Not linked from any nav.
 * Reachable at `/_design` while developing — used as a smoke-test that
 * Tailwind + M3 tokens are wired up correctly across light/dark themes.
 *
 * This page will be expanded by Track B (Design System) with every shadcn
 * primitive once the components library is built.
 */
export default function DesignPlayground(): JSX.Element {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-display-sm text-foreground">Design System</h1>
        <p className="text-body-lg text-muted-foreground max-w-2xl">
          Smoke-test of the Tailwind + Material&nbsp;3 token system. Toggle the theme in the
          top-right corner to verify both light and dark palettes resolve correctly.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-headline-sm">Tonal palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'primary', bg: 'bg-primary', fg: 'text-primary-foreground' },
            { name: 'secondary', bg: 'bg-secondary', fg: 'text-secondary-foreground' },
            { name: 'tertiary', bg: 'bg-tertiary', fg: 'text-tertiary-foreground' },
            { name: 'error', bg: 'bg-error', fg: 'text-error-foreground' },
            { name: 'success', bg: 'bg-success', fg: 'text-success-foreground' },
            { name: 'warning', bg: 'bg-warning', fg: 'text-warning-foreground' },
          ].map(c => (
            <div
              key={c.name}
              className={`${c.bg} ${c.fg} rounded-xl h-20 flex items-center justify-center text-label-lg shadow-elev1`}
            >
              {c.name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'primary-container', bg: 'bg-primary-container', fg: 'text-primary-container-foreground' },
            { name: 'secondary-container', bg: 'bg-secondary-container', fg: 'text-secondary-container-foreground' },
            { name: 'tertiary-container', bg: 'bg-tertiary-container', fg: 'text-tertiary-container-foreground' },
            { name: 'error-container', bg: 'bg-error-container', fg: 'text-error-container-foreground' },
            { name: 'success-container', bg: 'bg-success-container', fg: 'text-success-container-foreground' },
            { name: 'warning-container', bg: 'bg-warning-container', fg: 'text-warning-container-foreground' },
          ].map(c => (
            <div
              key={c.name}
              className={`${c.bg} ${c.fg} rounded-xl h-16 flex items-center justify-center text-label-md`}
            >
              {c.name}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline-sm">Surface containers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(
            [
              ['lowest', 'bg-surface-container-lowest'],
              ['low', 'bg-surface-container-low'],
              ['default', 'bg-surface-container'],
              ['high', 'bg-surface-container-high'],
              ['highest', 'bg-surface-container-highest'],
            ] as const
          ).map(([label, cls]) => (
            <div
              key={label}
              className={`${cls} text-foreground rounded-xl h-16 flex items-center justify-center text-label-md border border-outline-variant`}
            >
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline-sm">Typography scale</h2>
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-elev1 space-y-2">
          <p className="text-display-md">Display medium</p>
          <p className="text-headline-md">Headline medium</p>
          <p className="text-title-lg">Title large</p>
          <p className="text-body-lg">Body large — the quick brown fox jumps over the lazy dog.</p>
          <p className="text-body-md text-muted-foreground">Body medium — secondary information.</p>
          <p className="text-label-md text-muted-foreground uppercase">Label medium</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline-sm">Elevation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className={`bg-surface-container rounded-xl h-20 flex items-center justify-center text-label-lg shadow-elev${n}`}
            >
              elev{n}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline-sm">Sample cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'AI Briefing', icon: Sparkles, container: 'bg-primary-container text-primary-container-foreground' },
            { title: 'Calendar', icon: Calendar, container: 'bg-secondary-container text-secondary-container-foreground' },
            { title: 'Tasks', icon: ListTodo, container: 'bg-tertiary-container text-tertiary-container-foreground' },
            { title: 'Weather', icon: Cloud, container: 'bg-surface-container-high text-foreground' },
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
      </section>

      <section className="space-y-3">
        <h2 className="text-headline-sm">Buttons (preview — replaced by shadcn Button in Track B)</h2>
        <div className="flex flex-wrap gap-3">
          <button className="state-layer rounded-full bg-primary text-primary-foreground h-10 px-6 text-label-lg shadow-elev1">
            Filled
          </button>
          <button className="state-layer rounded-full bg-secondary-container text-secondary-container-foreground h-10 px-6 text-label-lg">
            Tonal
          </button>
          <button className="state-layer rounded-full border border-outline text-foreground h-10 px-6 text-label-lg">
            Outlined
          </button>
          <button className="state-layer rounded-full text-primary h-10 px-4 text-label-lg">
            Text
          </button>
          <button className="state-layer rounded-full bg-tertiary-container text-tertiary-container-foreground h-10 px-6 text-label-lg shadow-elev1 inline-flex items-center gap-2">
            <Cake className="w-4 h-4" /> With icon
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline-sm">Skeleton</h2>
        <div className="space-y-3 max-w-md">
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton h-24 w-full" />
        </div>
      </section>
    </div>
  )
}
