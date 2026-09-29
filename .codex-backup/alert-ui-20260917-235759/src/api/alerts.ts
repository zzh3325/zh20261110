import { http } from '@/utils/request'
import type { AlertItem } from '@/types/domain'

type RawAlert = Record<string, unknown> & { id?: string | number }

export function normalizeAlert(raw: RawAlert): AlertItem {
  return {
    ...raw,
    id: raw.id ?? '',
    title: String(raw.ruleDescription || raw.title || raw.description || '监测数据告警'),
    level: String(raw.alertLevel || raw.level || ''),
    metricName: String(raw.metricCode || raw.metricName || ''),
    status: String(raw.handlingStatus || raw.status || '未处理'),
    content: String(raw.description || raw.content || raw.ruleDescription || ''),
    deviceName: String(raw.deviceName || ''),
    location: String(raw.location || ''),
    alertTime: String(raw.alertTime || raw.createdAt || '')
  }
}

function normalizeList(result: RawAlert[] | RawAlert): AlertItem[] {
  return (Array.isArray(result) ? result : result ? [result] : []).map(normalizeAlert)
}

export async function getAlerts(query?: Record<string, unknown>) {
  return normalizeList(await http.get<RawAlert[] | RawAlert>('/get/alert/search', query))
}
export async function getAllAlerts() {
  return normalizeList(await http.get<RawAlert[] | RawAlert>('/get/alert'))
}
export async function getAlert(id: string | number) {
  return normalizeAlert(await http.get<RawAlert>(`/get/alert/${id}`))
}
// Swagger 中该接口只有路径参数，调用后后端直接标记为“已处理”。
export const handleAlert = (id: string | number, _data?: Record<string, unknown>) =>
  http.post<RawAlert>(`/admin/alerts/${id}/handle`, {})
