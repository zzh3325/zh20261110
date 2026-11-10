export function numeric(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/** PC 11 月 9 日展示规则：最多四位小数，去除尾零。 */
export function formatMonitorValue(value: unknown, missing = '--'): string {
  const reading = numeric(value)
  return reading === null ? missing : reading.toFixed(4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

// The displacement APIs return meters. Display readings in millimeters.
export function displacementMm(value: unknown): number | null {
  const meters = numeric(value)
  if (meters === null) return null
  const millimeters = meters * 1000
  return Number.isFinite(millimeters) ? Number(millimeters.toFixed(3)) : null
}
