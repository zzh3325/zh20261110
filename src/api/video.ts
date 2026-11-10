import { http } from '@/utils/request'

export interface Camera { id: string | number; name?: string; serialNumber?: string; status?: string; location?: string; [key: string]: unknown }
export interface Stream {
  id: string | number
  cameraId?: string | number
  deviceName?: string
  name?: string
  streamType?: string
  enabled?: boolean
  status?: string
  liveUrl?: string
  [key: string]: unknown
}

export interface CameraStreams {
  key: string
  name: string
  streams: Stream[]
  selected: Stream
}
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
    cameraId: (item.deviceId ?? item.cameraId) as string | number | undefined,
    deviceName: String(item.deviceName ?? ''),
    name: String(item.streamName || item.deviceName || item.name || ''),
    status: String(item.status || 'UNKNOWN')
  } as Stream))
}

const streamNameSuffix = /[\s-]*(主码流|子码流)$/

function streamType(stream: Stream): string {
  const type = String(stream.streamType ?? '').trim().toUpperCase()
  if (type === 'MAIN' || type === 'SUB') return type
  const suffix = stream.name?.match(streamNameSuffix)?.[1]
  return suffix === '主码流' ? 'MAIN' : suffix === '子码流' ? 'SUB' : ''
}

export function streamLabel(stream: Stream): string {
  const type = streamType(stream)
  if (type === 'MAIN') return '主码流'
  if (type === 'SUB') return '子码流'
  return stream.name || `视频通道 ${stream.id}`
}

export function groupCameraStreams(streams: Stream[]): CameraStreams[] {
  const groups = new Map<string, CameraStreams>()
  for (const stream of streams) {
    const id = String(stream.id ?? '').trim()
    if (!id) continue
    const cameraId = String(stream.cameraId ?? '').trim()
    const key = cameraId ? `camera:${cameraId}` : `stream:${id}`
    const group = groups.get(key)
    if (group) {
      if (!group.streams.some(item => String(item.id) === id)) group.streams.push(stream)
      continue
    }
    const name = (stream.deviceName?.trim() || stream.name || '').replace(streamNameSuffix, '').trim()
    groups.set(key, { key, name: name || `摄像机 ${cameraId || id}`, streams: [stream], selected: stream })
  }

  for (const group of groups.values()) {
    const enabled = group.streams.filter(stream => stream.enabled !== false)
    group.selected = enabled.find(stream => streamType(stream) === 'MAIN') ?? enabled[0] ?? group.streams[0]
  }
  return [...groups.values()]
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
