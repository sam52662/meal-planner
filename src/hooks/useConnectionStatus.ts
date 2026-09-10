import { useState, useEffect, useCallback } from 'react'
import { loadConfig } from './useGitHub'
import { testConnection } from '../api/github'

export type ConnectionStatus = 'unknown' | 'checking' | 'connected' | 'error'

let globalStatus: ConnectionStatus = 'unknown'
let listeners: Array<(s: ConnectionStatus) => void> = []

function setGlobal(s: ConnectionStatus) {
  globalStatus = s
  listeners.forEach(l => l(s))
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(globalStatus)

  useEffect(() => {
    listeners.push(setStatus)
    return () => { listeners = listeners.filter(l => l !== setStatus) }
  }, [])

  const check = useCallback(async () => {
    const config = loadConfig()
    if (!config?.token || !config?.owner || !config?.repo) {
      setGlobal('unknown')
      return
    }
    setGlobal('checking')
    try {
      await testConnection(config)
      setGlobal('connected')
    } catch {
      setGlobal('error')
    }
  }, [])

  useEffect(() => {
    if (globalStatus === 'unknown') check()
  }, [check])

  return { status, check }
}
