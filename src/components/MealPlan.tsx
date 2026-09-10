import { useState } from 'react'
import type React from 'react'
import { useGitHubFile } from '../hooks/useGitHub'
import { loadGeminiKey } from '../hooks/useGitHub'
import { suggestMeal } from '../api/gemini'
import type { MealPlanData, MealType, DayPlan, InventoryData } from '../types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
}

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '☀️',
  lunch: '🌤️',
  dinner: '🌙',
}

const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const DAY_FULL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getWeekDates(offsetWeeks: number): Date[] {
  const today = new Date()
  const monday = new Date(today)
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(today.getDate() + diff + offsetWeeks * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDate(d: Date): string {
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

interface EditSheetProps {
  mealType: MealType
  current: string
  onSave: (value: string) => void
  onClose: () => void
  onDelete: () => void
}

function EditSheet({ mealType, current, onSave, onClose, onDelete }: EditSheetProps) {
  const [value, setValue] = useState(current)

  function handleSave() {
    onSave(value.trim())
    onClose()
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">{MEAL_ICONS[mealType]} {MEAL_LABELS[mealType]}</div>
        <div className="sheet-body">
          <div className="form-group">
            <label>Was gibt es?</label>
            <input
              className="form-input"
              autoFocus
              placeholder="z.B. Spaghetti Bolognese"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
          {current && (
            <button className="btn btn-danger" onClick={() => { onDelete(); onClose() }}>Löschen</button>
          )}
          <button className="btn btn-primary" onClick={handleSave}>Speichern</button>
        </div>
      </div>
    </div>
  )
}

export default function MealPlan() {
  const { data, setData, status, hasConfig } = useGitHubFile<MealPlanData>('data/meals.json', [])
  const { data: inventory } = useGitHubFile<InventoryData>('data/inventory.json', [])
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState<{ date: string; mealType: MealType } | null>(null)
  const [suggesting, setSuggesting] = useState<string | null>(null) // "date-mealType"
  const [suggestionError, setSuggestionError] = useState<string | null>(null)

  const weekDates = getWeekDates(weekOffset)
  const todayIso = isoDate(new Date())

  function getMeal(date: string, mealType: MealType): string {
    return data.find(d => d.date === date)?.meals.find(m => m.type === mealType)?.name ?? ''
  }

  function countFilledMeals(): number {
    return weekDates.reduce((acc, date) => {
      const iso = isoDate(date)
      return acc + (['breakfast', 'lunch', 'dinner'] as MealType[]).filter(t => getMeal(iso, t)).length
    }, 0)
  }

  function updateMeal(date: string, mealType: MealType, name: string) {
    setData(prev => {
      const days = [...prev]
      const idx = days.findIndex(d => d.date === date)
      if (idx === -1) {
        if (!name) return days
        days.push({ date, meals: [{ type: mealType, name }] })
        return days
      }
      const day: DayPlan = { ...days[idx], meals: [...days[idx].meals] }
      const mIdx = day.meals.findIndex(m => m.type === mealType)
      if (!name) {
        day.meals = day.meals.filter(m => m.type !== mealType)
      } else if (mIdx === -1) {
        day.meals.push({ type: mealType, name })
      } else {
        day.meals[mIdx] = { ...day.meals[mIdx], name }
      }
      days[idx] = day
      return days
    })
  }

  function weekLabel() {
    if (weekOffset === 0) return 'Diese Woche'
    if (weekOffset === 1) return 'Nächste Woche'
    if (weekOffset === -1) return 'Letzte Woche'
    return `${formatDate(weekDates[0])} – ${formatDate(weekDates[6])}`
  }

  const filled = countFilledMeals()
  const total = 21
  const editingMeal = editing ? getMeal(editing.date, editing.mealType) : ''

  const [pendingSuggestion, setPendingSuggestion] = useState<{
    date: string; mealType: MealType; suggestion: string
  } | null>(null)

  async function handleSuggest(date: string, mealType: MealType, e: React.MouseEvent) {
    e.stopPropagation()
    const key = `${date}-${mealType}`
    const geminiKey = loadGeminiKey()
    if (!geminiKey) {
      setSuggestionError('Bitte zuerst den Gemini API-Key in den Einstellungen eintragen.')
      setTimeout(() => setSuggestionError(null), 3000)
      return
    }
    setSuggesting(key)
    setSuggestionError(null)
    try {
      const allMeals = data.flatMap(d => d.meals.map(m => m.name))
      const suggestion = await suggestMeal(geminiKey, mealType, inventory, allMeals)
      setPendingSuggestion({ date, mealType, suggestion })
    } catch (err) {
      setSuggestionError(err instanceof Error ? err.message : 'KI-Fehler')
      setTimeout(() => setSuggestionError(null), 4000)
    } finally {
      setSuggesting(null)
    }
  }

  return (
    <>
      {status === 'saving' && <div className="sync-bar" />}

      <div className="page-header">
        <h1>Wochenplan</h1>
        <p className="subtitle">
          {weekOffset === 0
            ? `${filled} von ${total} Mahlzeiten geplant`
            : weekLabel()}
        </p>
        {!hasConfig && <p className="subtitle" style={{ marginTop: 4, color: 'rgba(255,255,255,0.5)' }}>GitHub in den Einstellungen konfigurieren</p>}
      </div>

      {/* Week navigation as floating pill */}
      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft />
        </button>

        {/* Day strip for current week */}
        <div className="day-strip">
          {weekDates.map(date => {
            const iso = isoDate(date)
            const isToday = iso === todayIso
            return (
              <div key={iso} className={`day-strip-item${isToday ? ' today' : ''}`}>
                <span className="day-strip-label">{DAY_SHORT[date.getDay()]}</span>
                <span className="day-strip-num">{date.getDate()}</span>
              </div>
            )
          })}
        </div>

        <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)}>
          <ChevronRight />
        </button>
      </div>

      {suggestionError && (
        <div className="suggestion-error">{suggestionError}</div>
      )}

      <div className="scroll-content">
        {weekOffset === 0 && (
          <div className="week-progress">
            <div className="week-progress-bar">
              <div className="week-progress-fill" style={{ width: `${(filled / total) * 100}%` }} />
            </div>
            <span className="week-progress-label">{Math.round((filled / total) * 100)}% geplant</span>
          </div>
        )}

        {weekDates.map(date => {
          const iso = isoDate(date)
          const isToday = iso === todayIso
          const isPast = iso < todayIso
          return (
            <div key={iso} className={`day-card${isToday ? ' today' : ''}${isPast && !isToday ? ' past' : ''}`}>
              <div className="day-header">
                <div className="day-header-left">
                  {isToday && <span className="today-badge">Heute</span>}
                  <span className="day-name">{DAY_FULL[date.getDay()]}</span>
                </div>
                <span className="day-date">{formatDate(date)}</span>
              </div>
              {(['breakfast', 'lunch', 'dinner'] as MealType[]).map(mealType => {
                const meal = getMeal(iso, mealType)
                return (
                  <div key={mealType} className="meal-row" onClick={() => setEditing({ date: iso, mealType })}>
                    <div className={`meal-icon-wrap ${mealType}`}>{MEAL_ICONS[mealType]}</div>
                    <div className="meal-info">
                      <div className={`meal-type-label ${mealType}`}>{MEAL_LABELS[mealType]}</div>
                      <div className={`meal-text${meal ? '' : ' empty'}`}>
                        {suggesting === `${iso}-${mealType}` ? 'KI denkt nach …' : meal || 'Tippen zum Eintragen …'}
                      </div>
                    </div>
                    <button
                      className={`suggest-btn${suggesting === `${iso}-${mealType}` ? ' loading' : ''}`}
                      onClick={e => handleSuggest(iso, mealType, e)}
                      disabled={suggesting !== null}
                      title="KI-Vorschlag"
                    >✨</button>
                    {meal
                      ? <span className="meal-filled-dot" />
                      : <ChevronRight className="meal-chevron" />
                    }
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {editing && (
        <EditSheet
          mealType={editing.mealType}
          current={editingMeal}
          onSave={val => updateMeal(editing.date, editing.mealType, val)}
          onDelete={() => updateMeal(editing.date, editing.mealType, '')}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingSuggestion && (
        <div className="sheet-overlay" onClick={() => setPendingSuggestion(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">✨ KI-Vorschlag</div>
            <div className="sheet-body">
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  {MEAL_LABELS[pendingSuggestion.mealType]}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {pendingSuggestion.suggestion}
                </div>
              </div>
            </div>
            <div className="sheet-actions">
              <button className="btn btn-secondary" onClick={() => setPendingSuggestion(null)}>Ablehnen</button>
              <button className="btn btn-primary" onClick={() => {
                updateMeal(pendingSuggestion.date, pendingSuggestion.mealType, pendingSuggestion.suggestion)
                setPendingSuggestion(null)
              }}>Übernehmen</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
