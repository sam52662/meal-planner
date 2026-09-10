import { useState } from 'react'
import { useGitHubFile } from '../hooks/useGitHub'
import type { MealPlanData, MealType, DayPlan } from '../types'

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
        <div className="sheet-title">
          {MEAL_ICONS[mealType]} {MEAL_LABELS[mealType]}
        </div>
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
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState<{ date: string; mealType: MealType } | null>(null)

  const weekDates = getWeekDates(weekOffset)
  const todayIso = isoDate(new Date())

  function getMeal(date: string, mealType: MealType): string {
    return data.find(d => d.date === date)?.meals.find(m => m.type === mealType)?.name ?? ''
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

  const editingMeal = editing ? getMeal(editing.date, editing.mealType) : ''

  return (
    <>
      {status === 'saving' && <div className="sync-bar" />}
      <div className="page-header">
        <h1>Wochenplan</h1>
        {!hasConfig && <p className="subtitle">GitHub in den Einstellungen konfigurieren</p>}
      </div>

      <div className="week-nav">
        <button onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft />
        </button>
        <span className="week-label">{weekLabel()}</span>
        <button onClick={() => setWeekOffset(o => o + 1)}>
          <ChevronRight />
        </button>
      </div>

      <div className="scroll-content">
        {weekDates.map(date => {
          const iso = isoDate(date)
          const isToday = iso === todayIso
          return (
            <div key={iso} className={`day-card${isToday ? ' today' : ''}`}>
              <div className="day-header">
                <span className="day-name">{DAY_FULL[date.getDay()]}</span>
                <span className="day-date">{formatDate(date)}</span>
              </div>
              {(['breakfast', 'lunch', 'dinner'] as MealType[]).map(mealType => {
                const meal = getMeal(iso, mealType)
                return (
                  <div
                    key={mealType}
                    className="meal-row"
                    onClick={() => setEditing({ date: iso, mealType })}
                  >
                    <div className={`meal-icon-wrap ${mealType}`}>
                      {MEAL_ICONS[mealType]}
                    </div>
                    <div className="meal-info">
                      <div className={`meal-type-label ${mealType}`}>{MEAL_LABELS[mealType]}</div>
                      <div className={`meal-text${meal ? '' : ' empty'}`}>
                        {meal || 'Tippen zum Eintragen'}
                      </div>
                    </div>
                    <ChevronRight className="meal-chevron" />
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
