import { http } from '@/utils/request'
import type { AlertItem } from '@/types/domain'

type RawAlert = Record<string, unknown> & { id?: string | number }

function text(value:unknown){return value==null?'':String(value).trim()}
function scalar(...values:unknown[]):string|number|undefined{for(const value of values){if(typeof value==='number'&&Number.isFinite(value))return value;if(typeof value==='string'&&value.trim())return value.trim()}return undefined}
function ruleParts(value:unknown){
  const rule=text(value)
  const metric=rule.match(/^\s*(.+?)\s*(?:紧急|中度|一般|提示)告警/)?.[1]?.trim()||''
  const field=(name:string)=>rule.match(new RegExp(name+'\\s*=\\s*([^，,）)]+)'))?.[1]?.trim()||''
  return {rule,metric,value:field('当前值'),compare:field('比较'),emergency:field('紧急'),moderate:field('中度'),general:field('一般'),suggest:field('提示')}
}
function thresholdFor(level:string,parts:ReturnType<typeof ruleParts>){
  if(level.includes('紧急')||level==='1')return parts.emergency
  if(level.includes('中度')||level==='2')return parts.moderate
  if(level.includes('一般')||level==='3')return parts.general
  return parts.suggest
}

export function normalizeAlert(raw: RawAlert): AlertItem {
  const parts=ruleParts(raw.ruleDescription||raw.description||raw.content)
  const level=text(raw.alertLevel||raw.level)
  const suppliedTitle=text(raw.title)
  const metricName=text(raw.metricName)||parts.metric||text(raw.alertValueType)||text(raw.metricCode)
  const conciseTitle=suppliedTitle&&!suppliedTitle.includes('当前值=')&&suppliedTitle.length<=36?suppliedTitle:(metricName?metricName+'异常':'监测数据异常')
  return {
    ...raw,
    id: raw.id ?? '',
    title: conciseTitle,
    level,
    metricName,
    status: text(raw.handlingStatus||raw.status)||'未处理',
    value: scalar(raw.currentValue,raw.alertValue,raw.value,parts.value),
    threshold: scalar(raw.threshold,raw.alertThreshold,thresholdFor(level,parts)),
    compareOp: text(raw.compareOp)||parts.compare,
    unit: text(raw.unit),
    ruleDescription: parts.rule,
    content: text(raw.description||raw.content)||parts.rule,
    deviceName: text(raw.deviceName),
    location: text(raw.location),
    alertTime: text(raw.alertTime||raw.createdAt)
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
