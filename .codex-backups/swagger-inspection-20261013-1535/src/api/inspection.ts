import { http } from '@/utils/request'
import { uploadInspectionPhotos } from '@/utils/photos'
import { listOf } from '@/utils/normalize'
import type { Inspection } from '@/types/domain'

type RawInspection = Record<string, unknown> & { id?: string | number }

export interface SafetyInspectionPayload {
  id?: string | number
  inspectionItem: string
  checkPosition: string
  coordinate: string
  inspectionType: string
  inspectionTime: string
  result: string
  inspector: string
  issueDescription: string
  photoPaths: string[]
}

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
    remark: String(raw.issueDescription || raw.remark || ''),
    photoPaths: Array.isArray(raw.photoPaths) ? raw.photoPaths.map(String) : []
  }
}

function requiredText(value: unknown, label: string) {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`请填写${label}`)
  return text
}

function coordinateOf(data: Record<string, unknown>) {
  const existing = String(data.coordinate ?? '').trim()
  if (existing) return existing
  const latitude = Number(data.latitude)
  const longitude = Number(data.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('请先完成现场定位')
  return `${latitude},${longitude}`
}

async function inspectionPayload(data: Record<string, unknown>): Promise<SafetyInspectionPayload> {
  const result = requiredText(data.result, '巡检结论')
  const localPhotos = Array.isArray(data.attachmentLocalPaths)
    ? data.attachmentLocalPaths.map(String).filter(Boolean)
    : []
  const existingPhotos = Array.isArray(data.photoPaths)
    ? data.photoPaths.map(String).filter(Boolean)
    : []
  const uploadedPhotos = localPhotos.length ? await uploadInspectionPhotos(localPhotos) : []
  return {
    inspectionItem: requiredText(data.inspectionItem || data.title, '巡检项目'),
    checkPosition: requiredText(data.checkPosition || data.location, '巡检位置'),
    coordinate: coordinateOf(data),
    inspectionType: requiredText(data.inspectionType || '日常巡检', '巡检类型'),
    inspectionTime: String(data.inspectionTime || data.checkedAt || new Date().toISOString()),
    result: result === 'NORMAL' ? '正常' : result === 'ABNORMAL' ? '异常' : result,
    inspector: requiredText(data.inspector, '巡检人员'),
    issueDescription: String(data.issueDescription || data.remark || '').trim(),
    photoPaths: [...existingPhotos, ...uploadedPhotos]
  }
}

export async function getInspections() {
  const result = await http.get<RawInspection[] | null>('/admin/inspections')
  return listOf<RawInspection>(result).map(normalizeInspection)
}

export async function getInspection(id: string | number) {
  return normalizeInspection(await http.get<RawInspection>(`/admin/inspections/${encodeURIComponent(String(id))}`))
}

export async function saveInspection(data: Record<string, unknown>) {
  return http.post('/admin/inspections/save', await inspectionPayload(data))
}

export async function updateInspection(data: Record<string, unknown>) {
  if (!data.id) throw new Error('缺少巡检记录 ID')
  const payload = await inspectionPayload(data)
  return http.put('/admin/inspections/update', { ...payload, id: data.id })
}

export function deleteInspection(id: string | number) {
  if (!id) throw new Error('缺少巡检记录 ID')
  return http.delete(`/admin/inspections/${encodeURIComponent(String(id))}`)
}
