import { http } from '@/utils/request'
import type { Reservoir } from '@/types/domain'

type RawReservoir = Record<string, unknown> & { id?: string | number }

export function normalizeReservoir(raw: RawReservoir): Reservoir {
  const coordinate = String(raw.latitudeLongitude || '')
  const numericCoordinate = coordinate.match(/(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)/)
  return {
    ...raw,
    id: raw.id ?? '',
    name: String(raw.reservoirName || raw.name || '大桥水库'),
    level: String(raw.reservoirLevel || raw.projectScale || raw.level || ''),
    address: String(raw.latitudeLongitude || raw.address || ''),
    normalWaterLevel: raw.normalStorageLevel == null && raw.normalWaterLevel == null ? undefined : Number(raw.normalStorageLevel ?? raw.normalWaterLevel),
    floodLimitWaterLevel: raw.mainFloodLimitLevel == null && raw.floodControlLevel == null && raw.floodLimitWaterLevel == null ? undefined : Number(raw.mainFloodLimitLevel ?? raw.floodControlLevel ?? raw.floodLimitWaterLevel),
    manager: String(raw.managementUnit || raw.responsiblePersonName || raw.manager || ''),
    phone: String(raw.responsiblePersonPhone || raw.phone || ''),
    imageUrl: String(raw.imagePath || raw.imageUrl || ''),
    longitude: numericCoordinate ? Number(numericCoordinate[1]) : undefined,
    latitude: numericCoordinate ? Number(numericCoordinate[2]) : undefined
  }
}

export async function getReservoir(id: string | number) {
  return normalizeReservoir(await http.get<RawReservoir>(`/get/reservoirs/${id}`))
}

export async function searchReservoirs(query: Record<string, unknown>) {
  const result = await http.get<RawReservoir[] | RawReservoir>('/get/reservoirs/search', query)
  return (Array.isArray(result) ? result : [result]).filter(Boolean).map(normalizeReservoir)
}

export const getAssetLocations = (query?: Record<string, unknown>) => http.get('/get/asset-locations', query)
export const getFrontPageImageUrl = () => `${import.meta.env.VITE_API_BASE_URL}/admin/reservoirs/frontpage`
