import React, { useState, useRef } from 'react'
import { useGitHubFile } from '../hooks/useGitHub'
import type { InventoryData, InventoryItem, StorageType } from '../types'

const EMOJI_SUGGESTIONS = ['🥩', '🍗', '🥦', '🧀', '🥚', '🐟', '🍕', '🥕', '🌽', '🫐', '🥛', '🧈', '🍦', '🥗', '🥐', '🫒', '🍅', '🧄', '🧅', '🌶️']
const UNITS = ['Stück', 'g', 'kg', 'ml', 'L', 'Pkg.', 'Dose', 'Beutel', 'Portion']

function daysUntil(isoDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(isoDate)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

interface AddItemSheetProps {
  initialStorage: StorageType
  onAdd: (item: Omit<InventoryItem, 'id'>) => void
  onClose: () => void
}

function AddItemSheet({ initialStorage, onAdd, onClose }: AddItemSheetProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🥩')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('Stück')
  const [storage, setStorage] = useState<StorageType>(initialStorage)
  const [expiresAt, setExpiresAt] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    onAdd({
      name: name.trim(),
      emoji,
      quantity: parseFloat(quantity) || 1,
      unit,
      storage,
      expiresAt: expiresAt || undefined,
    })
    onClose()
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">Artikel hinzufügen</div>
        <div className="sheet-body">
          <div className="form-group">
            <label>Emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    fontSize: 24,
                    width: 40,
                    height: 40,
                    border: `2px solid ${emoji === e ? 'var(--color-accent)' : 'transparent'}`,
                    borderRadius: 10,
                    background: emoji === e ? 'var(--color-accent-light)' : 'var(--color-surface-2)',
                    cursor: 'pointer',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Name</label>
            <input
              className="form-input"
              placeholder="z.B. Hähnchenbrust"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Menge</label>
              <input
                className="form-input"
                type="number"
                inputMode="decimal"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Einheit</label>
              <select
                className="form-input"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Lagerort</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['freezer', 'fridge'] as StorageType[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStorage(s)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: `2px solid ${storage === s ? (s === 'freezer' ? 'var(--color-freezer)' : 'var(--color-fridge)') : 'transparent'}`,
                    borderRadius: 10,
                    background: storage === s
                      ? (s === 'freezer' ? 'var(--color-freezer-light)' : 'var(--color-fridge-light)')
                      : 'var(--color-surface-2)',
                    color: storage === s
                      ? (s === 'freezer' ? 'var(--color-freezer)' : 'var(--color-fridge)')
                      : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    fontFamily: 'var(--font)',
                  }}
                >
                  {s === 'freezer' ? '❄️ Tiefkühler' : '🌡️ Kühlschrank'}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Ablaufdatum (optional)</label>
            <input
              className="form-input"
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!name.trim()}>
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ item, onDelete }: { item: InventoryItem; onDelete: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const touchStart = useRef<number>(0)

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = touchStart.current - e.changedTouches[0].clientX
    if (dx > 60) setRevealed(true)
    if (dx < -30) setRevealed(false)
  }

  let badge: React.ReactNode = null
  if (item.expiresAt) {
    const days = daysUntil(item.expiresAt)
    if (days < 0) {
      badge = <span className="item-badge">Abgelaufen</span>
    } else if (days <= 3) {
      badge = <span className="item-badge warning">Noch {days}d</span>
    }
  }

  return (
    <div
      className={`inventory-item${revealed ? ' reveal' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => revealed && setRevealed(false)}
    >
      <div className="item-icon">{item.emoji}</div>
      <div className="item-info">
        <div className="item-name">{item.name}</div>
        <div className="item-meta">
          {item.quantity} {item.unit}
          {item.expiresAt && ` · MHD ${new Date(item.expiresAt).toLocaleDateString('de-DE')}`}
        </div>
      </div>
      {badge}
      <button className="delete-btn" onClick={e => { e.stopPropagation(); onDelete() }}>
        Löschen
      </button>
    </div>
  )
}

export default function Inventory() {
  const { data, setData, status, hasConfig } = useGitHubFile<InventoryData>('data/inventory.json', [])
  const [showSheet, setShowSheet] = useState(false)
  const [defaultStorage, setDefaultStorage] = useState<StorageType>('freezer')

  function addItem(item: Omit<InventoryItem, 'id'>) {
    const newItem: InventoryItem = { ...item, id: crypto.randomUUID() }
    setData(prev => [...prev, newItem])
  }

  function deleteItem(id: string) {
    setData(prev => prev.filter(i => i.id !== id))
  }

  const freezerItems = data.filter(i => i.storage === 'freezer')
  const fridgeItems = data.filter(i => i.storage === 'fridge')

  return (
    <>
      {status === 'saving' && <div className="sync-bar" />}
      <div className="page-header">
        <h1>Vorräte</h1>
        {!hasConfig && (
          <p className="subtitle">Bitte zuerst GitHub in den Einstellungen konfigurieren</p>
        )}
      </div>

      <div className="scroll-content">
        <div className="section-header">
          <div className="section-title">
            <div className="section-dot freezer" />
            Tiefkühler
          </div>
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {freezerItems.length} Artikel
          </span>
        </div>
        <div className="card">
          {freezerItems.length === 0 ? (
            <div className="card-row" style={{ cursor: 'default', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              Keine Artikel
            </div>
          ) : (
            freezerItems.map(item => (
              <ItemRow key={item.id} item={item} onDelete={() => deleteItem(item.id)} />
            ))
          )}
        </div>

        <div className="section-header">
          <div className="section-title">
            <div className="section-dot fridge" />
            Kühlschrank
          </div>
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {fridgeItems.length} Artikel
          </span>
        </div>
        <div className="card">
          {fridgeItems.length === 0 ? (
            <div className="card-row" style={{ cursor: 'default', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              Keine Artikel
            </div>
          ) : (
            fridgeItems.map(item => (
              <ItemRow key={item.id} item={item} onDelete={() => deleteItem(item.id)} />
            ))
          )}
        </div>
      </div>

      <button
        className="fab"
        onClick={() => { setDefaultStorage('freezer'); setShowSheet(true) }}
      >
        <PlusIcon />
      </button>

      {showSheet && (
        <AddItemSheet
          initialStorage={defaultStorage}
          onAdd={addItem}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
