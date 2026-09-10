import { useState } from 'react'
import { loadConfig, saveConfig } from '../hooks/useGitHub'
import { testConnection } from '../api/github'
import type { GitHubConfig } from '../api/github'

type TestStatus = 'idle' | 'testing' | 'ok' | 'error'

export default function Settings() {
  const existing = loadConfig()
  const [token, setToken] = useState(existing?.token ?? '')
  const [owner, setOwner] = useState(existing?.owner ?? '')
  const [repo, setRepo] = useState(existing?.repo ?? 'meal-planner')
  const [branch, setBranch] = useState(existing?.branch ?? 'main')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testError, setTestError] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const config: GitHubConfig = { token, owner, repo, branch }
    saveConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleTest() {
    const config: GitHubConfig = { token, owner, repo, branch }
    setTestStatus('testing')
    setTestError('')
    try {
      await testConnection(config)
      setTestStatus('ok')
    } catch (e) {
      setTestError(e instanceof Error ? e.message : String(e))
      setTestStatus('error')
    }
  }

  const statusDot = testStatus === 'ok' ? 'ok' : testStatus === 'error' ? 'error' : 'idle'
  const statusText =
    testStatus === 'idle' ? 'Noch nicht getestet' :
    testStatus === 'testing' ? 'Verbinde …' :
    testStatus === 'ok' ? 'Verbindung erfolgreich' :
    testError || 'Verbindung fehlgeschlagen'

  return (
    <>
      <div className="page-header">
        <h1>Einstellungen</h1>
      </div>
      <div className="scroll-content">
        <div className="settings-section">
          <div className="settings-section-title">GitHub Konfiguration</div>
          <div className="settings-card">
            <div className="settings-row">
              <label>Personal Access Token (PAT)</label>
              <input
                className="form-input"
                type="password"
                placeholder="ghp_…"
                value={token}
                onChange={e => setToken(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <div className="settings-row">
              <label>Repository Owner (GitHub-Nutzername)</label>
              <input
                className="form-input"
                placeholder="dein-nutzername"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <div className="settings-row">
              <label>Repository Name</label>
              <input
                className="form-input"
                placeholder="meal-planner"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <div className="settings-row">
              <label>Branch</label>
              <input
                className="form-input"
                placeholder="main"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Verbindung</div>
          <div className="settings-card">
            <div className="status-row">
              <div className={`status-dot ${statusDot}`} />
              <span className="status-text">{statusText}</span>
              <button
                className="btn btn-secondary"
                style={{ flex: 'none', padding: '8px 14px', minHeight: 36 }}
                onClick={handleTest}
                disabled={testStatus === 'testing' || !token || !owner}
              >
                Testen
              </button>
            </div>
          </div>
        </div>

        <div className="sheet-actions" style={{ padding: 0 }}>
          <button
            className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleSave}
            disabled={!token || !owner || !repo || !branch}
          >
            {saved ? '✓ Gespeichert' : 'Einstellungen speichern'}
          </button>
        </div>

        <div style={{ marginTop: 24, padding: '0 4px' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Das Token wird ausschließlich lokal auf deinem Gerät gespeichert und nie in das Repository geschrieben.
            Du benötigst ein PAT mit dem Scope <code style={{ background: 'var(--color-surface-2)', padding: '1px 5px', borderRadius: 4 }}>repo</code> für private Repositories.
          </p>
        </div>
      </div>
    </>
  )
}
