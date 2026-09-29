<template>
  <view class="page browser">
    <view class="card intro"><view class="section-title">{{ source?.title || '数据查询' }}</view><view class="muted">独立数据源 · 只读查询</view><view class="notice">数值单位以原接口为准；未返回单位时不进行换算。时间保留接口时区标识。</view></view>
    <view v-if="source" class="card filters">
      <view v-for="filter in source.filters" :key="filter.key" class="filter">
        <view class="label">{{ filter.label }}{{ filter.required ? ' *' : '' }}</view>
        <picker v-if="filter.options" :range="['全部',...filter.options]" @change="pick(filter.key,filter.options,$event)"><view class="picker-field"><text class="picker-value">{{ values[filter.key] || '全部' }}</text><text class="picker-arrow">⌄</text></view></picker>
        <input v-else v-model="values[filter.key]" class="input" :placeholder="filter.kind==='date'?'2026-09-14T00:00:00+08:00':filter.required?'必填':'不限'" />
      </view>
      <view class="buttons"><button class="btn-primary" :disabled="busy" @click="search">查询</button><button :disabled="busy" @click="reset">重置</button></view>
    </view>
    <view v-if="hint" class="notice">{{ hint }}</view>
    <StatePanel :state="state" :message="errorMessage" @retry="search" />
    <template v-if="state==='success'">
      <input v-model="keyword" class="input local-search" placeholder="在已加载结果中搜索（本地筛选）" />
      <view class="muted count">{{ source?.paged ? '第 '+(page+1)+' 页' : '已加载列表' }} · {{ total===null?'总数未提供':'共 '+total+' 条' }} · 本页匹配 {{ visibleRows.length }} 条</view>
      <view v-for="(row,index) in visibleRows" :key="String(row.id??row.ukid??index)" class="card record">
        <view class="row between" @click="expanded=expanded===index?-1:index"><view class="strong">{{ row.deviceName||row.name||row.pointName||row.fileName||row.title||row.monitoringPoint||row.streamName||'记录 '+String(row.id??row.ukid??index+1) }}</view><text>{{ expanded===index?'收起':'详情 ›' }}</text></view>
        <view v-for="field in fields(row,index)" :key="field.key" class="field"><text class="muted">{{ field.label }}</text><text class="value" selectable>{{ field.value }}</text></view>
        <view class="actions">
          <button v-if="source?.key==='totalPoints' && row.pointId!=null" size="mini" @click="openDataSource('totalData',{pointId:row.pointId,projectId:row.projectId})">测点历史</button>
          <button v-if="source?.key==='gnss' && row.stationId!=null" size="mini" @click="openDataSource('displacement',{stationId:row.stationId,projectId:row.projectId})">站点位移</button>
          <button v-if="source?.key==='termite' && row.id!=null" size="mini" @click="openDataSource('termiteLogs',{id:row.id})">设备日志</button>
          <button v-if="source?.key==='cameras' && row.id!=null" size="mini" @click="openCamera(row)">视频通道</button>
          <button v-if="source?.key==='recordings'" size="mini" :disabled="row.status!=='AVAILABLE'" @click="playRecording(row)">播放录像</button>
          <button v-if="source?.key==='incidents'" size="mini" :disabled="actionBusy" @click="playIncident(row)">问题回放</button>
          <button v-if="source?.key==='alerts' && row.id!=null" size="mini" @click="openAlert(row)">告警详情</button>
          <button v-if="source?.key==='files'" size="mini" :disabled="actionBusy" @click="openArchive(row)">查看档案详情</button>
        </view>
      </view>
      <StatePanel v-if="!visibleRows.length" state="empty" message="本页没有匹配结果" />
    </template>
    <view v-if="source?.paged && (state==='success'||state==='empty')" class="buttons pager"><button :disabled="busy||page===0" @click="changePage(-1)">上一页</button><text>{{ page+1 }}</text><button :disabled="busy||!hasNext" @click="changePage(1)">下一页</button></view>
    <view v-if="playingUrl" class="overlay"><view class="player"><button @click="playingUrl=''">关闭播放</button><LivePlayer :url="playingUrl" /></view></view>
    <view v-if="archive" class="overlay"><scroll-view scroll-y class="archive card"><button @click="archive=null">关闭详情</button><view v-for="field in displayFields(archive)" :key="field.key" class="field"><text class="muted">{{ field.label }}</text><text class="value" selectable>{{ field.value }}</text></view><button @click="copyArchive">复制文件访问地址</button><view class="notice">文件访问权限、下载鉴权及跨域策略由后端决定。</view></scroll-view></view>
  </view>
