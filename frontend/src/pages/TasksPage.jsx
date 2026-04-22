import TodoList from '../components/TodoList.jsx'
import { useI18n } from '../i18n.jsx'
import './Page.css'

export default function TasksPage({ todos }) {
  const { t } = useI18n()

  return (
    <div className="page">
      <h2 className="page__title">{t('tasksTitle')}</h2>
      <p className="page__subtitle">{t('tasksSubtitle')}</p>
      <TodoList todos={todos} />
    </div>
  )
}
