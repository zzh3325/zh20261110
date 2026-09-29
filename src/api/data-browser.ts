import { http } from '@/utils/request'
import { parseApiJson } from '@/utils/json'
import type { DataSource } from './data-sources'
export type DataRow = Record<string, unknown>

export function buildDataQuery(source:DataSource, values:Record<string,string>, page=0) {
  let path=source.path
  const query:Record<string,unknown>={}
  for(const f of source.filters) {
    const value=(values[f.key]||'').trim()
    if(!value) { if(f.required) throw new Error('请填写'+f.label); continue }
    if(f.kind==='integer'&&!/^-?\d+$/.test(value)) throw new Error(f.label+'必须为整数')
    if(f.options&&!f.options.includes(value)) throw new Error(f.label+'不在接口允许范围内')
    if(f.kind==='date'&&(!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value)))) throw new Error('时间格式应为 2026-09-14T00:00:00+08:00')
    if(path.includes('{'+f.key+'}')) path=path.replace('{'+f.key+'}',encodeURIComponent(value))
    else query[f.key]=f.kind==='boolean'?value==='true':value
  }
  if(query.startTime&&query.endTime&&Date.parse(String(query.endTime))<=Date.parse(String(query.startTime))) throw new Error('结束时间必须晚于开始时间')
  if(source.paged) Object.assign(query,{page,size:20})
  return {path,query}
}

export function unpackRows(raw:unknown): {rows:DataRow[];total:number|null} {
  if(raw===null||raw===undefined) return {rows:[],total:0}
  if(Array.isArray(raw)) return {rows:raw.filter(r=>r&&typeof r==='object'),total:raw.length}
  if(typeof raw!=='object') throw new Error('接口返回格式与列表不符')
  const obj=raw as DataRow
  const list=obj.content??obj.records??obj.list
  if(Array.isArray(list)) {
    const count=obj.totalElements??obj.total
    return {rows:list,total:count!==undefined&&Number.isSafeInteger(Number(count))?Number(count):null}
  }
  if(obj.data!==undefined) return unpackRows(obj.data)
  if(!Object.keys(obj).length) return {rows:[],total:0}
  return {rows:[obj],total:1}
}
export async function fetchData(source:DataSource, values:Record<string,string>, page=0) {
  const {path,query}=buildDataQuery(source,values,page)
  return unpackRows(await http.get(path,query,{showError:false}))
}

