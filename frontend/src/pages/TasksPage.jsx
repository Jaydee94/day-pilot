import { useState, useEffect } from 'react'
import TodoList from '../components/TodoList.jsx'
import QuickAddButton from '../components/QuickAddButton.jsx'
import { fetchTodos, completeTodo, fetchFamilyMembers } from '../api'
import MemberFilter from '../components/MemberFilter.jsx'
import { useI18n } from '../i18n.jsx'
import './Page.css'

/**
 * TasksPage fetches its own todo data from /api/todos.
 * This endpoint never triggers an AI call – it only reads task data.
 */
export default function TasksPage() {
  const { t } = useI18n()
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    fetchFamilyMembers().then(setMembers).catch(() => {})
  }, [])

  async function loadTodos() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTodos(selectedMember)
      setTodos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCompleteTodo(todoId) {
    try {
      await completeTodo(todoId)
      await loadTodos()
    } catch (err) {
      console.error('Failed to complete todo:', err)
    }
  }

  useEffect(() => {
    loadTodos()
  }, [selectedMember])

  return (
    <div className="page">
      <h2 className="page__title">{t('tasksTitle')}</h2>
      <p className="page__subtitle">{t('tasksSubtitle')}</p>
      <MemberFilter members={members} selected={selectedMember} onChange={setSelectedMember} />
      {loading && todos.length === 0 && (
        <div className="loading-state">
          <div className="spinner" />
        </div>
      )}
      {error && (
        <div className="error-state">
          <span>⚠️</span>
          <p>{error}</p>
          <button className="btn" onClick={loadTodos}>{t('tryAgain')}</button>
        </div>
      )}
      {!loading && !error && <TodoList todos={todos} onComplete={handleCompleteTodo} />}
      <QuickAddButton defaultTab="Task" onSuccess={loadTodos} />
    </div>
  )
}
