import { http } from '@/utils/request'
import { unpackRows,type DataRow } from '@/api/data-browser'
import { objectValue,stringValue } from '@/api/business-monitoring'

function numeric(value:unknown):number|undefined{
  if(value===null||value===undefined||String(value).trim()==='')return undefined
  const result=Number(value)
  return Number.isFinite(result)?result:undefined
}

export function normalizeHydrology(row:DataRow){
  return {
    currentWaterLevel:numeric(row.RZ??row.rz),
    floodLimitWaterLevel:numeric(row.FSLTDZ??row.fsltdz),
    normalWaterLevel:numeric(row.CKFLZ??row.ckflz),
    time:stringValue(row.FULLTM??row.fulltm??row.TM??row.tm)
  }
}

export function normalizeLatestWeather(row:DataRow){
  const values=objectValue(row.resultValue)
  return {
    temperature:numeric(values['温度']),
    humidity:numeric(values['湿度']),
    rainfall:numeric(values['降雨量']??values['雨量']??values['降水量']),
    time:stringValue(row.collectTime??row.time)
  }
}

export async function loadLatestHydrology(){
  const result=unpackRows(await http.get('/get/sqdb/rsvr',{page:0,size:1},{showError:false}))
  if(!result.rows.length)throw new Error('水库水情接口暂无记录')
  return normalizeHydrology(result.rows[0])
}

export async function loadLatestWeather(){
  const devices=unpackRows(await http.get('/get/device/type/WEATHER_6',undefined,{showError:false})).rows
  const device=devices.find(item=>stringValue(item.deviceType)==='WEATHER_6')||devices[0]
  if(!device)throw new Error('气象设备台账暂无记录')
  const ext=objectValue(device.ext)
  const qimiotId=stringValue(ext.qimiot_id??ext.qimiotId)
  const address=stringValue(ext.address)
  if(!qimiotId||!address)throw new Error('气象设备缺少 qimiotId 或 address')
  const result=unpackRows(await http.get('/get/qimmos/meteo/data/latest',{qimiotId,address},{showError:false}))
  if(!result.rows.length)throw new Error('最新气象接口暂无记录')
  return normalizeLatestWeather(result.rows[0])
}
