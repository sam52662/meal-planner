export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface Meal {
  type: MealType
  name: string
  recipe?: string
  note?: string
}

export interface DayPlan {
  date: string // ISO date string YYYY-MM-DD
  meals: Meal[]
}

export type MealPlanData = DayPlan[]

export type StorageType = 'freezer' | 'fridge'

export interface InventoryItem {
  id: string
  name: string
  emoji: string
  quantity: number
  unit: string
  storage: StorageType
  storedAt?: string  // ISO date string
  expiresAt?: string // ISO date string
}

export type InventoryData = InventoryItem[]
