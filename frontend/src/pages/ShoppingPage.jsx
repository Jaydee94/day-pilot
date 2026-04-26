import { useState, useEffect, useCallback } from 'react'
import AppIcon from '../components/AppIcon.jsx'
import { useI18n } from '../i18n.jsx'
import {
  fetchShoppingItems,
  addShoppingItem,
  checkShoppingItem,
  deleteShoppingItem,
  clearCheckedShoppingItems,
} from '../api.js'
import './ShoppingPage.css'

export default function ShoppingPage() {
  const { t } = useI18n()
  const [grouped, setGrouped] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Quick-add form state
  const [addName, setAddName] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [addQuantity, setAddQuantity] = useState('')
  const [adding, setAdding] = useState(false)

  const categories = t('shoppingCategories')
  const defaultCategory = Array.isArray(categories) ? categories[categories.length - 1] : 'Other'

  const load = useCallback(async () => {
    try {
      const data = await fetchShoppingItems()
      setGrouped(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!addName.trim()) return
    setAdding(true)
    try {
      await addShoppingItem(addName.trim(), addCategory || defaultCategory, addQuantity.trim() || null)
      setAddName('')
      setAddQuantity('')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleCheck(id) {
    try {
      await checkShoppingItem(id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteShoppingItem(id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleClearChecked() {
    try {
      await clearCheckedShoppingItems()
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  const totalChecked = Object.values(grouped).flat().filter(i => i.checked).length

  return (
    <div className="shopping-page page-content">
      <div className="shopping-header">
        <h1 className="page-title">
          <AppIcon name="shoppingCart" className="page-title__icon" />
          {t('shoppingTitle')}
        </h1>
        {totalChecked > 0 && (
          <button className="shopping-clear-btn btn btn--ghost" onClick={handleClearChecked}>
            {t('shoppingClearChecked')}
          </button>
        )}
      </div>

      {error && <p className="shopping-error">⚠️ {error}</p>}

      {/* Quick-add form */}
      <form className="shopping-add-form card" onSubmit={handleAdd}>
        <input
          className="shopping-add-form__input"
          type="text"
          value={addName}
          onChange={e => setAddName(e.target.value)}
          placeholder={t('shoppingAddPlaceholder')}
          required
        />
        <select
          className="shopping-add-form__select"
          value={addCategory}
          onChange={e => setAddCategory(e.target.value)}
        >
          {Array.isArray(categories) && categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          className="shopping-add-form__qty"
          type="text"
          value={addQuantity}
          onChange={e => setAddQuantity(e.target.value)}
          placeholder={t('shoppingQuantity')}
        />
        <button className="shopping-add-form__btn btn" type="submit" disabled={adding}>
          <AppIcon name="plus" className="shopping-add-form__btn-icon" />
          {t('shoppingAdd')}
        </button>
      </form>

      {/* Item list */}
      {loading ? (
        <p className="shopping-loading">{t('loading')}</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="shopping-empty">{t('shoppingEmpty')}</p>
      ) : (
        <div className="shopping-groups">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="shopping-group card">
              <h2 className="shopping-group__title">{category}</h2>
              <ul className="shopping-group__list">
                {items.map(item => (
                  <li key={item.id} className={`shopping-item${item.checked ? ' shopping-item--checked' : ''}`}>
                    <button
                      type="button"
                      className={`shopping-item__checkbox${item.checked ? ' shopping-item__checkbox--checked' : ''}`}
                      onClick={() => handleCheck(item.id)}
                      aria-label={item.checked ? 'uncheck' : 'check'}
                    >
                      {item.checked && '✓'}
                    </button>
                    <span className="shopping-item__name">{item.name}</span>
                    {item.quantity && (
                      <span className="shopping-item__qty">{item.quantity}</span>
                    )}
                    <button
                      type="button"
                      className="shopping-item__delete"
                      onClick={() => handleDelete(item.id)}
                      aria-label="delete"
                    >
                      <AppIcon name="trash" className="shopping-item__delete-icon" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
