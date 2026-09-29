import type { PageResult } from '@/types/api'

export function listOf<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[]
  if (!input || typeof input !== 'object') return []
  const value = input as Record<string, unknown>
  if (Array.isArray(value.records)) return value.records as T[]
  if (Array.isArray(value.list)) return value.list as T[]
  if (Array.isArray(value.content)) return value.content as T[]
  if (value.data !== input) return listOf<T>(value.data)
  return []
}

export function pageOf<T>(input: unknown): PageResult<T> {
  const records = listOf<T>(input)
  const value = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return {
    records,
    total: Number(value.total ?? value.totalElements ?? records.length),
    current: Number(value.current ?? value.page ?? 1),
    size: Number(value.size ?? records.length)
  }
}

export function text(value: unknown, fallback = '--') {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

export function formatTime(value: unknown) {
  if (!value) return '--'
  const raw = String(value).replace('T', ' ')
  return raw.length > 19 ? raw.slice(0, 19) : raw
}
