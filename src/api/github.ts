export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  branch: string
}

export interface FileContent<T> {
  data: T
  sha: string
}

const BASE = 'https://api.github.com'

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

export async function getFile<T>(config: GitHubConfig, path: string): Promise<FileContent<T>> {
  const { token, owner, repo, branch } = config
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: headers(token) }
  )
  if (res.status === 404) {
    throw new Error('NOT_FOUND')
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }
  const json = await res.json()
  const raw = Uint8Array.from(atob(json.content.replace(/\n/g, '')), c => c.charCodeAt(0))
  const content = JSON.parse(new TextDecoder().decode(raw)) as T
  return { data: content, sha: json.sha as string }
}

export async function putFile<T>(
  config: GitHubConfig,
  path: string,
  data: T,
  sha: string | null,
  message: string
): Promise<string> {
  const { token, owner, repo, branch } = config
  const encoded = new TextEncoder().encode(JSON.stringify(data, null, 2))
  const content = btoa(String.fromCharCode(...encoded))
  const body: Record<string, unknown> = { message, content, branch }
  if (sha) body.sha = sha

  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? `GitHub API error: ${res.status}`)
  }
  const json = await res.json()
  return (json.content as { sha: string }).sha
}

export async function testConnection(config: GitHubConfig): Promise<void> {
  const { token, owner, repo } = config
  const res = await fetch(`${BASE}/repos/${owner}/${repo}`, { headers: headers(token) })
  if (res.status === 401) throw new Error('Ungültiges Token')
  if (res.status === 404) throw new Error('Repository nicht gefunden')
  if (!res.ok) throw new Error(`Fehler: ${res.status}`)
}
