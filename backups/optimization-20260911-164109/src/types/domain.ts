export type LoadState = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export interface Reservoir {
  id: string | number
  name: string
  address?: string
  level?: string
  totalCapacity?: number
  normalWaterLevel?: number
  floodLimitWaterLevel?: number
  longitude?: number
  latitude?: number
  manager?: string
  phone?: string
  imageUrl?: string
  [key: string]: unknown
}

export interface MonitorPoint {
  id: string | number
  name: string
  code?: string
  type?: string
  location?: string
  unit?: string
  latestValue?: number | string
  lastTime?: string
  status?: 'normal' | 'warning' | 'offline'
  [key: string]: unknown
}

export interface Measurement {
  id?: string | number
  time: string
  value: number
  unit?: string
  [key: string]: unknown
}

export interface AlertItem {
  id: string | number
  title?: string
  level?: number | string
  deviceName?: string
  location?: string
  metricName?: string
  value?: number | string
  threshold?: number | string
  alertTime?: string
  status?: string
  content?: string
  handleRemark?: string
  [key: string]: unknown
}

export interface UserInfo {
  id?: string | number
  username: string
  realName?: string
  name?: string
  phone?: string
  department?: string
  role?: string | string[]
  avatar?: string
  [key: string]: unknown
}

export interface Inspection {
  id: string | number
  title?: string
  name?: string
  location?: string
  assigneeName?: string
  plannedTime?: string
  planTime?: string
  time?: string
  inspector?: string
  status?: string
  condition?: string | number
  description?: string
  content?: string
  result?: string
  remark?: string
  [key: string]: unknown
}
