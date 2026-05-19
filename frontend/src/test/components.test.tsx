import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { AISummaryCard } from '../components/feature/today/AISummaryCard'
import { TimePlanCard } from '../components/feature/today/TimePlanCard'
import { TodayDoableCard } from '../components/feature/today/TodayDoableCard'
import { WeatherCard } from '../components/feature/today/WeatherCard'
import { EventsListCard } from '../components/feature/today/EventsListCard'
import { TodosListCard } from '../components/feature/today/TodosListCard'
import { BirthdaysCard } from '../components/feature/today/BirthdaysCard'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { EmptyState } from '../components/feedback/EmptyState'
import { Spinner } from '../components/feedback/Spinner'

// fetch isn't available in jsdom; the BirthdaysCard calls it on mount.
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return { ...actual, fetchBirthdays: vi.fn().mockResolvedValue([]) }
})

const mockWeather = {
  city: 'Berlin',
  temperature: 22,
  feels_like: 20,
  description: 'sunny',
  icon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png',
  humidity: 50,
  wind_speed: 3.5,
  units: 'metric' as const,
  hourly_forecast: [
    {
      time: '2026-04-22T11:00:00+02:00',
      temperature: 21,
      icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
      description: 'partly cloudy',
      chance_of_rain: 20,
    },
  ],
  daily_forecast: [
    {
      date: '2026-04-23T00:00:00+02:00',
      min_temperature: 11,
      max_temperature: 20,
      icon: 'https://cdn.weatherapi.com/weather/64x64/day/119.png',
      description: 'cloudy',
      chance_of_rain: 40,
    },
  ],
}

const mockEvents = [
  {
    id: 'e1',
    title: 'Team Standup',
    start: '2024-06-01T09:00:00+02:00',
    end: '2024-06-01T09:30:00+02:00',
    location: 'Office',
    source: 'google',
  },
  {
    id: 'e2',
    title: 'Lunch',
    start: '2024-06-01T12:00:00+02:00',
    end: '2024-06-01T13:00:00+02:00',
    location: null,
    source: 'apple',
  },
]

const mockTodos = [
  { id: 't1', title: 'Finish report', completed: false, priority: 1, due: null, source: 'google' },
  { id: 't2', title: 'Read emails', completed: true, priority: null, due: null, source: 'google' },
]

const mockBirthdays = [{ name: 'Max Mustermann', date: '2024-06-01T00:00:00+02:00', age: 30 }]

// Wrap with the legacy I18n provider since cards consume `useI18n()`.
import { I18nProvider } from '../i18n.jsx'

function withI18n(ui: React.ReactNode) {
  return <I18nProvider language="en" setLanguage={() => {}}>{ui}</I18nProvider>
}

describe('UI primitives', () => {
  it('Button renders label and applies variant classes', () => {
    render(<Button variant="tonal">Click me</Button>)
    const btn = screen.getByRole('button', { name: 'Click me' })
    expect(btn).toBeInTheDocument()
    expect(btn.className).toMatch(/bg-secondary-container/)
  })

  it('Badge renders text', () => {
    render(<Badge variant="success">Connected</Badge>)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('Spinner has accessible role', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('EmptyState renders title and description', () => {
    render(<EmptyState title="Nothing here" description="add something to start" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText(/add something/)).toBeInTheDocument()
  })
})

describe('Today feature cards', () => {
  it('AISummaryCard renders text and priorities', () => {
    render(
      withI18n(<AISummaryCard text="Today is great." priorities={['Task 1', 'Task 2']} />),
    )
    expect(screen.getByText('Today is great.')).toBeInTheDocument()
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })

  it('AISummaryCard returns null when no text and no priorities', () => {
    const { container } = render(withI18n(<AISummaryCard text={null} priorities={[]} />))
    expect(container).toBeEmptyDOMElement()
  })

  it('WeatherCard renders city and temperature', () => {
    render(withI18n(<WeatherCard weather={mockWeather} />))
    expect(screen.getByText('Berlin')).toBeInTheDocument()
    expect(screen.getByText(/22/)).toBeInTheDocument()
  })

  it('WeatherCard renders unavailable state when no data', () => {
    render(withI18n(<WeatherCard weather={null} />))
    expect(screen.getByText(/unavailable|nicht verfügbar/i)).toBeInTheDocument()
  })

  it('EventsListCard renders event titles', () => {
    render(withI18n(<EventsListCard events={mockEvents} />))
    expect(screen.getByText('Team Standup')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
  })

  it('EventsListCard shows empty state when no events', () => {
    render(withI18n(<EventsListCard events={[]} />))
    expect(screen.getByText(/no events/i)).toBeInTheDocument()
  })

  it('TodosListCard renders open and done tasks', () => {
    render(withI18n(<TodosListCard todos={mockTodos} />))
    expect(screen.getByText('Finish report')).toBeInTheDocument()
    expect(screen.getByText('Read emails')).toBeInTheDocument()
  })

  it('TodayDoableCard renders three suggestions and energy chips', () => {
    render(withI18n(<TodayDoableCard events={mockEvents} todos={mockTodos} weather={mockWeather} />))
    const olItems = screen.getAllByRole('listitem')
    expect(olItems.length).toBeGreaterThanOrEqual(3)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(3)
  })

  it('TimePlanCard returns null when no blocks', () => {
    const { container } = render(withI18n(<TimePlanCard timeBlocks={[]} />))
    expect(container).toBeEmptyDOMElement()
  })

  it('TimePlanCard renders blocks', () => {
    render(
      withI18n(
        <TimePlanCard
          timeBlocks={[
            { start: '09:00', end: '10:00', task: 'Deep work', type: 'focus' },
            { start: '10:00', end: '10:15', task: 'Stretch', type: 'break' },
          ]}
        />,
      ),
    )
    expect(screen.getByText('Deep work')).toBeInTheDocument()
    expect(screen.getByText('Stretch')).toBeInTheDocument()
  })

  it('BirthdaysCard renders today birthdays', () => {
    render(withI18n(<BirthdaysCard todayBirthdays={mockBirthdays} />))
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
  })
})
