// Labels for historical records only; new point coordinates always use WGS84.
export const COORDINATE_SYSTEM_LABELS: Record<string, string> = {
  WGS84: 'WGS84', GCJ02: 'GCJ-02（高德/腾讯）', CGCS2000: 'CGCS2000（2000国家大地坐标系）'
}
export function coordinateSystemLabel(value: unknown): string {
  return COORDINATE_SYSTEM_LABELS[String(value || '')] || '未标注坐标系'
}
export function coordinateNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim())) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
/** Point archive coordinates, never device GPS or distance-based attendance. */
export function pointPresetCoordinates(value: { latitude?: unknown; longitude?: unknown; coordinateSystem?: unknown }) {
  const latitude = coordinateNumber(value.latitude), longitude = coordinateNumber(value.longitude)
  if (latitude === undefined || longitude === undefined) throw new Error('该点位未配置完整的预设经纬度，请联系 PC 管理端管理员补全后重新扫码')
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('该点位预设坐标超出有效范围，请联系管理员修正')
  const coordinateSystem = String(value.coordinateSystem ?? '').trim().toUpperCase() || 'WGS84'
  if (coordinateSystem !== 'WGS84') throw new Error('该点位坐标与系统默认 WGS84 不一致，请联系管理员确认坐标数据')
  return { latitude, longitude, coordinateSystem, coordinate: `${latitude},${longitude}`, coordinateSource: 'POINT_PRESET' as const }
}
