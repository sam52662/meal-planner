import { useState } from 'react'
import './styles/global.css'
import MealPlan from './components/MealPlan'
import Inventory from './components/Inventory'
import Settings from './components/Settings'
import { useConnectionStatus, type ConnectionStatus } from './hooks/useConnectionStatus'

type Tab = 'meals' | 'inventory' | 'settings'

const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  unknown: 'Nicht konfiguriert',
  checking: 'Verbinde …',
  connected: 'Verbunden',
  error: 'Keine Verbindung',
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('meals')
  const { status, check } = useConnectionStatus()

  return (
    <div className="app-shell">
      <div className={`connection-bar ${status}`} onClick={check} style={{ cursor: 'pointer' }}>
        <div className="connection-dot" />
        <span>{CONNECTION_LABELS[status]}</span>
      </div>

      <div className="tab-content">
        {activeTab === 'meals' && <MealPlan />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'settings' && <Settings onSaved={check} />}
      </div>

      <nav className="tab-bar">
        <button
          className={`tab-item${activeTab === 'meals' ? ' active' : ''}`}
          onClick={() => setActiveTab('meals')}
        >
          <CalendarIcon />
          <span className="tab-label">Wochenplan</span>
        </button>
        <button
          className={`tab-item${activeTab === 'inventory' ? ' active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <BoxIcon />
          <span className="tab-label">Vorräte</span>
        </button>
        <button
          className={`tab-item${activeTab === 'settings' ? ' active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <GearIcon />
          <span className="tab-label">Einstellungen</span>
        </button>
      </nav>
      <div className="build-tag">v{__BUILD_TIME__}</div>
      <div className="tab-bar-safe-area" />
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
