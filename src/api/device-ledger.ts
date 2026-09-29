import { http } from '@/utils/request'
import { unpackRows, type DataRow } from './data-browser'
import { getCameras } from './video'

export type DeviceHealth = 'online' | 'offline' | 'maintenance' | 'unknown'
export interface DeviceCategory {
  key: string
  title: string
  deviceType?: string
  source: 'device' | 'camera'
}
export interface LedgerDevice extends DataRow {
  _category: string
  _source: 'device' | 'camera'
}

export const deviceCategories: DeviceCategory[] = [
  { key: 'total', title: '全站仪', deviceType: 'TOTAL_STATION', source: 'device' },
  { key: 'weather', title: '气象六要素', deviceType: 'WEATHER_6', source: 'device' },
  { key: 'gnss', title: 'GNSS', deviceType: 'GNSS', source: 'device' },
  { key: 'crack', title: '裂缝计', deviceType: 'CRACK_METER', source: 'device' },
  { key: 'temperature', title: '分层水温计', deviceType: 'LAYERED_WATER_TEMP', source: 'device' },
  { key: 'horizontal', title: '水平监测', deviceType: 'HORIZONTAL_MONITORING', source: 'device' },
  { key: 'settlement', title: '沉降监测', deviceType: 'SETTLEMENT_MONITORING', source: 'device' },
  { key: 'termite', title: '白蚁监测', deviceType: 'TERMITE', source: 'device' },
  { key: 'seepage', title: '渗流渗压监测', deviceType: 'SEEPAGE_PRESSURE', source: 'device' },
  { key: 'flow', title: '流量监测', deviceType: 'MEASURING_WEIR', source: 'device' },
  { key: 'video', title: '视频监控', source: 'camera' }
]

export function categoryForType(type: unknown) {
  return deviceCategories.find(item => item.source === 'device' && item.deviceType === String(type || ''))
}

export function deviceHealth(row: DataRow): DeviceHealth {
  const raw = String(row.deviceStatus ?? row.status ?? '').trim().toUpperCase()
  if (['RUNNING', 'ONLINE', 'NORMAL', '0'].includes(raw)) return 'online'
  if (['OFFLINE', 'DISCONNECTED', 'LOST', '1', '2', 'ERROR'].includes(raw)) return 'offline'
  if (['MAINTENANCE', 'MAINTAINING', 'REPAIR'].includes(raw)) return 'maintenance'
  return 'unknown'
}

export function healthText(row: DataRow) {
  return ({ online: '在线', offline: '离线', maintenance: '维护中', unknown: '状态未知' } as const)[deviceHealth(row)]
}

export function deviceTitle(row: DataRow) {
  return String(row.deviceName ?? row.name ?? row.streamName ?? row.deviceNumber ?? row.serialNo ?? '未命名设备')
}

export function deviceNumber(row: DataRow) {
  return String(row.deviceNumber ?? row.serialNo ?? row.serialNumber ?? row.number ?? '未提供')
}

export function deviceLocation(row: DataRow) {
  return String(row.monitoringLocation ?? row.location ?? row.remarks ?? row.deviceLocation ?? '未提供')
}

export function summarizeDevices(rows: DataRow[]) {
  const result = { total: rows.length, online: 0, offline: 0, maintenance: 0, unknown: 0 }
  for (const row of rows) result[deviceHealth(row)] += 1
  return result
}

export async function loadDeviceLedger() {
  const [devicesResult, camerasResult] = await Promise.allSettled([
    http.get<unknown>('/get/device', undefined, { showError: false }),
    getCameras()
  ])
  if (devicesResult.status === 'rejected' && camerasResult.status === 'rejected') throw devicesResult.reason

  const rawDevices = devicesResult.status === 'fulfilled' ? unpackRows(devicesResult.value).rows : []
  const devices: LedgerDevice[] = rawDevices.flatMap(row => {
    const category = categoryForType(row.deviceType)
    return category ? [{ ...row, _category: category.key, _source: 'device' as const }] : []
  })
  const cameras: LedgerDevice[] = camerasResult.status === 'fulfilled'
    ? camerasResult.value.map(row => ({ ...row, _category: 'video', _source: 'camera' as const }))
    : []

  return {
    rows: [...devices, ...cameras],
    warnings: [
      devicesResult.status === 'rejected' ? '普通设备台账加载失败' : '',
      camerasResult.status === 'rejected' ? '视频设备台账加载失败' : ''
    ].filter(Boolean)
  }
}
