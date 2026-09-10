import { useState, useEffect, useCallback, useRef } from 'react'
import { getFile, putFile, type GitHubConfig } from '../api/github'

const CONFIG_KEY = 'gh_config'
const CACHE_PREFIX = 'gh_cache_'

export function loadConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? (JSON.parse(raw) as GitHubConfig) : null
  } catch {
    return null
  }
}

export function saveConfig(config: GitHubConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

function cacheKey(path: string) {
  return CACHE_PREFIX + path
}

interface CacheEntry<T> {
  data: T
  sha: string
  ts: number
}

function readCache<T>(path: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(cacheKey(path))
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null
  } catch {
    return null
  }
}

function writeCache<T>(path: string, data: T, sha: string) {
  localStorage.setItem(cacheKey(path), JSON.stringify({ data, sha, ts: Date.now() }))
}

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'error'

export function useGitHubFile<T>(path: string, defaultData: T) {
  const config = loadConfig()
  const [data, setDataState] = useState<T>(() => readCache<T>(path)?.data ?? defaultData)
  const [sha, setSha] = useState<string | null>(() => readCache<T>(path)?.sha ?? null)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const saveQueue = useRef<T | null>(null)
  const saving = useRef(false)

  const load = useCallback(async () => {
    if (!config) return
    setStatus('loading')
    setError(null)
    try {
      const file = await getFile<T>(config, path)
      setDataState(file.data)
      setSha(file.sha)
      writeCache(path, file.data, file.sha)
      setStatus('idle')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'NOT_FOUND') {
        setStatus('idle')
      } else {
        setError(msg)
        setStatus('error')
      }
    }
  }, [config?.token, config?.owner, config?.repo, config?.branch, path])

  useEffect(() => {
    load()
  }, [load])

  const flush = useCallback(async (next: T, currentSha: string | null) => {
    if (!config) return
    saving.current = true
    setStatus('saving')
    try {
      const newSha = await putFile(config, path, next, currentSha, `update ${path}`)
      setSha(newSha)
      writeCache(path, next, newSha)
      setStatus('idle')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStatus('error')
    } finally {
      saving.current = false
      if (saveQueue.current !== null) {
        const queued = saveQueue.current
        saveQueue.current = null
        setSha(prev => {
          flush(queued, prev)
          return prev
        })
      }
    }
  }, [config?.token, config?.owner, config?.repo, config?.branch, path])

  const shaRef = useRef<string | null>(sha)
  shaRef.current = sha

  const setData = useCallback((updater: T | ((prev: T) => T)) => {
    setDataState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
      if (saving.current) {
        saveQueue.current = next
      } else {
        flush(next, shaRef.current)
      }
      return next
    })
  }, [flush])

  return { data, setData, status, error, reload: load, hasConfig: !!config }
}
