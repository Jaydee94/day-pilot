import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Weather from '../components/Weather.jsx'
import CalendarEvents from '../components/CalendarEvents.jsx'
import TodoList from '../components/TodoList.jsx'
import Birthdays from '../components/Birthdays.jsx'
import AISummary from '../components/AISummary.jsx'
import DailySummary from '../components/DailySummary.jsx'

// ---- helpers ----
const mockWeather = {
  city: 'Berlin',
  temperature: 22,
  feels_like: 20,
  description: 'sonnig',
  icon: '01d',
  humidity: 50,
  wind_speed: 3.5,
  units: 'metric',
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
  { id: 't1', title: 'Report abschließen', completed: false, priority: 1, due: null, source: 'google' },
  { id: 't2', title: 'E-Mails lesen', completed: true, priority: null, due: null, source: 'google' },
]

const mockBirthdays = [
  { name: 'Max Mustermann', date: '2024-06-01T00:00:00+02:00', age: 30 },
]

const mockSummary = {
  date: '2024-06-01T08:00:00+02:00',
  events: mockEvents,
  todos: mockTodos,
  birthdays: mockBirthdays,
  weather: mockWeather,
  ai_summary: 'Heute wird ein toller Tag!',
  top_priorities: ['Report abschließen', 'E-Mails beantworten', 'Sport machen'],
}

// ---- Weather ----
describe('Weather', () => {
  it('renders city name', () => {
    render(<Weather weather={mockWeather} />)
    expect(screen.getByText(/Berlin/)).toBeInTheDocument()
  })

  it('renders temperature', () => {
    render(<Weather weather={mockWeather} />)
    expect(screen.getByText(/22°C/)).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<Weather weather={mockWeather} />)
    expect(screen.getByText(/sonnig/)).toBeInTheDocument()
  })

  it('renders wind speed', () => {
    render(<Weather weather={mockWeather} />)
    expect(screen.getByText(/3.5 m\/s/)).toBeInTheDocument()
  })
})

// ---- CalendarEvents ----
describe('CalendarEvents', () => {
  it('renders event count in header', () => {
    render(<CalendarEvents events={mockEvents} />)
    expect(screen.getByText(/Termine \(2\)/)).toBeInTheDocument()
  })

  it('renders event titles', () => {
    render(<CalendarEvents events={mockEvents} />)
    expect(screen.getByText('Team Standup')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
  })

  it('renders location when present', () => {
    render(<CalendarEvents events={mockEvents} />)
    expect(screen.getByText(/Office/)).toBeInTheDocument()
  })

  it('shows empty message when no events', () => {
    render(<CalendarEvents events={[]} />)
    expect(screen.getByText(/Keine Termine heute/)).toBeInTheDocument()
  })

  it('renders source badges', () => {
    render(<CalendarEvents events={mockEvents} />)
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Apple')).toBeInTheDocument()
  })
})

// ---- TodoList ----
describe('TodoList', () => {
  it('shows open task count', () => {
    render(<TodoList todos={mockTodos} />)
    expect(screen.getByText(/1 offen/)).toBeInTheDocument()
  })

  it('renders task titles', () => {
    render(<TodoList todos={mockTodos} />)
    expect(screen.getByText('Report abschließen')).toBeInTheDocument()
    expect(screen.getByText('E-Mails lesen')).toBeInTheDocument()
  })

  it('shows empty message when no todos', () => {
    render(<TodoList todos={[]} />)
    expect(screen.getByText(/Keine Aufgaben/)).toBeInTheDocument()
  })

  it('renders priority label for high priority', () => {
    render(<TodoList todos={mockTodos} />)
    expect(screen.getByText('Hoch')).toBeInTheDocument()
  })
})

// ---- Birthdays ----
describe('Birthdays', () => {
  it('renders birthday name', () => {
    render(<Birthdays birthdays={mockBirthdays} />)
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
  })

  it('renders age when present', () => {
    render(<Birthdays birthdays={mockBirthdays} />)
    expect(screen.getByText(/wird 30/)).toBeInTheDocument()
  })

  it('renders multiple birthdays', () => {
    const two = [
      ...mockBirthdays,
      { name: 'Anna Schmidt', date: '2024-06-01T00:00:00+02:00', age: null },
    ]
    render(<Birthdays birthdays={two} />)
    expect(screen.getByText('Anna Schmidt')).toBeInTheDocument()
  })
})

// ---- AISummary ----
describe('AISummary', () => {
  it('renders AI text', () => {
    render(<AISummary text="Heute wird ein toller Tag!" priorities={[]} />)
    expect(screen.getByText('Heute wird ein toller Tag!')).toBeInTheDocument()
  })

  it('renders priorities', () => {
    render(<AISummary text="" priorities={['Task 1', 'Task 2', 'Task 3']} />)
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 3')).toBeInTheDocument()
  })

  it('renders priority numbers', () => {
    render(<AISummary text="" priorities={['A', 'B']} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})

// ---- DailySummary (integration) ----
describe('DailySummary', () => {
  it('renders date', () => {
    render(<DailySummary summary={mockSummary} />)
    // Should contain "Juni" (German month)
    expect(screen.getByText(/Juni/)).toBeInTheDocument()
  })

  it('renders all sections', () => {
    render(<DailySummary summary={mockSummary} />)
    expect(screen.getByText(/KI-Zusammenfassung/i)).toBeInTheDocument()
    expect(screen.getByText(/Wetter/i)).toBeInTheDocument()
    expect(screen.getByText(/Termine/i)).toBeInTheDocument()
    expect(screen.getByText(/Aufgaben/i)).toBeInTheDocument()
    expect(screen.getByText(/Geburtstage/i)).toBeInTheDocument()
  })

  it('hides AI section when no summary or priorities', () => {
    const s = { ...mockSummary, ai_summary: null, top_priorities: [] }
    render(<DailySummary summary={s} />)
    expect(screen.queryByText(/KI-Zusammenfassung/i)).not.toBeInTheDocument()
  })

  it('hides birthdays when empty', () => {
    const s = { ...mockSummary, birthdays: [] }
    render(<DailySummary summary={s} />)
    expect(screen.queryByText(/Geburtstage/i)).not.toBeInTheDocument()
  })
})
