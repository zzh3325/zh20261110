/** Date/time pickers use Beijing time regardless of the device timezone. */
export function inspectionTimeParts(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const raw = value.trim()
  const local = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (local) return { date: local[1], time: local[2] }
  const timestamp = Date.parse(raw)
  if (!Number.isFinite(timestamp)) return { date: '', time: '' }
  const beijing = new Date(timestamp + 8 * 60 * 60 * 1000).toISOString()
  return { date: beijing.slice(0, 10), time: beijing.slice(11, 16) }
}
export function inspectionTimeValue(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('请选择有效的巡检日期和时间')
  const value = `${date}T${time}:00+08:00`
  const parts = inspectionTimeParts(value)
  if (parts.date !== date || parts.time !== time) throw new Error('请选择有效的巡检日期和时间')
  return value
}
