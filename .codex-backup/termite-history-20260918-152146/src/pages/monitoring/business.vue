<template>
 <view class="page business">
  <view class="card intro"><view class="section-title">{{ category?.title||'业务监测' }}</view><view class="muted">{{ category?.group||'工程在线监测' }}</view></view>
  <view v-if="category?.kind==='unsupported'" class="card warning">最新 Swagger 未提供可确认的岸坡钢筋应力数据接口。本分类暂不请求数据，不使用竖直位移接口替代。</view>
  <view v-else-if="auth.demoMode" class="card warning">请使用真实账号登录后查询，本页面不生成演示监测值。</view>
  <template v-else-if="category">
   <StatePanel :state="deviceState" :message="deviceError" @retry="initialize" />
   <template v-if="deviceState==='success'">
    <view class="card controls">
     <template v-if="category.kind==='total'">
      <view class="label">全站仪测站</view>
      <view class="station-grid">
       <view v-for="(device,index) in devices" :key="String(device.id??device.stationId??index)" class="station-item" :class="{active:index===deviceIndex}" @click="selectStation(index)">
        <text class="station-name">{{ stationName(device) }}</text>
        <small>{{ stationCount(device) }} 个测点</small>
       </view>
      </view>
      <view v-if="selectedDevice" class="muted meta">当前测站：{{ deviceLabel(selectedDevice) }} · {{ statusLabel(selectedDevice) }} · {{ selectedDevice.deviceNumber }}</view>
      <StatePanel :state="pointState" :message="pointError" @retry="reloadPoints" />
      <view v-if="pointNotice" class="warning">{{ pointNotice }}</view>
      <button v-if="pointNotice" size="mini" @click="openPointLedger">查看该测站测点台账（不代表工程归属）</button>
      <view v-if="pointRows.length" class="point-list">
       <view v-for="(point,index) in pointRows" :key="pointKey(point,index)" class="point-row" :class="{selected:isSelectedPoint(point)}" @click="togglePoint(point,index)">
        <view class="row between point-head"><view class="strong">{{ point.name||point.pointName||'测点 '+point.pointId }}</view><view class="point-owner" :class="{matched:isMatchedPoint(point)}">{{ pointOwner(point) }}</view></view>
        <view class="muted point-meta">测点 ID {{ point.pointId??'未提供' }} · {{ expandedPoint===pointKey(point,index)?'收起详情':'展开详情 ›' }}</view>
        <view v-if="expandedPoint===pointKey(point,index)" class="point-detail">
         <view v-for="field in pointDetails(point)" :key="field.key" class="row between detail-field"><text class="muted">{{ field.label }}</text><text selectable>{{ field.value }}</text></view>
         <view v-if="isMatchedPoint(point)" class="matched-tip">已选为当前查询测点</view>
         <view v-else class="warning mini-warning">该测点未归入当前工程分类，仅展示台账详情。</view>
        </view>
       </view>
      </view>
      <button v-if="pointsHasNext" size="mini" :disabled="pointBusy" @click="morePoints">加载更多测点</button>
     </template>
     <template v-else>
      <view class="label">设备 / 水文测站</view>
      <picker :range="deviceNames" :value="deviceIndex" @change="chooseDevice"><view class="picker-field"><text class="picker-value">{{ selectedDevice?deviceLabel(selectedDevice):'请选择' }}</text><text class="picker-arrow">⌄</text></view></picker>
      <view v-if="selectedDevice" class="muted meta">{{ statusLabel(selectedDevice) }} · {{ selectedDevice.deviceNumber||selectedDevice.stcd }}</view>
     </template>
     <template v-if="category.kind==='termite'"><view class="label">日志年份</view><input v-model="year" class="select" type="number" maxlength="4" /></template>
     <template v-else>
      <view class="label">查询日期（北京时间，包含起止日）</view>
      <view class="dates"><picker mode="date" :value="start" @change="start=dateOf($event)"><view class="picker-field compact"><text class="picker-value">{{ start }}</text><text class="picker-arrow">⌄</text></view></picker><text>至</text><picker mode="date" :value="end" @change="end=dateOf($event)"><view class="picker-field compact"><text class="picker-value">{{ end }}</text><text class="picker-arrow">⌄</text></view></picker></view>
      <view class="quick"><button v-for="range in quickRanges" :key="range.key" size="mini" @click="setRange(range.key)">{{ range.label }}</button></view>
     </template>
     <button class="btn-primary query" :disabled="busy||pointBusy||category.kind==='total'&&!points.length" @click="search">查询监测数据</button>
    </view>
    <view v-if="mappingNotice" class="card warning">{{ mappingNotice }}</view>
    <view v-if="category.key==='temperature'" class="card muted tip">按 Web 端水温规则计算：(data1 − 46.6) × 5。保留原始值，不对其他采集通道应用此公式。</view>
    <view v-if="category.key==='pressure'" class="card muted tip">保留接口原始水位、水位高程和水压；当前单位尚未确认，不擅自执行 mm→m 换算。</view>
    <view v-if="queried" class="muted tip">已应用条件：{{ appliedCaption }}。图表与列表共用此范围。</view>
    <StatePanel v-if="queried" :state="dataState" :message="dataError" @retry="retry" />
    <template v-if="queried && dataState==='success'">
     <template v-if="hasMobileChart">
      <view class="reservoir-overview">
       <view v-for="item in mobileOverview" :key="item.key" class="card overview-item"><view class="muted">{{ item.label }}</view><view class="overview-reading"><text class="overview-value">{{ item.value }}</text><text class="muted overview-unit">{{ item.unit }}</text></view></view>
      </view>
      <view class="reservoir-tabs" :style="{gridTemplateColumns:`repeat(${Math.min(mobileTabs.length,3)},1fr)`}"><view v-for="tab in mobileTabs" :key="tab.key" :class="{active:mobileGroup===tab.key}" @click="mobileGroup=tab.key">{{ tab.label }}</view></view>
      <StatePanel :state="mobileChartState" :message="mobileChartError" @retry="retryMobileChart" />
      <MultiLineChart v-if="mobileChartState==='success'" :title="mobileChartTitle" :unit="mobileUnit" :series="mobileSeries" />
      <view v-if="mobileChartState==='success'" class="muted tip">趋势图已汇总 {{ mobileChartRows.length }} 条记录{{ mobileChartTruncated?'，数据较多，仅展示前500条':'' }}；下方表格仍按接口分页展示。</view>
     </template>
     <template v-else>
      <view class="card chart-controls"><picker :range="metricNames" :value="metricIndex" @change="metricIndex=Number(indexOf($event))"><view class="picker-field"><text class="picker-value">观测指标：{{ selectedMetric?.label }}</text><text class="picker-arrow">⌄</text></view></picker><view class="muted tip">单位：{{ selectedMetric?.unit||'接口未明确，保留原值' }}</view></view>
      <TrendChart v-if="chartPoints.some(p=>p.value!==null)" :title="'当前页 · '+selectedMetric?.label" :unit="selectedMetric?.unit" :points="chartPoints" />
     </template>
     <view class="muted tip">第 {{ page+1 }} 页 · 本页 {{ records.length }} 条 · {{ total===null?'总数未返回':'共 '+total+' 条' }}；不是完整历史曲线。</view>
     <view v-for="(record,index) in records" :key="String(record.id??record.ukid??index)" class="card reading">
      <view class="strong" selectable>{{ recordTime(record)||'时间未提供' }}</view>
      <view v-for="metric in metrics" :key="metric.key" class="row between value"><text class="muted">{{ metric.label }}</text><text selectable>{{ showValue(record,metric.key) }} {{ metric.unit }}</text></view>
     </view>
    </template>
    <view v-if="queried&&(dataState==='success'||dataState==='empty')" class="pager"><button :disabled="busy||page===0" @click="fetchPage(page-1)">上一页</button><text>{{ page+1 }}</text><button :disabled="busy||!hasNext" @click="fetchPage(page+1)">下一页</button></view>
    <view v-if="source" class="muted source" selectable>数据来源 GET {{ source }}</view>
   </template>
  </template>
 </view>
