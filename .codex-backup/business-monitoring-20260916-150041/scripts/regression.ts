import assert from 'node:assert/strict'
import { buildDataQuery, unpackRows, displayFields, safeResourceUrl } from '../src/api/data-browser'
import { dataSources } from '../src/api/data-sources'
import { parseApiJson } from '../src/utils/json'
import { authHeaders, decodeResponse, request } from '../src/utils/request'
import { normalizeMeasurement } from '../src/api/monitoring'
import { saveInspection } from '../src/api/inspection'
import { uploadPhotos } from '../src/utils/photos'

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
