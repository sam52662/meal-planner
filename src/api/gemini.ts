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
      generationConfig: { temperature: 0.9, maxOutputTokens: 512 },
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

  const clean = text.trim().replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim()
  console.log('Gemini raw:', clean)
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
