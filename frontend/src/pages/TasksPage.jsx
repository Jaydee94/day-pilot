import TodoList from '../components/TodoList.jsx'
import './Page.css'

export default function TasksPage({ todos }) {
  return (
    <div className="page">
      <h2 className="page__title">Tasks</h2>
      <p className="page__subtitle">Your open and completed tasks</p>
      <TodoList todos={todos} />
    </div>
  )
}
