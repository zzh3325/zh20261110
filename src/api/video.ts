import { http } from '@/utils/request'

export interface Camera { id: string | number; name?: string; serialNumber?: string; status?: string; location?: string; [key: string]: unknown }
export interface Stream { id: string | number; cameraId?: string | number; name?: string; status?: string; liveUrl?: string; [key: string]: unknown }
export interface LiveResult {
  url?: string
  liveUrl?: string
  hlsUrl?: string
  flvUrl?: string
  fmp4Url?: string
  webrtcSignalingUrl?: string
  preferredProtocol?: string
  status?: string
  [key: string]: unknown
}

function asArray<T>(value: T[] | T | null): T[] {
  return Array.isArray(value) ? value : value ? [value] : []
}

export async function getCameras(query?: Record<string, unknown>) {
  const result = await http.get<Record<string, unknown>[] | Record<string, unknown> | null>('/api/cameras', query)
  return asArray(result).map((item) => ({
    ...item,
    id: item.id as string | number,
    name: String(item.deviceName || item.name || ''),
    serialNumber: String(item.serialNo || item.serialNumber || ''),
    location: String(item.remarks || item.location || ''),
    status: String(item.status || 'UNKNOWN')
  } as Camera))
}

export async function getStreams(query?: Record<string, unknown>) {
  const result = await http.get<Record<string, unknown>[] | Record<string, unknown> | null>('/api/streams', query)
  return asArray(result).map((item) => ({
    ...item,
    id: item.id as string | number,
    cameraId: item.deviceId as string | number,
    name: String(item.streamName || item.deviceName || item.name || ''),
    status: String(item.status || 'UNKNOWN')
  } as Stream))
}

export async function getLive(id: string | number, refresh = false): Promise<LiveResult> {
  const result = await http.get<LiveResult>(`/api/streams/${id}/live`, { refresh })
  if (result.status && result.status !== 'ONLINE') throw new Error(`视频流当前${result.status}，请检查视频服务`)
  return {
    ...result,
    // H5 优先使用浏览器可播放地址；WebRTC 字段是信令接口，不能直接赋给 video.src。
    url: result.hlsUrl || result.fmp4Url || result.url || result.liveUrl
  }
}

export const getRecordings = (query: { streamId: string | number; startTime: string; endTime: string }) =>
  http.get('/api/recordings', query)
