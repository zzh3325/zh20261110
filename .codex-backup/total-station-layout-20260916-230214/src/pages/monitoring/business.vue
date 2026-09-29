<template>
 <view class="page business">
  <view class="card intro"><view class="section-title">{{ category?.title||'业务监测' }}</view><view class="muted">{{ category?.group||'工程在线监测' }}</view></view>
  <view v-if="category?.kind==='unsupported'" class="card warning">最新 Swagger 未提供可确认的岸坡钢筋应力数据接口。本分类暂不请求数据，不使用竖直位移接口替代。</view>
  <view v-else-if="auth.demoMode" class="card warning">请使用真实账号登录后查询，本页面不生成演示监测值。</view>
  <template v-else-if="category">
   <StatePanel :state="deviceState" :message="deviceError" @retry="initialize" />
   <template v-if="deviceState==='success'">
    <view class="card controls">
     <view class="label">{{ category.kind==='total'?'全站仪测站':'设备 / 水文测站' }}</view>
     <picker :range="deviceNames" :value="deviceIndex" @change="chooseDevice"><view class="select">{{ selectedDevice?deviceLabel(selectedDevice):'请选择' }} ⌄</view></picker>
     <view v-if="selectedDevice" class="muted meta">{{ statusLabel(selectedDevice) }} · {{ selectedDevice.deviceNumber||selectedDevice.stcd }}</view>
     <template v-if="category.kind==='total'">
      <StatePanel :state="pointState" :message="pointError" @retry="reloadPoints" />
      <view v-if="pointNotice" class="warning">{{ pointNotice }}</view>
      <button v-if="pointNotice" size="mini" @click="openPointLedger">查看该测站测点台账（不代表工程归属）</button>
      <picker v-if="points.length" :range="pointNames" :value="pointIndex" @change="choosePoint"><view class="select">{{ points[pointIndex]?.name||'选择测点' }} ⌄</view></picker>
      <button v-if="pointsHasNext" size="mini" :disabled="pointBusy" @click="morePoints">加载更多测点</button>
     </template>
     <template v-if="category.kind==='termite'"><view class="label">日志年份</view><input v-model="year" class="select" type="number" maxlength="4" /></template>
     <template v-else>
      <view class="label">查询日期（北京时间，包含起止日）</view>
      <view class="dates"><picker mode="date" :value="start" @change="start=dateOf($event)"><view class="select">{{ start }}</view></picker><text>至</text><picker mode="date" :value="end" @change="end=dateOf($event)"><view class="select">{{ end }}</view></picker></view>
      <view class="quick"><button v-for="days in [7,15,30,90]" :key="days" size="mini" @click="setRange(days)">近 {{ days }} 天</button></view>
     </template>
     <button class="btn-primary query" :disabled="busy||pointBusy||category.kind==='total'&&!points.length" @click="search">查询监测数据</button>
    </view>
    <view v-if="mappingNotice" class="card warning">{{ mappingNotice }}</view>
    <view v-if="category.key==='temperature'" class="card muted tip">按 Web 端水温规则计算：(data1 − 46.6) × 5。保留原始值，不对其他采集通道应用此公式。</view>
    <view v-if="category.key==='pressure'" class="card muted tip">保留接口原始水位、水位高程和水压；当前单位尚未确认，不擅自执行 mm→m 换算。</view>
    <view v-if="queried" class="muted tip">已应用条件：{{ appliedCaption }}。图表与列表共用此范围。</view>
    <StatePanel v-if="queried" :state="dataState" :message="dataError" @retry="retry" />
    <template v-if="queried && dataState==='success'">
     <view class="card chart-controls"><picker :range="metricNames" :value="metricIndex" @change="metricIndex=Number(indexOf($event))"><view>观测指标：{{ selectedMetric?.label }} ⌄</view></picker><view class="muted tip">单位：{{ selectedMetric?.unit||'接口未明确，保留原值' }}</view></view>
     <TrendChart v-if="chartPoints.some(p=>p.value!==null)" :title="'当前页 · '+selectedMetric?.label" :unit="selectedMetric?.unit" :points="chartPoints" />
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
import { useAuthStore } from '@/stores/auth'
import { monitorCategories,type MonitorCategory } from '@/api/monitor-categories'
import { openDataSource } from '@/api/data-sources'
import { loadDevices,loadStationPoints,splitPoints,loadReadings,dataRequest,metricsFor,metricValue,recordTime,deviceLabel,statusLabel,PAGE_SIZE,type Row } from '@/api/business-monitoring'
import type { LoadState } from '@/types/domain'
const auth=useAuthStore(),category=ref<MonitorCategory>(),devices=ref<Row[]>([]),deviceIndex=ref(0),points=ref<Row[]>([]),pointIndex=ref(0),pointState=ref<LoadState>('success'),pointError=ref(''),pointNotice=ref(''),pointBusy=ref(false),pointPage=ref(0),pointTotal=ref<number|null>(null),pointRawCount=ref(0),lastPointCount=ref(0)
const deviceState=ref<LoadState>('loading'),deviceError=ref(''),dataState=ref<LoadState>('success'),dataError=ref(''),busy=ref(false),queried=ref(false),records=ref<Row[]>([]),total=ref<number|null>(null),page=ref(0),metricIndex=ref(0),source=ref(''),mappingNotice=ref(''),start=ref(''),end=ref(''),year=ref(String(new Date().getFullYear()))
const applied=ref({start:'',end:'',year:''})
let epoch=0,pointEpoch=0,initEpoch=0,unassigned=0
const selectedDevice=computed(()=>devices.value[deviceIndex.value])
const deviceNames=computed(()=>devices.value.map(deviceLabel)),pointNames=computed(()=>points.value.map(r=>String(r.name||r.pointId)))
const metrics=computed(()=>category.value?metricsFor(category.value):[]),metricNames=computed(()=>metrics.value.map(m=>m.label)),selectedMetric=computed(()=>metrics.value[metricIndex.value])
const hasNext=computed(()=>total.value===null?records.value.length===PAGE_SIZE:(page.value+1)*PAGE_SIZE<total.value)
const pointsHasNext=computed(()=>pointTotal.value===null?lastPointCount.value===PAGE_SIZE:pointRawCount.value<pointTotal.value)
const appliedCaption=computed(()=>category.value?.kind==='termite'?applied.value.year+' 年':applied.value.start+' 至 '+applied.value.end)
const chartPoints=computed(()=>records.value.map(r=>({time:recordTime(r),value:metricValue(category.value!,r,selectedMetric.value?.key||'')})).sort((a,b)=>a.time.localeCompare(b.time)))
function dateOf(e:unknown){return String((e as {detail:{value:string}}).detail.value)}
function indexOf(e:unknown){return dateOf(e)}
function beijingDay(date:Date){return new Date(date.getTime()+8*3600000).toISOString().slice(0,10)}
function setRange(days:number){const now=new Date();end.value=beijingDay(now);start.value=beijingDay(new Date(now.getTime()-(days-1)*86400000))}
function errorText(e:unknown){return e instanceof Error?e.message:'请求失败'}
function openPointLedger(){if(selectedDevice.value)openDataSource('totalPoints',{projectId:selectedDevice.value.stationId})}
function clearData(){epoch++;busy.value=false;queried.value=false;records.value=[];page.value=0;total.value=null;source.value='';mappingNotice.value='';dataError.value=''}
async function initialize(){
 const ticket=++initEpoch;clearData();deviceState.value='loading'
 try{const rows=await loadDevices(category.value!);if(ticket!==initEpoch)return;devices.value=rows;deviceIndex.value=0;deviceState.value=rows.length?'success':'empty';if(rows.length)await selectCurrentDevice()}catch(e){if(ticket===initEpoch){deviceError.value=errorText(e);deviceState.value='error'}}
}
async function selectCurrentDevice(){
 clearData();points.value=[];pointIndex.value=0;pointNotice.value='';pointEpoch++;pointBusy.value=false
 if(category.value?.kind==='total')await reloadPoints()
 else search()
}
function chooseDevice(e:unknown){deviceIndex.value=Number(indexOf(e));selectCurrentDevice()}
function choosePoint(e:unknown){pointIndex.value=Number(indexOf(e));clearData();search()}
async function reloadPoints(){points.value=[];pointPage.value=0;pointRawCount.value=0;lastPointCount.value=0;pointTotal.value=null;unassigned=0;pointNotice.value='';pointBusy.value=false;pointEpoch++;clearData();await fetchPoints(0)}
async function morePoints(){await fetchPoints(pointPage.value+1)}
async function fetchPoints(target:number){
 if(pointBusy.value||!selectedDevice.value)return
 const ticket=pointEpoch;pointBusy.value=true;pointState.value='loading';pointError.value=''
 try{
  const res=await loadStationPoints(selectedDevice.value,target);if(ticket!==pointEpoch)return
  const split=splitPoints(res.rows,category.value!.owner!)
  points.value=[...points.value,...split.matched];unassigned+=split.unassigned.length
  pointPage.value=target;pointRawCount.value+=res.rows.length;lastPointCount.value=res.rows.length;pointTotal.value=res.total
  pointNotice.value='已检查 '+pointRawCount.value+' 个测点，匹配 '+points.value.length+' 个；未设置所属工程 '+unassigned+' 个。'+(pointsHasNext.value?'可加载更多测点。':'')
  pointState.value=points.value.length?'success':'empty'
  if(points.value.length&&!queried.value)search()
 }catch(e){if(ticket===pointEpoch){pointError.value=errorText(e);pointState.value='error'}}
 finally{if(ticket===pointEpoch)pointBusy.value=false}
}
function search(){
 if(!selectedDevice.value||!category.value)return
 try{dataRequest(category.value,selectedDevice.value,points.value[pointIndex.value]||null,start.value,end.value,year.value,0)}
 catch(e){clearData();mappingNotice.value=errorText(e);return}
 applied.value={start:start.value,end:end.value,year:year.value};mappingNotice.value='';fetchPage(0)
}
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
onLoad(options=>{category.value=monitorCategories.find(c=>c.key===options?.category);setRange(7);if(!category.value){deviceState.value='error';deviceError.value='未知监测分类';return}uni.setNavigationBarTitle({title:category.value.title});if(category.value.kind!=='unsupported'&&!auth.demoMode)initialize()})
onUnload(()=>{epoch++;pointEpoch++;initEpoch++})
</script>
<style scoped>
.intro .section-title{margin-top:0}.controls,.reading,.warning,.chart-controls{margin-top:20rpx}.label{font-size:25rpx;margin:22rpx 0 12rpx}.select{background:#edf6f3;padding:20rpx;border-radius:13rpx;font-size:24rpx;height:auto;min-height:35rpx}.meta,.tip{font-size:22rpx;line-height:1.8;margin:16rpx 0}.dates{display:flex;align-items:center;gap:12rpx}.dates picker{flex:1;min-width:0}.quick{display:flex;flex-wrap:wrap;gap:10rpx;margin-top:16rpx}.quick button{margin:0;font-size:22rpx}.query{margin-top:25rpx}.warning{color:#8b651f;background:#fff6df;font-size:24rpx;line-height:1.8;padding:20rpx;border-radius:14rpx}.value{padding:18rpx 0;border-bottom:1rpx solid #edf3f1;font-size:24rpx;gap:20rpx}.value>text:last-child{text-align:right;overflow-wrap:anywhere}.pager{display:flex;gap:20rpx;align-items:center;margin-top:25rpx}.pager button{flex:1;font-size:24rpx}.source{font-size:20rpx;overflow-wrap:anywhere;margin-top:20rpx}
</style>
