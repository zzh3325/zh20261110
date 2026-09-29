import { http } from '@/utils/request'
import { listOf } from '@/utils/normalize'
import type { Measurement, MonitorPoint } from '@/types/domain'

type RawRecord = Record<string, unknown>

function normalizePoint(raw: RawRecord): MonitorPoint {
  return {
    ...raw,
    id: (raw.id as string | number) ?? '',
    name: String(raw.name || raw.sensorName || '未命名测点'),
    code: String(raw.sensorNumber || raw.code || ''),
    type: String(raw.outType || raw.sensorName || raw.type || ''),
    location: String(raw.locationParam || raw.remarks || raw.location || ''),
    status: 'unknown',
    lastTime: String(raw.lastDataTime || raw.updateTime || raw.lastTime || ''),
    latestValue: (raw.latestValue ?? raw.value) as string | number | undefined,
    unit: String(raw.unit || '')
  }
}

export function normalizeMeasurement(raw: RawRecord): Measurement {
  let fields: Record<string, unknown> = {}
  try {
    const parsed = typeof raw.resultData === 'string' ? JSON.parse(raw.resultData) : raw.resultData
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) fields = parsed
  } catch { /* Invalid engineering data stays unavailable instead of becoming zero. */ }
  const names = Object.keys(fields)
  const resultValue = names.length === 1 ? fields[names[0]] : raw.resultValue
  const value = typeof resultValue === 'number' || typeof resultValue === 'string'
    ? resultValue
    : raw.calculatedValue ?? raw.calculateValue ?? raw.value ?? raw.originalValue
  return {
    ...raw,
    id: raw.id as string | number | undefined,
    time: String(raw.time || raw.collectTime || raw.dataTime || raw.createTime || ''),
    value: value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null,
    unit: String(raw.unit || ''),
    metricName: names.length === 1 ? names[0] : '',
    metrics: fields
  }
}

async function pointList(query?: Record<string, unknown>) {
  return listOf<RawRecord>(await http.get('/get/sensor-points', query)).map(normalizePoint)
}

export const monitoringApi = {
  sensorPoints: pointList,
  sensorPoint: async (id: string | number) => normalizePoint(await http.get<RawRecord>(`/get/sensor-points/${id}`)),
  sensorData: async (id: string | number, query?: Record<string, unknown>) =>
    listOf<RawRecord>(await http.get(`/get/sensor-points/${id}/data`, query)).map(normalizeMeasurement).sort((a, b) => a.time.localeCompare(b.time)),
  allSensorData: (query?: Record<string, unknown>) => http.get('/get/sensor-points/data', query),
  totalStationPoints: (query: Record<string, unknown> = { page: 0, size: 20 }) => http.get('/get/qimmos/total-station/points', query),
  totalStationData: (query?: Record<string, unknown>) => http.get('/get/qimmos/total-station/data', query),
  meteoData: (query: Record<string, unknown> = { page: 0, size: 10 }) => http.get('/get/qimmos/meteo/data', query),
  latestMeteo: (query: { qimiotId: string | number; address: string }) => http.get('/get/qimmos/meteo/data/latest', query),
  gnssDisplacement: (query: Record<string, unknown> & { stationId: string | number }) => http.get('/get/ims/gnss/displacement', query),
  gnssData: (query?: Record<string, unknown>) => http.get('/get/ims/gnss/data', query),
  recData: (query?: Record<string, unknown>) => http.get('/get/daqiao/recdata', query),
  termitePoints: (query?: Record<string, unknown>) => http.get('/get/monitor-points', query),
  termiteLogs: (id: string | number, query?: Record<string, unknown>) => http.get(`/get/monitor-points/${id}/logs`, query),
  manualData: () => http.get('/get/manual-data')
}
