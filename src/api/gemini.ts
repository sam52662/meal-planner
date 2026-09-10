import type { InventoryItem } from '../types'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'

export interface MealSuggestion {
  name: string
  recipe: string
}

export async function suggestMeal(
  apiKey: string,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  inventory: InventoryItem[],
  existingMeals: string[]
): Promise<MealSuggestion> {
  const mealLabel = mealType === 'breakfast' ? 'Frühstück' : mealType === 'lunch' ? 'Mittagessen' : 'Abendessen'
  const existingPart = existingMeals.filter(Boolean).length > 0
    ? ` Nicht wiederholen: ${existingMeals.filter(Boolean).join(', ')}.` : ''
  const inventoryPart = inventory.length > 0
    ? ` Verfügbare Zutaten: ${inventory.map(i => i.name).join(', ')}.` : ''

  const prompt = `Schlage ein Gericht für ${mealLabel} vor.${existingPart}${inventoryPart}
Antworte NUR mit gültigem JSON ohne Markdown, exakt in diesem Format:
{"name":"Gerichtname (max 4 Wörter, Deutsch)","recipe":"Zutaten und Zubereitung in 3-5 Sätzen auf Deutsch"}`

  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message
    throw new Error(msg ?? `Gemini API Fehler: ${res.status}`)
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
  if (!text) throw new Error('Keine Antwort von der KI')

  const clean = text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()
  try {
    const parsed = JSON.parse(clean) as { name?: string; recipe?: string }
    if (!parsed.name) throw new Error()
    return {
      name: parsed.name.trim().replace(/\.$/, ''),
      recipe: parsed.recipe?.trim() ?? '',
    }
  } catch {
    const name = clean.split('\n')[0].trim().replace(/\.$/, '')
    return { name, recipe: '' }
  }
}

export async function generateShoppingList(
  apiKey: string,
  meals: string[],
  inventory: InventoryItem[]
): Promise<string[]> {
  const mealList = meals.filter(Boolean).join(', ')
  if (!mealList) return []
  const inventoryList = inventory.length > 0 ? ` Bereits vorhanden: ${inventory.map(i => i.name).join(', ')}.` : ''
  const prompt = `Erstelle eine Einkaufsliste für diese Gerichte: ${mealList}.${inventoryList} Liste nur Zutaten die noch nicht vorhanden sind. Antworte NUR mit einem JSON-Array von Strings, z.B. ["Nudeln","Tomaten","Käse"]. Keine Mengenangaben, nur Zutatennamen.`

  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini API Fehler: ${res.status}`)
  const json = await res.json()
  const text = (json?.candidates?.[0]?.content?.parts?.[0]?.text as string ?? '').trim()
  const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()
  try {
    const parsed = JSON.parse(clean)
    if (Array.isArray(parsed)) return parsed.filter((i): i is string => typeof i === 'string')
  } catch {}
  return []
}

export async function checkUsesInventory(
  apiKey: string,
  mealName: string,
  inventory: InventoryItem[]
): Promise<boolean> {
  if (!inventory.length) return false
  const inventoryList = inventory.map(i => i.name).join(', ')
  const prompt = `Gericht: "${mealName}". Vorrat: ${inventoryList}. Werden für dieses Gericht wahrscheinlich Zutaten aus dem Vorrat benötigt? Antworte NUR mit true oder false.`

  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 8 },
    }),
  })
  if (!res.ok) return false
  const json = await res.json()
  const text = (json?.candidates?.[0]?.content?.parts?.[0]?.text as string ?? '').toLowerCase().trim()
  return text.startsWith('true')
}