</template>
<script setup lang="ts">
import { computed,ref } from 'vue'
import { onLoad,onUnload } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import TrendChart from '@/components/TrendChart.vue'
import MultiLineChart,{type LineSeries} from '@/components/MultiLineChart.vue'
import { useAuthStore } from '@/stores/auth'
import { monitorCategories,type MonitorCategory } from '@/api/monitor-categories'
import { openDataSource } from '@/api/data-sources'
import { displayFields } from '@/api/data-browser'
import { loadDevices,loadStationPoints,loadStationPointCount,splitPoints,loadReadings,loadBusinessChart,dataRequest,metricsFor,metricValue,recordTime,deviceLabel,statusLabel,stringValue,pointOwnerProject,matchesOwnerProject,PAGE_SIZE,type Row } from '@/api/business-monitoring'
import type { LoadState } from '@/types/domain'
const auth=useAuthStore(),category=ref<MonitorCategory>(),devices=ref<Row[]>([]),deviceIndex=ref(0),points=ref<Row[]>([]),pointRows=ref<Row[]>([]),pointIndex=ref(0),expandedPoint=ref(''),stationCounts=ref<Record<string,number|null>>({}),pointState=ref<LoadState>('success'),pointError=ref(''),pointNotice=ref(''),pointBusy=ref(false),pointPage=ref(0),pointTotal=ref<number|null>(null),pointRawCount=ref(0),lastPointCount=ref(0)
const deviceState=ref<LoadState>('loading'),deviceError=ref(''),dataState=ref<LoadState>('success'),dataError=ref(''),busy=ref(false),queried=ref(false),records=ref<Row[]>([]),total=ref<number|null>(null),page=ref(0),metricIndex=ref(0),source=ref(''),mappingNotice=ref(''),start=ref(''),end=ref(''),year=ref(String(new Date().getFullYear()))
const mobileGroup=ref('level'),mobileChartState=ref<LoadState>('success'),mobileChartError=ref(''),mobileChartRows=ref<Row[]>([]),mobileChartTruncated=ref(false)
const applied=ref({start:'',end:'',year:''})
let epoch=0,pointEpoch=0,initEpoch=0,mobileEpoch=0,unassigned=0
const selectedDevice=computed(()=>devices.value[deviceIndex.value])
const deviceNames=computed(()=>devices.value.map(deviceLabel))
const metrics=computed(()=>category.value?metricsFor(category.value):[]),metricNames=computed(()=>metrics.value.map(m=>m.label)),selectedMetric=computed(()=>metrics.value[metricIndex.value])
const hasNext=computed(()=>total.value===null?records.value.length===PAGE_SIZE:(page.value+1)*PAGE_SIZE<total.value)
const pointsHasNext=computed(()=>pointTotal.value===null?lastPointCount.value===PAGE_SIZE:pointRawCount.value<pointTotal.value)
const appliedCaption=computed(()=>category.value?.kind==='termite'?applied.value.year+' 年':applied.value.start+' 至 '+applied.value.end)
const chartPoints=computed(()=>records.value.map(r=>({time:recordTime(r),value:metricValue(category.value!,r,selectedMetric.value?.key||'')})).sort((a,b)=>a.time.localeCompare(b.time)))
interface MobileDefinition {key:string;label:string;color:string}
interface MobileTab {key:string;label:string;unit:string;series:MobileDefinition[]}
interface MobileOverview {key:string;label:string;unit:string}
const hasMobileChart=computed(()=>['reservoir','gate','rain','gnss','weather','temperature','horizontal','settlement','joint','pressure','flow','main','aux','slope'].includes(category.value?.key||''))
const mobileConfig=computed<{tabs:MobileTab[];overview:MobileOverview[]}>(()=>{
 if(category.value?.kind==='total')return {tabs:[{key:'displacement',label:'位移分量',unit:'m',series:[{key:'dx',label:'dX',color:'#1263d6'},{key:'dy',label:'dY',color:'#e25252'},{key:'dz',label:'dZ',color:'#477b2f'}]}],overview:[{key:'dx',label:'最新 dX',unit:'m'},{key:'dy',label:'最新 dY',unit:'m'},{key:'dz',label:'最新 dZ',unit:'m'}]}
 if(category.value?.key==='pressure')return {tabs:[{key:'elevation',label:'水位高程',unit:'接口原值',series:[{key:'水位高程',label:'水位高程',color:'#1263d6'}]},{key:'level',label:'水位',unit:'接口原值',series:[{key:'水位',label:'水位',color:'#119c92'}]},{key:'pressure',label:'水压',unit:'接口原值',series:[{key:'水压',label:'水压',color:'#7548cc'}]}],overview:[{key:'水位高程',label:'最新水位高程',unit:'接口原值'},{key:'水位',label:'最新水位',unit:'接口原值'},{key:'水压',label:'最新水压',unit:'接口原值'}]}
 if(category.value?.key==='flow')return {tabs:[{key:'flow',label:'渗流量',unit:'m³/s',series:[{key:'流量',label:'流量',color:'#119c92'}]}],overview:[{key:'流量',label:'最新渗流量',unit:'m³/s'}]}
 if(category.value?.key==='joint')return {tabs:[{key:'joint',label:'接缝位移',unit:'mm',series:[{key:'value',label:'接缝位移',color:'#7548cc'}]}],overview:[{key:'value',label:'最新接缝位移',unit:'mm'}]}
 if(category.value?.key==='horizontal')return {tabs:[{key:'horizontal',label:'水平位移',unit:'mm',series:[{key:'value',label:'水平位移',color:'#1263d6'}]}],overview:[{key:'value',label:'最新水平位移',unit:'mm'}]}
 if(category.value?.key==='settlement')return {tabs:[{key:'settlement',label:'水位高度',unit:'mm',series:[{key:'value',label:'水位高度',color:'#119c92'}]}],overview:[{key:'value',label:'最新水位高度',unit:'mm'}]}
 if(category.value?.key==='gnss')return {tabs:[{key:'component',label:'位移分量',unit:'接口原值',series:[{key:'dx',label:'X 位移',color:'#1263d6'},{key:'dy',label:'Y 位移',color:'#e25252'},{key:'dz',label:'Z 位移',color:'#477b2f'}]},{key:'resultant',label:'合位移',unit:'接口原值',series:[{key:'displacement',label:'三维合位移',color:'#7548cc'}]}],overview:[{key:'dx',label:'最新 X 位移',unit:'接口原值'},{key:'dy',label:'最新 Y 位移',unit:'接口原值'},{key:'dz',label:'最新 Z 位移',unit:'接口原值'},{key:'displacement',label:'三维合位移',unit:'接口原值'}]}
 if(category.value?.key==='weather')return {tabs:[{key:'temperature',label:'温度',unit:'℃',series:[{key:'温度',label:'温度',color:'#e25252'}]},{key:'humidity',label:'湿度',unit:'%',series:[{key:'湿度',label:'湿度',color:'#1263d6'}]},{key:'pressure',label:'气压',unit:'接口原值',series:[{key:'气压',label:'气压',color:'#7548cc'}]},{key:'windSpeed',label:'风速',unit:'接口原值',series:[{key:'风速数据',label:'风速',color:'#119c92'}]},{key:'windDirection',label:'风向',unit:'接口原值',series:[{key:'风向数据',label:'风向',color:'#477b2f'}]},{key:'rainfall',label:'降雨',unit:'mm',series:[{key:'降雨量',label:'降雨量',color:'#2b82c9'}]}],overview:[{key:'温度',label:'最新温度',unit:'℃'},{key:'湿度',label:'最新湿度',unit:'%'},{key:'气压',label:'最新气压',unit:'接口原值'},{key:'风速数据',label:'最新风速',unit:'接口原值'},{key:'风向数据',label:'最新风向',unit:'接口原值'},{key:'降雨量',label:'最新降雨量',unit:'mm'}]}
 if(category.value?.key==='temperature')return {tabs:[{key:'temperature',label:'水温',unit:'℃',series:[{key:'value',label:'计算水温',color:'#1263d6'}]},{key:'raw',label:'原始值',unit:'接口原值',series:[{key:'data1',label:'原始 data1',color:'#7548cc'}]}],overview:[{key:'value',label:'最新水温',unit:'℃'},{key:'data1',label:'最新原始值',unit:'接口原值'}]}
 if(category.value?.key==='gate')return {tabs:[{key:'level',label:'水位',unit:'m',series:[{key:'upz',label:'闸上水位',color:'#1263d6'},{key:'dwz',label:'闸下水位',color:'#119c92'}]},{key:'flow',label:'流量',unit:'m³/s',series:[{key:'tgtq',label:'过闸流量',color:'#e28a11'}]}],overview:[{key:'upz',label:'最新闸上水位',unit:'m'},{key:'dwz',label:'最新闸下水位',unit:'m'},{key:'tgtq',label:'最新过闸流量',unit:'m³/s'}]}
 if(category.value?.key==='rain')return {tabs:[{key:'rain',label:'降雨量',unit:'mm',series:[{key:'drp',label:'时段降水量',color:'#1263d6'},{key:'dyp',label:'日降水量',color:'#7548cc'}]},{key:'period',label:'时段',unit:'接口原值',series:[{key:'intv',label:'时段长',color:'#119c92'},{key:'pdr',label:'降水历时',color:'#e28a11'}]}],overview:[{key:'drp',label:'最新时段降水量',unit:'mm'},{key:'dyp',label:'最新日降水量',unit:'mm'},{key:'intv',label:'时段长',unit:'接口原值'},{key:'pdr',label:'降水历时',unit:'接口原值'}]}
 return {tabs:[{key:'level',label:'水位',unit:'m',series:[{key:'RZ',label:'库水位',color:'#1263d6'},{key:'CKFLZ',label:'校核水位',color:'#119c92'},{key:'FSLTDZ',label:'汛限水位',color:'#7548cc'}]},{key:'flow',label:'流量',unit:'m³/s',series:[{key:'INQ',label:'入库流量',color:'#477b2f'},{key:'OTQ',label:'出库流量',color:'#e28a11'}]},{key:'storage',label:'蓄水量',unit:'m³',series:[{key:'W',label:'蓄水量',color:'#e25252'}]}],overview:[{key:'RZ',label:'最新库水位',unit:'m'},{key:'W',label:'最新蓄水量',unit:'m³'},{key:'INQ',label:'入库流量',unit:'m³/s'},{key:'OTQ',label:'出库流量',unit:'m³/s'}]}
})
const mobileTabs=computed(()=>mobileConfig.value.tabs)
const activeMobileTab=computed(()=>mobileTabs.value.find(tab=>tab.key===mobileGroup.value)||mobileTabs.value[0])
const mobileUnit=computed(()=>activeMobileTab.value?.unit||'接口原值')
const sortedMobileRows=computed(()=>[...mobileChartRows.value].sort((a,b)=>recordTime(a).localeCompare(recordTime(b))))
const latestMobileRow=computed(()=>sortedMobileRows.value[sortedMobileRows.value.length-1])
const mobileOverview=computed(()=>mobileConfig.value.overview.map(item=>({...item,value:showOverview(latestMobileRow.value,item.key)})))
const mobileSeries=computed<LineSeries[]>(()=>(activeMobileTab.value?.series||[]).map(definition=>({...definition,points:sampleRows(sortedMobileRows.value,160).map(row=>({time:recordTime(row),value:metricValue(category.value!,row,definition.key)}))})))
const mobileChartTitle=computed(()=>`${chartSubject.value} · ${activeMobileTab.value?.label||''}趋势`)
const chartSubject=computed(()=>category.value?.kind==='total'?`${deviceLabel(selectedDevice.value||{})} / ${deviceLabel(points.value[pointIndex.value]||{})}`:deviceLabel(selectedDevice.value||{}))
const quickRanges=[{key:'7',label:'近 7 天'},{key:'15',label:'近 15 天'},{key:'30',label:'近 30 天'},{key:'90',label:'近 90 天'},{key:'halfYear',label:'近半年'},{key:'year',label:'近一年'}]
function dateOf(e:unknown){return String((e as {detail:{value:string}}).detail.value)}
function indexOf(e:unknown){return dateOf(e)}
function beijingDay(date:Date){return new Date(date.getTime()+8*3600000).toISOString().slice(0,10)}
function setRange(key:number|string){const now=new Date();end.value=beijingDay(now);if(key==='halfYear'||key==='year'){const startDate=new Date(now);if(key==='halfYear')startDate.setMonth(startDate.getMonth()-6);else startDate.setFullYear(startDate.getFullYear()-1);start.value=beijingDay(startDate);return}const days=Number(key);start.value=beijingDay(new Date(now.getTime()-(days-1)*86400000))}
function errorText(e:unknown){return e instanceof Error?e.message:'请求失败'}
function stationKey(device:Row){return stringValue(device.stationId??device.id)}
function stationName(device:Row){return deviceLabel(device).replace(/^大桥水库观测房/,'').replace(/^大桥水库/,'')}
function stationCount(device:Row){const count=stationCounts.value[stationKey(device)];return count===null||count===undefined?'--':count}
function pointKey(point:Row,index=0){return stringValue(point.pointId??point.id??index)}
function pointOwner(point:Row){return pointOwnerProject(point)||'工程归属未设置'}
function isMatchedPoint(point:Row){return matchesOwnerProject(point,category.value?.owner||'')}
function isSelectedPoint(point:Row){return isMatchedPoint(point)&&pointKey(point)===pointKey(points.value[pointIndex.value]||{})}
function pointDetails(point:Row){return displayFields(point,'totalPoints').filter(field=>!['name','pointName','pointId','ownerProject','owner_project'].includes(field.key))}
function togglePoint(point:Row,index:number){const key=pointKey(point,index);expandedPoint.value=expandedPoint.value===key?'':key;if(isMatchedPoint(point)){const matchedIndex=points.value.findIndex(item=>pointKey(item)===key);if(matchedIndex>=0){pointIndex.value=matchedIndex;clearData()}}}
function openPointLedger(){if(selectedDevice.value)openDataSource('totalPoints',{projectId:selectedDevice.value.stationId})}
function sampleRows(rows:Row[],limit:number){if(rows.length<=limit)return rows;const result:Row[]=[];for(let index=0;index<limit;index++)result.push(rows[Math.round(index*(rows.length-1)/(limit-1))]);return result}
function showOverview(row:Row|undefined,key:string){if(!row)return '--';const value=metricValue(category.value!,row,key);if(value===null)return '--';return Math.abs(value)>=1000?value.toFixed(0):Math.abs(value)>=100?value.toFixed(1):value.toFixed(2)}
function clearData(){epoch++;mobileEpoch++;busy.value=false;queried.value=false;records.value=[];page.value=0;total.value=null;source.value='';mappingNotice.value='';dataError.value='';mobileChartRows.value=[];mobileChartState.value='success';mobileChartError.value='';mobileChartTruncated.value=false}
async function initialize(){
 const ticket=++initEpoch;clearData();deviceState.value='loading'
 try{const rows=await loadDevices(category.value!);if(ticket!==initEpoch)return;devices.value=rows;deviceIndex.value=0;deviceState.value=rows.length?'success':'empty';if(rows.length){if(category.value?.kind==='total')void loadStationCounts(rows,ticket);await selectCurrentDevice()}}catch(e){if(ticket===initEpoch){deviceError.value=errorText(e);deviceState.value='error'}}
}
async function loadStationCounts(rows:Row[],ticket:number){
 const owner=category.value?.owner||'';const results=await Promise.allSettled(rows.map(device=>loadStationPointCount(device,owner)));if(ticket!==initEpoch)return
 const counts:Record<string,number|null>={};rows.forEach((device,index)=>{const result=results[index];counts[stationKey(device)]=result.status==='fulfilled'?result.value:null});stationCounts.value=counts
}
async function selectCurrentDevice(){
 clearData();points.value=[];pointRows.value=[];pointIndex.value=0;expandedPoint.value='';pointNotice.value='';pointEpoch++;pointBusy.value=false
 if(category.value?.kind==='total')await reloadPoints()
 else search()
}
function chooseDevice(e:unknown){deviceIndex.value=Number(indexOf(e));selectCurrentDevice()}
function selectStation(index:number){if(index===deviceIndex.value&&pointRows.value.length)return;deviceIndex.value=index;selectCurrentDevice()}
async function reloadPoints(){points.value=[];pointRows.value=[];pointPage.value=0;pointRawCount.value=0;lastPointCount.value=0;pointTotal.value=null;unassigned=0;pointNotice.value='';pointBusy.value=false;pointEpoch++;clearData();await fetchPoints(0)}
async function morePoints(){await fetchPoints(pointPage.value+1)}
async function fetchPoints(target:number){
 if(pointBusy.value||!selectedDevice.value)return
 const ticket=pointEpoch;pointBusy.value=true;pointState.value='loading';pointError.value=''
 try{
  const res=await loadStationPoints(selectedDevice.value,target,category.value!.owner);if(ticket!==pointEpoch)return
  const split=splitPoints(res.rows,category.value!.owner!)
  pointRows.value=[...pointRows.value,...split.matched];points.value=[...points.value,...split.matched];unassigned+=split.unassigned.length
  pointPage.value=target;pointRawCount.value+=res.rows.length;lastPointCount.value=res.rows.length;pointTotal.value=res.total
  pointNotice.value='按 ownerProject="'+category.value!.owner+'" 匹配：该测站共 '+(res.total??points.value.length)+' 个测点，当前已加载 '+points.value.length+' 个。'+(pointsHasNext.value?'可继续加载。':'')
  pointState.value=pointRows.value.length?'success':'empty'
  if(points.value.length&&!queried.value)search()
 }catch(e){if(ticket===pointEpoch){pointError.value=errorText(e);pointState.value='error'}}
 finally{if(ticket===pointEpoch)pointBusy.value=false}
}
function search(){
 if(!selectedDevice.value||!category.value)return
 try{dataRequest(category.value,selectedDevice.value,points.value[pointIndex.value]||null,start.value,end.value,year.value,0)}
 catch(e){clearData();mappingNotice.value=errorText(e);return}
 applied.value={start:start.value,end:end.value,year:year.value};mappingNotice.value='';fetchPage(0);if(hasMobileChart.value)void fetchMobileChartData()
}
async function fetchMobileChartData(){if(!selectedDevice.value||!category.value)return;const ticket=++mobileEpoch;mobileChartState.value='loading';mobileChartError.value='';mobileChartRows.value=[];try{const point=category.value.kind==='total'?points.value[pointIndex.value]||null:null;const result=await loadBusinessChart(category.value,selectedDevice.value,point,applied.value.start,applied.value.end);if(ticket!==mobileEpoch)return;mobileChartRows.value=result.rows;mobileChartTruncated.value=result.truncated;mobileChartState.value=result.rows.length?'success':'empty'}catch(e){if(ticket===mobileEpoch){mobileChartError.value=errorText(e);mobileChartState.value='error'}}}
function retryMobileChart(){fetchMobileChartData()}
function retry(){fetchPage(page.value)}
async function fetchPage(target:number){
 if(!selectedDevice.value||!category.value)return
 const ticket=++epoch;busy.value=true;queried.value=true;dataState.value='loading';records.value=[]
 try{
  const res=await loadReadings(category.value,selectedDevice.value,points.value[pointIndex.value]||null,applied.value.start,applied.value.end,applied.value.year,target)
  if(ticket!==epoch)return
  records.value=res.rows;total.value=res.total;page.value=target;source.value=res.source;dataState.value=res.rows.length?'success':'empty'
 }catch(e){if(ticket===epoch){dataError.value=errorText(e);dataState.value='error'}}
 finally{if(ticket===epoch)busy.value=false}
}
function showValue(row:Row,key:string){const value=metricValue(category.value!,row,key);if(value===null)return '未提供';if(category.value?.kind==='termite'&&key==='alarm')return value===1?'有告警':'无告警';return value}
onLoad(options=>{category.value=monitorCategories.find(c=>c.key===options?.category);setRange(7);if(!category.value){deviceState.value='error';deviceError.value='未知监测分类';return}mobileGroup.value=mobileConfig.value.tabs[0]?.key||'';uni.setNavigationBarTitle({title:category.value.title});if(category.value.kind!=='unsupported'&&!auth.demoMode)initialize()})
onUnload(()=>{epoch++;pointEpoch++;initEpoch++;mobileEpoch++})
</script>
<style scoped>
.intro .section-title{margin-top:0}.controls,.reading,.warning,.chart-controls{margin-top:20rpx}.label{font-size:25rpx;margin:22rpx 0 12rpx}.select{background:#edf6f3;padding:20rpx;border-radius:13rpx;font-size:24rpx;height:auto;min-height:35rpx}.station-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10rpx}.station-item{min-height:210rpx;padding:14rpx 2rpx;border:1rpx solid #dbe8e5;border-radius:16rpx;background:#f8fbfa;color:#617572;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12rpx}.station-item.active{color:#fff;background:#087f72;border-color:#087f72;box-shadow:0 8rpx 20rpx #087f7230}.station-name{writing-mode:vertical-rl;text-orientation:upright;letter-spacing:2rpx;white-space:nowrap;font-size:22rpx}.station-item small{font-size:18rpx;padding:6rpx 8rpx;border-radius:999rpx;background:#eaf2f0}.station-item.active small{background:#ffffff2b}.point-list{display:flex;flex-direction:column;gap:12rpx;margin-top:18rpx}.point-row{padding:18rpx;border:1rpx solid #e1ebe9;border-radius:15rpx;background:#fff}.point-row.selected{border-color:#0b9b88;background:#f0faf7}.point-head{gap:16rpx}.point-head .strong{font-size:24rpx;overflow-wrap:anywhere}.point-owner{flex:none;font-size:19rpx;color:#a16718;background:#fff2dc;padding:6rpx 10rpx;border-radius:999rpx}.point-owner.matched{color:#087f72;background:#e1f5ed}.point-meta{font-size:20rpx;margin-top:9rpx}.point-detail{margin-top:15rpx;padding-top:6rpx;border-top:1rpx dashed #dce8e5}.detail-field{gap:18rpx;padding:12rpx 0;border-bottom:1rpx solid #edf3f1;font-size:21rpx}.detail-field text:first-child{flex:0 0 36%}.detail-field text:last-child{text-align:right;overflow-wrap:anywhere}.matched-tip{color:#087f72;font-size:21rpx;margin-top:14rpx}.mini-warning{font-size:20rpx;padding:12rpx;margin-top:12rpx}.reservoir-overview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14rpx;margin-top:20rpx}.overview-item{padding:20rpx}.overview-item>.muted:first-child{font-size:20rpx}.overview-reading{display:flex;align-items:baseline;justify-content:space-between;gap:10rpx;min-width:0;margin-top:8rpx}.overview-value{min-width:0;font-size:36rpx;font-weight:900;color:#075e56;overflow-wrap:anywhere}.overview-unit{flex:none;font-size:18rpx;white-space:nowrap}.reservoir-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8rpx;background:#e7efed;border-radius:18rpx;padding:8rpx;margin-top:20rpx}.reservoir-tabs view{text-align:center;padding:17rpx 6rpx;border-radius:13rpx;color:#6c7e7b;font-size:23rpx}.reservoir-tabs .active{background:#fff;color:#087f72;font-weight:800;box-shadow:0 4rpx 12rpx #183d3820}.meta,.tip{font-size:22rpx;line-height:1.8;margin:16rpx 0}.dates{display:flex;align-items:center;gap:12rpx}.dates picker{flex:1;min-width:0}.quick{display:flex;flex-wrap:wrap;gap:10rpx;margin-top:16rpx}.quick button{margin:0;font-size:22rpx}.query{margin-top:25rpx}.warning{color:#8b651f;background:#fff6df;font-size:24rpx;line-height:1.8;padding:20rpx;border-radius:14rpx}.value{padding:18rpx 0;border-bottom:1rpx solid #edf3f1;font-size:24rpx;gap:20rpx}.value>text:last-child{text-align:right;overflow-wrap:anywhere}.pager{display:flex;gap:20rpx;align-items:center;margin-top:25rpx}.pager button{flex:1;font-size:24rpx}.source{font-size:20rpx;overflow-wrap:anywhere;margin-top:20rpx}
.quick{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6rpx;flex-wrap:nowrap}
.quick button{width:100%;min-width:0;margin:0;padding:0 2rpx;font-size:18rpx;line-height:56rpx;white-space:nowrap}
.quick button::after{border-radius:8rpx}
</style>
