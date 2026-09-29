import { http } from '@/utils/request'
import { parseApiJson } from '@/utils/json'
import { unpackRows,type DataRow } from '@/api/data-browser'
import type { MonitorCategory } from './monitor-categories'
export type Row=DataRow
export const PAGE_SIZE=50
export function stringValue(v:unknown){return v==null?'':String(v).trim()}
export function objectValue(v:unknown):Row {
 try {const parsed=typeof v==='string'?parseApiJson(v):v;return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Row:{}}catch{return {}}
}
function required(v:unknown,label:string){const s=stringValue(v);if(!s)throw new Error('缺少'+label+'，请完善设备台账关联');return s}
export function deviceLabel(row:Row){return stringValue(row.deviceName||row.stnm||row.name||row.pointNumber||row.deviceNumber)||'未命名设备'}
export async function loadDevices(c:MonitorCategory){
 if(c.kind==='unsupported'||c.kind==='video')return []
 const path=c.kind==='sqdb'?'/get/sqdb/stations':'/get/device/type/'+encodeURIComponent(required(c.deviceType,'设备类型'))
 const result=unpackRows(await http.get(path,c.kind==='sqdb'?{sttp:c.sttp}:undefined,{showError:false})).rows
 return result.filter(r=>c.kind==='sqdb'?stringValue(r.sttp)===c.sttp:stringValue(r.deviceType)===c.deviceType)
}
export type OwnerProject='主坝'|'副坝'|'近岸坡'
export function pointOwnerProject(point:Row){return stringValue(point.ownerProject??point.owner_project)}
export function matchesOwnerProject(point:Row,owner:string){return pointOwnerProject(point)===owner}
export function stationPointQuery(device:Row,page=0,owner?:string,size=PAGE_SIZE){
 const query:Record<string,unknown>={projectId:required(device.stationId,'测站 stationId'),page,size}
 if(owner)query.ownerProject=owner
 return query
}
export async function loadStationPoints(device:Row,page=0,owner?:string){
 const query=stationPointQuery(device,page,owner)
 return unpackRows(await http.get('/get/qimmos/total-station/points',query,{showError:false}))
}
export async function loadStationPointCount(device:Row,owner:string){
 const query=stationPointQuery(device,0,owner,1)
 const result=unpackRows(await http.get('/get/qimmos/total-station/points',query,{showError:false}))
 return result.total??result.rows.length
}
export function splitPoints(rows:Row[],owner:string){
 return {matched:rows.filter(r=>matchesOwnerProject(r,owner)),unassigned:rows.filter(r=>!pointOwnerProject(r))}
}
export function dateRange(start:string,end:string){
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
 if(!valid(start)||!valid(end)||start>end)throw new Error('请选择有效的起止日期')
 return {startTime:start+'T00:00:00+08:00',endTime:end+'T23:59:59.999+08:00'}
}
export function dataRequest(c:MonitorCategory,device:Row,point:Row|null,start:string,end:string,year:string,page:number){
 const ext=objectValue(device.ext)
 const query:Record<string,unknown>={page,size:PAGE_SIZE}
 if(c.kind==='termite'){
  if(!/^\d{4}$/.test(year))throw new Error('请输入四位年份')
  query.year=year
  // 台账主键不是 monitor_point 主键；使用已联调的 stationId。
  return {path:'/get/monitor-points/'+encodeURIComponent(required(device.stationId,'白蚁监测设备 stationId'))+'/logs',query}
 }
 Object.assign(query,dateRange(start,end))
 let path=''
 if(c.kind==='total'){
  query.pointId=required(point?.pointId,'测点 pointId');query.projectId=required(device.stationId,'项目 stationId');query.dataType='measresult'
  if(stringValue(point?.projectId)!==stringValue(device.stationId))throw new Error('测点所属项目与测站不一致')
  if(!point||!matchesOwnerProject(point,c.owner||''))throw new Error('测点所属工程不匹配')
  path='/get/qimmos/total-station/data'
 }else if(c.kind==='rec'){
  query.devid=required(device.stationId??ext.devid,'采集设备 devid')
  query.cdbh=required(device.monitoringLocation??device.monitoring_location??ext.cdbh,'采集通道 cdbh')
  if(ext.devid!=null&&stringValue(ext.devid)!==query.devid||ext.cdbh!=null&&stringValue(ext.cdbh)!==query.cdbh)throw new Error('台账与扩展字段的通道关联冲突')
  path='/get/daqiao/recdata'
 }else if(c.kind==='sensor'){
  path='/get/sensor-points/'+encodeURIComponent(required(device.stationId,'传感器 stationId（不是台账 id）'))+'/data'
 }else if(c.kind==='gnss'){
  query.stationId=required(device.stationId,'GNSS stationId')
  if(ext.projectId!=null)query.projectId=stringValue(ext.projectId)
  path='/get/ims/gnss/displacement'
 }else if(c.kind==='meteo'){
  query.qimiotId=required(ext.qimiot_id??ext.qimiotId,'气象 qimiotId')
  query.address=required(ext.address,'气象 address')
  path='/get/qimmos/meteo/data'
 }else if(c.kind==='sqdb'){
  query.stcd=required(device.stcd,'水文测站 stcd')
  path='/get/sqdb/'+({RR:'rsvr',PP:'pptn',ZZ:'was'}[c.sttp||'']||'')
 }else throw new Error('该分类尚无确认的数据接口')
 return {path,query}
}
export async function loadReadings(c:MonitorCategory,device:Row,point:Row|null,start:string,end:string,year:string,page:number){
 const req=dataRequest(c,device,point,start,end,year,page)
 const result=unpackRows(await http.get(req.path,req.query,{showError:false}))
 return {...result,source:req.path}
}
export async function loadBusinessChart(category:MonitorCategory,device:Row,point:Row|null,start:string,end:string,maxRows=500){
 if(!['reservoir','gate','rain','gnss','weather','temperature','horizontal','settlement','pressure','flow','main','aux','slope'].includes(category.key))throw new Error('该监测分类未配置移动端趋势图')
 const rows:Row[]=[];let total:number|null=null,page=0,source=''
 while(rows.length<maxRows){
  const result=await loadReadings(category,device,point,start,end,'',page)
  rows.push(...result.rows);total=result.total;source=result.source
  if(!result.rows.length||(total!==null&&rows.length>=total)||result.rows.length<PAGE_SIZE)break
  page+=1
 }
 return {rows:rows.slice(0,maxRows),total,truncated:total!==null?total>maxRows:rows.length>=maxRows,source}
}
export interface Metric {key:string;label:string;unit:string}
export function metricsFor(c:MonitorCategory):Metric[]{
 const m=(key:string,label:string,unit=''):Metric=>({key,label,unit})
 if(c.kind==='total')return [m('dx','dX','m'),m('dy','dY','m'),m('dz','dZ','m')]
 // 位移接口差值单位未在 Swagger 标明：不照搬 Web 的 mm 标注。
 if(c.kind==='gnss')return [m('dx','X 位移'),m('dy','Y 位移'),m('dz','Z 位移'),m('displacement','三维合位移')]
 if(c.kind==='rec')return [m('value',c.key==='temperature'?'水温':c.key==='settlement'?'水位高度':c.key==='joint'?'接缝位移':'水平位移',c.key==='temperature'?'℃':'mm')]
 if(c.key==='pressure')return [m('水位高程','水位高程'),m('水位','水位'),m('水压','水压')]
 if(c.key==='flow')return [m('流量','流量','m³/s')]
 if(c.kind==='meteo')return [m('温度','温度','℃'),m('湿度','湿度','%'),m('气压','气压'),m('风速数据','风速'),m('风向数据','风向'),m('降雨量','降雨量','mm')]
 if(c.sttp==='RR')return [m('RZ','库水位','m'),m('W','蓄水量'),m('INQ','入库流量','m³/s'),m('OTQ','出库流量','m³/s'),m('CKFLZ','校核水位','m'),m('FSLTDZ','汛限水位','m')]
 if(c.sttp==='PP')return [m('drp','时段降水量','mm'),m('dyp','日降水量','mm'),m('intv','时段长'),m('pdr','降水历时')]
 if(c.sttp==='ZZ')return [m('upz','闸上水位','m'),m('dwz','闸下水位','m'),m('tgtq','过闸流量','m³/s')]
 return [m('alarm','虫害告警'),m('rssi','信号强度'),m('snr','信噪比'),m('voltage','电压')]
}
export function numeric(v:unknown):number|null{
 if(v==null||typeof v==='boolean'||typeof v==='object'||stringValue(v)==='')return null
 const n=Number(v);return Number.isFinite(n)?n:null
}
export function metricValue(c:MonitorCategory,row:Row,key:string):number|null{
 if(c.kind==='rec'&&key==='value'){
  const raw=numeric(row.data1);return raw===null?null:c.key==='temperature'?Number(((raw-46.6)*5).toFixed(3)):raw
 }
 const values=c.kind==='sensor'?objectValue(row.resultData):c.kind==='meteo'?objectValue(row.resultValue):row
 if(key==='alarm'&&typeof values[key]==='boolean')return values[key]?1:0
 return numeric(values[key]??values[key.toLowerCase()]??values[key.toUpperCase()])
}
export function recordTime(row:Row){return stringValue(row.measureTime||row.collectTime||row.time||row.FULLTM||row.fulltm||row.tm||row.jcrq||row.createTime)}
export function statusLabel(row:Row){return ({RUNNING:'运行中',OFFLINE:'离线',MAINTENANCE:'维护中',ONLINE:'在线'} as Record<string,string>)[stringValue(row.deviceStatus)]||'状态未提供'}