</template>
<script setup lang="ts">
import { computed,ref } from 'vue'
import { onLoad,onHide,onUnload } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import LivePlayer from '@/components/LivePlayer.vue'
import { dataSources,openDataSource,type DataSource } from '@/api/data-sources'
import { buildDataQuery,fetchData,displayFields,safeResourceUrl,type DataRow } from '@/api/data-browser'
import { http } from '@/utils/request'
import type { LoadState } from '@/types/domain'
const source=ref<DataSource>(),values=ref<Record<string,string>>({}),applied=ref<Record<string,string>>({}),rows=ref<DataRow[]>([]),total=ref<number|null>(null),page=ref(0),state=ref<LoadState>('success'),errorMessage=ref(''),hint=ref(''),keyword=ref(''),busy=ref(false),expanded=ref(-1),playingUrl=ref(''),archive=ref<DataRow|null>(null),actionBusy=ref(false)
const visibleRows=computed(()=>rows.value.filter(row=>displayFields(row,source.value?.key).some(f=>f.value.toLowerCase().includes(keyword.value.trim().toLowerCase()))))
const hasNext=computed(()=>total.value===null?rows.value.length===20:(page.value+1)*20<total.value)
function fields(row:DataRow,index:number){const all=displayFields(row,source.value?.key);if(expanded.value===index)return all;const important=['deviceStatus','offline','status','resultValue.','resultData.','collectTime','time','periodNum','periodDate','stationName','lon','lat','h','data1','calc1','monitoringContent','generalAlert','moderateAlert','emergencyAlert','alertLevel','handlingStatus','ruleDescription','longitude','latitude','startTime','endTime','clipStatus','fileType','uploadTime'];const main=all.filter(f=>important.some(k=>k.endsWith('.')?f.key.startsWith(k):f.key===k));return [...main,...all.filter(f=>!main.includes(f))].slice(0,8)}
function pick(key:string,options:string[],event:unknown){values.value[key]=['',...options][Number((event as {detail:{value:string}}).detail.value)]||''}
async function load(target=0){if(!source.value||busy.value)return;busy.value=true;state.value='loading';errorMessage.value='';try{const data=await fetchData(source.value,applied.value,target);rows.value=data.rows;total.value=data.total;page.value=target;expanded.value=-1;state.value=rows.value.length?'success':'empty'}catch(e){rows.value=[];errorMessage.value=e instanceof Error?e.message:'查询失败';state.value='error'}finally{busy.value=false}}
function search(){if(!source.value)return;try{buildDataQuery(source.value,values.value);applied.value={...values.value};keyword.value='';hint.value='';load(0)}catch(e){hint.value=e instanceof Error?e.message:'参数不完整'}}
function reset(){values.value={};rows.value=[];page.value=0;total.value=null;keyword.value='';expanded.value=-1;state.value='success';hint.value='请设置条件后查询'}
function changePage(delta:number){load(page.value+delta)}
function openCamera(row:DataRow){uni.navigateTo({url:'/pages/monitoring/video?deviceId='+encodeURIComponent(String(row.id))})}
function openAlert(row:DataRow){uni.navigateTo({url:'/pages/alert/detail?id='+encodeURIComponent(String(row.id))})}
function errorToast(e:unknown){uni.showToast({title:e instanceof Error?e.message:'操作失败',icon:'none'})}
function playRecording(row:DataRow){try{if(row.status!=='AVAILABLE')throw new Error('录像当前不可播放');playingUrl.value=safeResourceUrl(row.httpMp4Url)}catch(e){errorToast(e)}}
async function playIncident(row:DataRow){if(actionBusy.value||row.id==null)return;actionBusy.value=true;try{const result=await http.get<DataRow>('/api/incidents/'+encodeURIComponent(String(row.id))+'/playback',undefined,{showError:false});if(result.available!==true)throw new Error(String(result.message||'回放尚未就绪：'+String(result.clipStatus||'未知')));playingUrl.value=safeResourceUrl(result.playbackUrl)}catch(e){errorToast(e)}finally{actionBusy.value=false}}
async function openArchive(row:DataRow){if(actionBusy.value||row.id==null)return;actionBusy.value=true;try{archive.value=await http.get<DataRow>('/get/files/'+encodeURIComponent(String(row.id)),undefined,{showError:false})}catch(e){errorToast(e)}finally{actionBusy.value=false}}
function copyArchive(){try{uni.setClipboardData({data:safeResourceUrl(archive.value?.filePath)})}catch(e){errorToast(e)}}
onLoad(options=>{source.value=dataSources.find(s=>s.key===options?.source);if(!source.value){state.value='error';errorMessage.value='未知数据分类';return}uni.setNavigationBarTitle({title:source.value.title});for(const f of source.value.filters)if(options?.[f.key]!==undefined)values.value[f.key]=String(options[f.key]);if(source.value.filters.some(f=>f.required&&!values.value[f.key]))hint.value='请填写必填条件后查询';else search()})
onHide(()=>{playingUrl.value=''})
onUnload(()=>{playingUrl.value=''})
</script>
<style scoped>
.intro .section-title{margin:0 0 12rpx}.notice{font-size:22rpx;color:#7a867f;line-height:1.7;margin-top:16rpx}.filters,.record{margin-top:20rpx}.filter{margin-bottom:20rpx}.label{font-size:23rpx;margin-bottom:10rpx}.input{background:#f1f7f5;border-radius:12rpx;padding:20rpx;height:auto;font-size:24rpx;min-height:36rpx}.buttons{display:flex;align-items:center;gap:20rpx}.buttons button{flex:1;margin:0;font-size:25rpx}.local-search{margin-top:24rpx}.count{font-size:22rpx;margin:20rpx 0}.field{display:flex;justify-content:space-between;gap:20rpx;padding:16rpx 0;border-bottom:1rpx solid #edf3f1;font-size:23rpx}.field>.muted{flex:0 0 36%;overflow-wrap:anywhere}.value{text-align:right;overflow-wrap:anywhere;min-width:0}.record>.row{gap:20rpx;margin-bottom:14rpx}.record>.row>text{color:#087f72;flex:none;font-size:23rpx}.strong{overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:12rpx;margin-top:16rpx}.actions button{margin:0;color:#087f72}.pager{margin:24rpx 0}.overlay{position:fixed;inset:0;background:#000a;z-index:99;display:flex;align-items:center;padding:24rpx}.player{width:100%;background:#fff}.archive{width:100%;max-height:80vh;box-sizing:border-box}
</style>
