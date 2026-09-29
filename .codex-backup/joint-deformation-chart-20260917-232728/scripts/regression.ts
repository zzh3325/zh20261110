import assert from 'node:assert/strict'
import { monitorCategories } from '../src/api/monitor-categories'
import { dataRequest, splitPoints, metricValue, metricsFor, dateRange, matchesOwnerProject, stationPointQuery } from '../src/api/business-monitoring'
import { buildDataQuery, unpackRows, displayFields, safeResourceUrl } from '../src/api/data-browser'
import { dataSources } from '../src/api/data-sources'
import { parseApiJson } from '../src/utils/json'
import { authHeaders, decodeResponse, request } from '../src/utils/request'
import { normalizeMeasurement } from '../src/api/monitoring'
import { saveInspection } from '../src/api/inspection'
import { uploadPhotos } from '../src/utils/photos'
import { categoryForType, deviceCategories, deviceHealth, summarizeDevices } from '../src/api/device-ledger'

const storage = new Map<string, unknown>([['auth-token', 'Bearer test-token']])
let lastRequest: any
;(globalThis as any).uni = {
  getStorageSync: (key: string) => storage.get(key),
  removeStorageSync: (key: string) => storage.delete(key),
  showToast: () => {},
  reLaunch: () => {},
  request: (options: any) => {
    lastRequest = options
    options.success({statusCode:200,data:'{"code":200,"data":{"id":1281686598253019136}}'})
  }
}

