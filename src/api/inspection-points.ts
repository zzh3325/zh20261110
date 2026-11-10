import { http, RequestError } from '@/utils/request'
import { coordinateNumber, pointPresetCoordinates } from '@/utils/inspection-coordinates'

export interface InspectionPoint {
  id: string
  code: string
  name: string
  area: string
  location: string
  enabled: boolean
  latitude?: number
  longitude?: number
  coordinateSystem?: string
}
export interface PointVerification {
  expectedPointId?: string
  point: InspectionPoint
  checkInProof: string
  checkInTime: string
  expiresAt: string
}
const ROOT = '/admin/inspection-points'
export const POINT_SERVICE_MESSAGE = '固定点位服务暂不可用，请联系管理员确认服务配置后重试。'
export function pointError(error: unknown): string {
  if (error instanceof RequestError && error.statusCode === 403) return '当前账号无权访问巡检点位，请联系管理员检查权限'
  if (error instanceof RequestError && [404, 405, 501].includes(error.statusCode || 0)) return POINT_SERVICE_MESSAGE
  return error instanceof Error ? error.message : '点位服务请求失败，请重试'
}
function point(value: unknown): InspectionPoint {
  if (!value || typeof value !== 'object') throw new Error('点位服务返回的信息不完整')
  const p = value as Record<string, unknown>
  if (p.id == null || !String(p.id) || !p.code || !p.name || typeof p.enabled !== 'boolean') throw new Error('点位服务返回的信息不完整')
  return { id: String(p.id), code: String(p.code), name: String(p.name), area: String(p.area || ''), location: String(p.location || ''), enabled: p.enabled,
    ...(coordinateNumber(p.latitude) !== undefined ? { latitude: coordinateNumber(p.latitude) } : {}),
    ...(coordinateNumber(p.longitude) !== undefined ? { longitude: coordinateNumber(p.longitude) } : {}),
    coordinateSystem: String(p.coordinateSystem ?? '').trim().toUpperCase() || 'WGS84' }
}
export async function getInspectionPoints(): Promise<InspectionPoint[]> {
  const result = await http.get<unknown>(ROOT, undefined, { showError: false })
  if (!Array.isArray(result)) throw new Error('点位列表返回格式不正确')
  return result.map(point)
}
export async function verifyInspectionPoint(code: string, expectedPointId?: string): Promise<PointVerification> {
  const result = await http.post<PointVerification>(`${ROOT}/verify`, { code, ...(expectedPointId ? { expectedPointId } : {}) }, { showError: false })
  if (!result || typeof result.checkInProof !== 'string' || !result.checkInProof || !result.checkInTime || !result.expiresAt || !Number.isFinite(Date.parse(result.checkInTime)) || Date.parse(result.expiresAt) <= Date.now() || !Number.isFinite(Date.parse(result.expiresAt))) throw new Error('点位核验凭证无效或已过期，请重新扫码')
  const verified = point(result.point)
  if (!verified.enabled) throw new Error('该巡检点位已停用，请联系管理员')
  if (expectedPointId && verified.id !== expectedPointId) throw new Error(`点位不匹配：当前扫描的是“${verified.name}”，请扫描应巡检点位的二维码。`)
  pointPresetCoordinates(verified)
  return { ...result, point: verified, expectedPointId }
}
