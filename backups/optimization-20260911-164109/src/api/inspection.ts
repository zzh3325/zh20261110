import { http, uploadFile } from '@/utils/request'
import type { Inspection } from '@/types/domain'

type RawInspection = Record<string, unknown> & { id?: string | number }

function normalizeInspection(raw: RawInspection): Inspection {
  return {
    ...raw,
    id: raw.id ?? '',
    title: String(raw.inspectionItem || raw.title || '安全巡检'),
    name: String(raw.inspectionItem || raw.name || '安全巡检'),
    location: String(raw.checkPosition || raw.location || ''),
    plannedTime: String(raw.inspectionTime || raw.plannedTime || ''),
    time: String(raw.inspectionTime || raw.time || ''),
    assigneeName: String(raw.inspector || raw.assigneeName || ''),
    description: String(raw.issueDescription || raw.description || ''),
    status: String(raw.result || raw.status || ''),
    result: String(raw.result || ''),
    remark: String(raw.issueDescription || raw.remark || '')
  }
}

function queryString(data: Record<string, unknown>) {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
}

function inspectionQuery(data: Record<string, unknown>) {
  const latitude = data.latitude
  const longitude = data.longitude
  const coordinate = data.coordinate || (latitude !== undefined && longitude !== undefined ? `${latitude},${longitude}` : '未定位')
  return {
    inspectionItem: data.inspectionItem || data.title || '安全巡检',
    checkPosition: data.checkPosition || data.location || '现场巡检点',
    coordinate,
    inspectionType: data.inspectionType || '日常巡检',
    inspectionTime: data.inspectionTime || new Date().toISOString(),
    result: data.result === 'NORMAL' ? '正常' : data.result === 'ABNORMAL' ? '异常' : data.result || '正常',
    inspector: data.inspector || '当前用户',
    issueDescription: data.issueDescription || data.remark || '无'
  }
}

export async function getInspections() {
  const result = await http.get<RawInspection[] | null>('/get/inspections')
  return (Array.isArray(result) ? result : []).map(normalizeInspection)
}

export async function getInspection(id: string | number) {
  return normalizeInspection(await http.get<RawInspection>(`/get/inspections/${id}`))
}

export async function saveInspection(data: Record<string, unknown>) {
  const query = inspectionQuery(data)
  const photos = Array.isArray(data.attachmentLocalPaths) ? data.attachmentLocalPaths.filter(Boolean) as string[] : []
  const url = `/admin/inspections/save?${queryString(query)}`
  return photos.length ? uploadFile(url, photos[0], {}, 'photos') : http.post(url, {})
}

export function updateInspection(data: Record<string, unknown>) {
  const query = { id: data.id, ...inspectionQuery(data) }
  return http.put(`/admin/inspections/update?${queryString(query)}`, {})
}
