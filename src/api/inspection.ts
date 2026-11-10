import { http } from '@/utils/request'
import { uploadInspectionPhotos } from '@/utils/photos'
import { listOf } from '@/utils/normalize'
import type { Inspection } from '@/types/domain'
import { pointPresetCoordinates } from '@/utils/inspection-coordinates'

type RawInspection = Record<string, unknown> & { id?: string | number }

export function hasInspectionPhotos(value: unknown): boolean {
  return Array.isArray(value) && value.some(path => typeof path === 'string' && Boolean(path.trim()))
}

/** The record already exists; retrying create would duplicate it. */
export class InspectionPhotoUploadError extends Error {
  constructor(cause: unknown) {
    super(`巡检记录已保存，但照片未完整上传：${cause instanceof Error ? cause.message : '照片上传失败'}`)
    this.name = 'InspectionPhotoUploadError'
  }
}

export interface InspectionWriteProgress {
  onRecordSaved?: (id: string | number) => void
  onPhotoUploaded?: (path: string) => void
}

export interface SafetyInspectionPayload {
  id?: string | number
  inspectionItem: string
  checkPosition: string
  pointId?: string
  expectedPointId?: string
  checkInMethod?: string
  checkInTime?: string
  checkInProof?: string
  pointLatitude?: number
  pointLongitude?: number
  coordinateSystem?: string
  coordinateSource?: 'POINT_PRESET'
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
    photoPaths: Array.isArray(raw.photoPaths) ? raw.photoPaths.filter((path): path is string => typeof path === 'string' && Boolean(path.trim())) : []
  }
}

function requiredText(value: unknown, label: string) {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`请填写${label}`)
  return text
}

function inspectionPayload(data: Record<string, unknown>, requireProof = false): SafetyInspectionPayload {
  if (requireProof && (!data.pointId || data.checkInMethod !== 'QR_CODE' || !data.checkInProof)) throw new Error('请先扫描现场二维码完成点位核验')
  const preset = requireProof ? pointPresetCoordinates({ latitude: data.pointLatitude, longitude: data.pointLongitude, coordinateSystem: data.coordinateSystem }) : undefined
  const result = requiredText(data.result, '巡检结论')
  const existingPhotos = Array.isArray(data.photoPaths)
    ? data.photoPaths.filter((path): path is string => typeof path === 'string' && Boolean(path.trim()))
    : []
  return {
    inspectionItem: requiredText(data.inspectionItem || data.title, '巡检项目'),
    checkPosition: requiredText(data.checkPosition || data.location, '巡检位置'),
    coordinate: preset ? preset.coordinate : String(data.coordinate || ''),
    ...(preset ? { pointLatitude: preset.latitude, pointLongitude: preset.longitude, coordinateSystem: preset.coordinateSystem, coordinateSource: preset.coordinateSource } : {}),
    ...(data.pointId ? { pointId: String(data.pointId), checkInMethod: String(data.checkInMethod || 'QR_CODE'),
      ...(data.expectedPointId ? { expectedPointId: String(data.expectedPointId) } : {}),
      ...(data.checkInProof ? { checkInProof: String(data.checkInProof) } : {}),
      ...(data.checkInTime ? { checkInTime: String(data.checkInTime) } : {}) } : {}),
    inspectionType: requiredText(data.inspectionType || '日常巡检', '巡检类型'),
    inspectionTime: String(data.inspectionTime || data.checkedAt || new Date().toISOString()),
    result: result === 'NORMAL' ? '正常' : result === 'ABNORMAL' ? '异常' : result,
    inspector: requiredText(data.inspector, '巡检人员'),
    issueDescription: String(data.issueDescription || data.remark || '').trim(),
    photoPaths: existingPhotos
  }
}

function localPhotoPaths(data: Record<string, unknown>) {
	return Array.isArray(data.attachmentLocalPaths)
		? data.attachmentLocalPaths.filter((path): path is string => typeof path === 'string' && Boolean(path.trim()))
		: []
}

function inspectionIdOf(value: unknown): string | number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string' && /^\d+$/.test(value.trim())) return value.trim()
	if (!value || typeof value !== 'object') return undefined
	const record = value as Record<string, unknown>
	for (const key of ['id', 'inspectionId', 'recordId']) {
		const candidate = record[key]
		if ((typeof candidate === 'string' && /^\d+$/.test(candidate.trim())) || (typeof candidate === 'number' && Number.isFinite(candidate))) {
			return typeof candidate === 'string' ? candidate.trim() : candidate
		}
	}
	return inspectionIdOf(record.data)
}

export async function getInspections(pointId?: string) {
  const result = await http.get<RawInspection[] | null>('/get/inspections', pointId ? { pointId } : undefined)
  return listOf<RawInspection>(result).map(normalizeInspection)
}

export async function getInspection(id: string | number) {
  return normalizeInspection(await http.get<RawInspection>(`/get/inspections/${encodeURIComponent(String(id))}`))
}

export async function saveInspection(data: Record<string, unknown>, progress: InspectionWriteProgress = {}) {
	const localPhotos = localPhotoPaths(data)
	const payload = inspectionPayload(data, true)
	if (!localPhotos.length) throw new Error('请先现场拍照，至少上传 1 张现场照片才能提交巡检')
	payload.photoPaths = []
	const saved = await http.post<unknown>('/admin/inspections/save', payload)
	const id = inspectionIdOf(saved)
	try {
		if (id === undefined) throw new Error('接口未返回记录 ID，请在巡检列表确认记录')
		progress.onRecordSaved?.(id)
		if (localPhotos.length) await uploadInspectionPhotos(id, localPhotos, progress.onPhotoUploaded)
	} catch (error) {
		throw new InspectionPhotoUploadError(error)
	}
	return saved
}

export async function updateInspection(data: Record<string, unknown>, progress: InspectionWriteProgress = {}) {
  if (!data.id) throw new Error('缺少巡检记录 ID')
	const localPhotos = localPhotoPaths(data)
	const payload = inspectionPayload(data)
	if (!localPhotos.length && !hasInspectionPhotos(payload.photoPaths)) throw new Error('至少保留或补拍 1 张现场照片才能提交巡检')
	const updated = await http.put<unknown>('/admin/inspections/update', { ...payload, id: data.id })
	try {
		progress.onRecordSaved?.(String(data.id))
		if (localPhotos.length) await uploadInspectionPhotos(String(data.id), localPhotos, progress.onPhotoUploaded)
	} catch (error) {
		throw new InspectionPhotoUploadError(error)
	}
	return updated
}

export function deleteInspection(id: string | number) {
  if (!id) throw new Error('缺少巡检记录 ID')
  return http.delete(`/admin/inspections/${encodeURIComponent(String(id))}`)
}