async function main() {
  const category=(key:string)=>monitorCategories.find(c=>c.key===key)!
  const req=(key:string,device:any,point:any=null)=>dataRequest(category(key),device,point,'2026-09-01','2026-09-16','2026',0)
  assert.equal(monitorCategories.length,17)
  assert.equal(new Set(monitorCategories.map(c=>c.group||c.title)).size,13)
  assert.equal(deviceCategories.length,11)
  assert.equal(categoryForType('SEEPAGE_PRESSURE')?.key,'seepage')
  assert.equal(categoryForType('RAIN_GAUGE'),undefined)
  assert.equal(deviceHealth({deviceStatus:'RUNNING'}),'online')
  assert.equal(deviceHealth({status:'ERROR'}),'offline')
  assert.deepEqual(summarizeDevices([{deviceStatus:'RUNNING'},{status:'OFFLINE'},{deviceStatus:'MAINTENANCE'},{}]),{total:4,online:1,offline:1,maintenance:1,unknown:1})
  assert.equal(req('pressure',{id:96,stationId:'1281661110109339648'}).path,'/get/sensor-points/1281661110109339648/data')
  assert.throws(()=>req('pressure',{id:96}),/stationId/)
  assert.equal(req('termite',{id:68,stationId:'102347',monitoringLocation:'device-address'}).path,'/get/monitor-points/102347/logs')
  assert.equal(req('weather',{stationId:5,ext:'{"qimiot_id":4,"address":"01"}'}).query.qimiotId,'4')
  assert.throws(()=>req('weather',{stationId:5}),/qimiotId/)
  assert.equal(req('horizontal',{stationId:'407137',monitoringLocation:'SP1'}).query.cdbh,'SP1')
  assert.throws(()=>req('horizontal',{stationId:'407137'}),/cdbh/)
  assert.throws(()=>req('horizontal',{stationId:'407137',monitoringLocation:'SP1',ext:{cdbh:'SP2'}}),/冲突/)
  assert.equal(req('main',{stationId:'1'},{id:19,pointId:2,projectId:1,ownerProject:'主坝'}).query.pointId,'2')
  assert.equal(req('main',{stationId:'1'},{pointId:2,projectId:1,ownerProject:'主坝'}).query.dataType,'measresult')
  assert.throws(()=>req('main',{stationId:'1'},{pointId:2,projectId:1,ownerProject:'副坝'}),/不匹配/)
  assert.equal(splitPoints([{ownerProject:null},{owner_project:'主坝'},{ownerProject:'副坝'}],'主坝').unassigned.length,1)
  assert.equal(splitPoints([{ownerProject:null},{owner_project:'主坝'}],'主坝').matched.length,1)
  assert.equal(matchesOwnerProject({owner_project:'近岸坡'},'近岸坡'),true)
  assert.equal(matchesOwnerProject({ownerProject:'副坝'},'主坝'),false)
  assert.equal(stationPointQuery({stationId:'5'},0,'副坝',1).ownerProject,'副坝')
  assert.equal(req('rain',{stcd:'001A'}).query.stcd,'001A')
  assert.equal(req('gate',{stcd:'001A'}).path,'/get/sqdb/was')
  assert.equal(metricValue(category('temperature'),{data1:46.6},'value'),0)
  assert.equal(metricValue(category('horizontal'),{data1:46.6},'value'),46.6)
  assert.deepEqual(metricsFor(category('horizontal')).map(item=>item.key),['value'])
  assert.deepEqual(metricsFor(category('settlement')).map(item=>item.key),['value'])
  assert.equal(metricValue(category('pressure'),{resultData:'bad'},'水压'),null)
  assert.equal(metricValue(category('pressure'),{resultData:'{"水位高程":128.6,"水位":12.3,"水压":45.6}'},'水压'),45.6)
  assert.equal(metricValue(category('flow'),{resultData:{流量:0.125}},'流量'),0.125)
  assert.equal(metricValue(category('main'),{dx:-0.001,dy:0.002,dz:0},'dx'),-0.001)
  assert.deepEqual(metricsFor(category('main')).map(item=>item.key),['dx','dy','dz'])
  assert.equal(metricValue(category('rain'),{drp:0},'drp'),0)
  assert.equal(metricValue(category('reservoir'),{RZ:2000},'RZ'),2000)
  assert.equal(metricValue(category('gnss'),{dx:-0.0005,x:999},'dx'),-0.0005)
  assert.equal(metricValue(category('termite'),{alarm:false},'alarm'),0)
  assert.throws(()=>dateRange('2026-02-30','2026-03-01'),/有效/)
  assert.equal(dateRange('2026-09-01','2026-09-16').startTime,'2026-09-01T00:00:00+08:00')
  const recordings=dataSources.find(s=>s.key==='recordings')!
  assert.throws(()=>buildDataQuery(recordings,{}),/视频流/)
  assert.throws(()=>buildDataQuery(recordings,{streamId:'1',startTime:'2026-09-14T12:00:00+08:00',endTime:'2026-09-14T11:00:00+08:00'}),/晚于/)
  const pointQuery=buildDataQuery(dataSources.find(s=>s.key==='totalData')!,{pointId:'1281686598253019136',projectId:'1',unknown:'ignored'},1)
  assert.equal(pointQuery.query.pointId,'1281686598253019136')
  assert.equal(pointQuery.query.page,1)
  assert.equal(pointQuery.query.unknown,undefined)
  assert.equal(buildDataQuery(dataSources.find(s=>s.key==='termiteLogs')!,{id:'1281686598253019136'}).path,'/get/monitor-points/1281686598253019136/logs')
  assert.deepEqual(unpackRows({content:[{id:'1'}],totalElements:42}),{rows:[{id:'1'}],total:42})
  assert.equal(unpackRows({records:[]}).total,null)
  assert.deepEqual(unpackRows(null).rows,[])
  assert.equal(unpackRows({id:'1',fileName:'archive'}).rows.length,1)
  assert.equal(displayFields({value:0})[0].value,'0')
  assert.equal(displayFields({offline:0},'termite')[0].value,'在线')
  assert.equal(displayFields({deviceStatus:'MAINTENANCE'})[0].value,'维护中')
  assert.equal(displayFields({password:'secret',token:'secret',rtspUrl:'rtsp://x'}).length,0)
  assert.equal(displayFields({resultValue:{温度:'0'}})[0].value,'0')
  assert.throws(()=>safeResourceUrl('javascript:alert(1)'),/不支持/)
  assert.throws(()=>safeResourceUrl('http://user:password@example.com'),/不支持/)
  assert.equal(safeResourceUrl('/uploads/a.jpg'),'http://10.20.148.252:9191/uploads/a.jpg')
  const parsed = parseApiJson('{"id":1281686598253019136,"name":"id 1281686598253019136","zero":0,"value":2.94e-4,"negative":-9007199254740993}') as any
  assert.equal(parsed.id, '1281686598253019136')
  assert.equal(parsed.negative, '-9007199254740993')
  assert.equal(parsed.name, 'id 1281686598253019136')
  assert.equal(parsed.value, 0.000294)
  assert.equal(parsed.zero, 0)
  assert.deepEqual(authHeaders('/login'), {})
  assert.equal(authHeaders('/get/alert').Authorization, 'Bearer test-token')
  assert.throws(() => decodeResponse(200, '{"code":500,"message":"failed","data":null}'), /failed/)
  assert.throws(() => decodeResponse(200, '<html>error</html>'), /无法解析/)
  assert.equal(decodeResponse(204, ''), null)
  const result = await request<any>({url:'/get/sensor-points',showError:false})
  assert.equal(lastRequest.dataType, 'text')
  assert.equal(result.id, '1281686598253019136')
  assert.equal(normalizeMeasurement({time:'2026-08-09T05:43:00Z',resultData:'{"流量":2.940490538799483E-4}'}).value, 2.940490538799483e-4)
  assert.equal(normalizeMeasurement({resultData:'{"流量":0}'}).value, 0)
  assert.equal(normalizeMeasurement({resultData:'invalid'}).value, null)
  await assert.rejects(() => saveInspection({}), /完整填写/)
  let uploaded = 0
  ;(globalThis as any).fetch = async (_url: string, options: any) => {
    if (options.body) {
      uploaded = options.body.getAll('photos').length
      assert.equal(options.headers.token, 'test-token')
      return new Response('{"code":500,"message":"upload rejected","data":null}', {status:200})
    }
    return new Response(new Blob(['photo'], {type:'image/jpeg'}), {status:200})
  }
  await assert.rejects(() => uploadPhotos('/admin/inspections/save', ['blob:1','blob:2']), /upload rejected/)
  assert.equal(uploaded, 2)
  storage.set('daqiao-current-user', {username:'test'})
  assert.throws(() => decodeResponse(200, '{"code":401,"message":"expired"}'), /失效/)
  assert.equal(storage.has('auth-token'), false)
  assert.equal(storage.has('daqiao-current-user'), false)
  console.log('PASS: int64、鉴权、业务错误、工程值、巡检必填、多照片上传与失效清理回归检查')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
