import type { InventoryItem } from '../types'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'

export async function suggestMeal(
  apiKey: string,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  inventory: InventoryItem[],
  existingMeals: string[]
): Promise<string> {
  const mealLabel = mealType === 'breakfast' ? 'Frühstück' : mealType === 'lunch' ? 'Mittagessen' : 'Abendessen'

  const inventoryText = inventory.length > 0
    ? inventory.map(i => `- ${i.emoji} ${i.name} (${i.quantity} ${i.unit}, ${i.storage === 'freezer' ? 'Tiefkühler' : 'Kühlschrank'})`).join('\n')
    : 'Keine Artikel vorhanden'

  const existingText = existingMeals.filter(Boolean).length > 0
    ? `\nBereits diese Woche geplant (bitte nicht wiederholen): ${existingMeals.filter(Boolean).join(', ')}`
    : ''

  const prompt = `Du bist ein Kochassistent. Schlage ein einzelnes konkretes Gericht für ${mealLabel} vor.

Vorhandene Zutaten im Vorrat:
${inventoryText}
${existingText}

Regeln:
- Antworte NUR mit dem Gerichtsnamen, sonst nichts
- Maximal 4 Wörter
- Auf Deutsch
- Nutze wenn möglich Zutaten aus dem Vorrat
- Kein Punkt am Ende`

  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 32 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message
    throw new Error(msg ?? `Gemini API Fehler: ${res.status}`)
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
  if (!text) {
    console.error('Gemini response:', JSON.stringify(json))
    throw new Error('Keine Antwort von der KI')
  }
  const result = text.trim().replace(/\.$/, '').split('\n')[0].trim()
  return result
}