const labels:Record<string,string>={id:'记录 ID',deviceName:'设备名称',deviceNumber:'设备编号',deviceType:'设备类型',deviceStatus:'运行状态',stationId:'站点 ID',projectId:'项目 ID',projectName:'项目名称',name:'名称',pointId:'测点 ID',pointName:'测点名称',pointType:'测点类型码',periodNum:'期次',period:'期次',startTime:'开始时间',endTime:'结束时间',time:'采集时间',collectTime:'采集时间',dataTime:'数据时间',createTime:'创建时间',createdAt:'创建时间',updatedAt:'更新时间',registerTime:'登记时间',lastDataTime:'最近数据时间',location:'位置',monitoringLocation:'监测点位',monitoring_location:'监测点位',monitoringPoint:'监测点',responsiblePerson:'责任人',maintenanceResponsible:'维护责任人',phone:'联系电话',maintenanceStart:'维护开始',maintenanceEnd:'维护结束',currentX:'X 坐标',currentY:'Y 坐标',currentZ:'Z 坐标',qimiotId:'气象设备 ID',address:'设备地址',devid:'采集设备 ID',cdbh:'通道编号',ukid:'数据 ID',status:'状态',offline:'在线状态码',number:'编号',devAddr:'设备编码',longitude:'经度',latitude:'纬度',category:'类别',zone:'坝段',deviceId:'设备 ID',enabled:'是否启用',remarks:'备注',description:'说明',title:'标题',streamId:'视频流 ID',streamName:'视频流名称',serialNo:'序列号',lastError:'最近错误',incidentType:'问题类型',severity:'严重程度',resolved:'是否已处理',clipStatus:'裁剪状态',clipError:'裁剪错误',fileName:'文件名称',fileType:'文件类型',filePath:'文件地址',fileSize:'文件大小（字节）',durationSeconds:'时长（秒）',format:'格式',uploadTime:'上传时间',uploader:'上传人',importTime:'导入时间',xdisplacement:'X 位移',ydisplacement:'Y 位移',zdisplacement:'Z 位移',deviceLocation:'设备位置',alertLevel:'告警等级',alertTime:'告警时间',handlingStatus:'处理状态',metricCode:'指标代码',ruleDescription:'规则说明',monitoringContent:'监测内容',monitoringType:'监测类型',alertValueType:'阈值类型',emergencyAlert:'紧急阈值',moderateAlert:'中度阈值',generalAlert:'一般阈值',compareOp:'比较运算',recipient:'接收人',contactInfo:'联系方式',pushMethod:'推送方式',pushLevel:'推送等级',sendStatus:'发送状态',pushTime:'推送时间',sendTime:'发送时间',content:'内容',alertType:'告警类型',unit:'单位',value:'数值',dataType:'数据类型',resultData:'计算结果',resultValue:'观测结果',originalData:'原始观测',paramData:'参数',dx:'X 位移',dy:'Y 位移',dz:'Z 位移',x:'X',y:'Y',z:'Z'}
const states:Record<string,string>={RUNNING:'运行中',OFFLINE:'离线',MAINTENANCE:'维护中',ONLINE:'在线',UNKNOWN:'未知',DISABLED:'停用',ERROR:'异常',AVAILABLE:'可播放',MISSING:'文件缺失',DELETED:'已删除',PENDING:'待处理',PROCESSING:'处理中',READY:'就绪',FAILED:'失败',EXTERNAL:'外部回放',EXPIRED:'已过期',LOW:'低',MEDIUM:'中',HIGH:'高',CRITICAL:'严重',MAIN_DAM:'主坝',AUX_DAM:'副坝',TOTAL_STATION:'全站仪',TOTAL_STATION_POINT:'全站仪测点',WEATHER_6:'气象六要素',TERMITE:'白蚁',GNSS:'GNSS',SEEPAGE_PRESSURE:'渗压',MEASURING_WEIR:'量水堰',VIDEO_CAMERA:'摄像头',CRACK_METER:'裂缝计'}
export function displayFields(row:DataRow, source='') {
  Object.assign(labels,{pointNumber:'测点编号',periodId:'期次业务 ID',periodDate:'期次日期',periodTime:'期次时间',targetType:'目标类型',prismConst:'棱镜常数',mile:'里程',ringNum:'环号',sectionNum:'断面号',stationName:'站点名称',stationType:'站点类型',stationMethods:'站点方法',alarmLevel:'告警等级',monDate:'监测日期',lon:'经度',lat:'纬度',h:'高程',workStatus:'工作状态码',bindDevice:'绑定设备',collectTimeTs:'采集时间戳',jcrq:'监测日期',data1:'原始读数',calc1:'计算结果',yqcz1:'仪器初值',voltage:'电压',flag:'标记码',devname:'设备名称',rssi:'信号强度',snr:'信噪比',comments:'备注',remark:'备注',elevation:'高程',instrumentNumber:'仪器编号',updateTime:'更新时间',ipAddress:'设备 IP',httpPort:'HTTP 端口'})
  return Object.entries(row).filter(([k])=>!/(password|passwd|secret|token|credential|rtsp|userSetkey|imei|ext$)/i.test(k)).flatMap(([key,value])=>{
    if(value&&typeof value==='object'||typeof value==='string'&&/^[\[{]/.test(value)) {
      if(!['resultData','resultValue','originalData','paramData'].includes(key)) return []
      try { const obj=typeof value==='string'?parseApiJson(value):value; if(obj&&typeof obj==='object') return Object.entries(obj).filter(([,v])=>v===null||['string','number','boolean'].includes(typeof v)).map(([k,v])=>({key:key+'.'+k,label:(labels[key]||key)+' · '+k,value:String(v??'未提供')})) } catch { /* 非结构化内容不猜测 */ }
      return []
    }
    if(/Url$/.test(key)) return []
    let shown=value===null||value===undefined||value===''?'未提供':typeof value==='boolean'?(value?'是':'否'):String(value)
    if(['status','deviceStatus','deviceType','category','zone','severity','clipStatus'].includes(key)) shown=states[shown]||shown
    if(source==='termite'&&key==='offline') shown=({'0':'在线','1':'离线','2':'失联'} as Record<string,string>)[String(value)]||shown
    if(source==='termite'&&key==='status') shown=({'0':'无蚁','1':'有蚁','2':'灭杀中','5':'已灭杀'} as Record<string,string>)[String(value)]||shown
    return [{key,label:labels[key]||key,value:shown}]
  })
}
export function safeResourceUrl(value:unknown) {
  if(typeof value!=='string'||!value.trim()) throw new Error('后端未提供文件或播放地址')
  const base=(import.meta.env.VITE_API_BASE_URL||'http://10.20.148.252:9191').replace(/\/$/,'')
  const url=new URL(value,base+'/')
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password) throw new Error('不支持此资源地址')
  return url.href
}
