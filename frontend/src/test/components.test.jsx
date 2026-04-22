import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
  description: 'sunny',
  icon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png',
  humidity: 50,
  wind_speed: 3.5,
  units: 'metric',
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
    {
      date: '2026-04-24T00:00:00+02:00',
      min_temperature: 10,
      max_temperature: 19,
      icon: 'https://cdn.weatherapi.com/weather/64x64/day/296.png',
      description: 'light rain',
      chance_of_rain: 50,
    },
    {
      date: '2026-04-25T00:00:00+02:00',
      min_temperature: 9,
      max_temperature: 18,
      icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
      description: 'partly cloudy',
      chance_of_rain: 35,
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

const mockBirthdays = [
  { name: 'Max Mustermann', date: '2024-06-01T00:00:00+02:00', age: 30 },
]

const mockSummary = {
  date: '2024-06-01T08:00:00+02:00',
  events: mockEvents,
  todos: mockTodos,
  birthdays: mockBirthdays,
  weather: mockWeather,
  ai_summary: 'Today is going to be a great day!',
  top_priorities: ['Finish report', 'Reply to emails', 'Exercise'],
}

// Helper to wrap components that use react-router hooks
function withRouter(ui) {
  return <MemoryRouter>{ui}</MemoryRouter>
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
    expect(screen.getByText(/sunny/)).toBeInTheDocument()
  })

  it('renders wind speed', () => {
    render(<Weather weather={mockWeather} />)
    expect(screen.getByText(/3.5 m\/s/)).toBeInTheDocument()
  })

  it('renders hourly section for today', () => {
    render(<Weather weather={mockWeather} />)
    expect(screen.getByText(/Today by hour/)).toBeInTheDocument()
    expect(screen.getByText(/11:00/)).toBeInTheDocument()
  })

  it('renders 3-day forecast panel', () => {
    render(<Weather weather={mockWeather} />)
    expect(screen.getByText(/Next 3 days/)).toBeInTheDocument()
    expect(screen.getByText('cloudy')).toBeInTheDocument()
    expect(screen.getByText('light rain')).toBeInTheDocument()
  })
})

// ---- CalendarEvents ----
describe('CalendarEvents', () => {
  it('renders event count in header', () => {
    render(<CalendarEvents events={mockEvents} />)
    expect(screen.getByText(/Events \(2\)/)).toBeInTheDocument()
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
    expect(screen.getByText(/No events today/)).toBeInTheDocument()
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
    expect(screen.getByText(/1 open/)).toBeInTheDocument()
  })

  it('renders task titles', () => {
    render(<TodoList todos={mockTodos} />)
    expect(screen.getByText('Finish report')).toBeInTheDocument()
    expect(screen.getByText('Read emails')).toBeInTheDocument()
  })

  it('shows empty message when no todos', () => {
    render(<TodoList todos={[]} />)
    expect(screen.getByText(/No tasks/)).toBeInTheDocument()
  })

  it('renders priority label for high priority', () => {
    render(<TodoList todos={mockTodos} />)
    expect(screen.getByText('High')).toBeInTheDocument()
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
    expect(screen.getByText(/turns 30/)).toBeInTheDocument()
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
    render(<AISummary text="Today is going to be a great day!" priorities={[]} />)
    expect(screen.getByText('Today is going to be a great day!')).toBeInTheDocument()
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

  it('renders DayPilot Briefing heading', () => {
    render(<AISummary text="Hello" priorities={[]} />)
    expect(screen.getByText(/DayPilot Briefing/i)).toBeInTheDocument()
  })
})

// ---- DailySummary (integration) ----
describe('DailySummary', () => {
  it('renders date', () => {
    render(withRouter(<DailySummary summary={mockSummary} />))
    // Should contain "June" (English month)
    expect(screen.getByText(/June/)).toBeInTheDocument()
  })

  it('renders all sections', () => {
    render(withRouter(<DailySummary summary={mockSummary} />))
    expect(screen.getByText(/DayPilot Briefing/i)).toBeInTheDocument()
    expect(screen.getByText(/Weather/i)).toBeInTheDocument()
    expect(screen.getByText(/Events/i)).toBeInTheDocument()
    expect(screen.getByText(/Tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/Birthdays/i)).toBeInTheDocument()
  })

  it('hides AI section when no summary or priorities', () => {
    const s = { ...mockSummary, ai_summary: null, top_priorities: [] }
    render(withRouter(<DailySummary summary={s} />))
    expect(screen.queryByText(/DayPilot Briefing/i)).not.toBeInTheDocument()
  })

  it('hides birthdays when empty', () => {
    const s = { ...mockSummary, birthdays: [] }
    render(withRouter(<DailySummary summary={s} />))
    expect(screen.queryByText(/Birthdays/i)).not.toBeInTheDocument()
  })
})
