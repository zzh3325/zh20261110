<template>
  <view class="page inspection-page">
    <view class="inspection-head">
      <view class="head-decoration"></view>
      <view class="head-top">
        <view>
          <view class="head-eyebrow">SAFETY INSPECTION</view>
          <view class="head-title">安全巡检记录</view>
        </view>
        <button class="create-button" @click="createInspection"><text>＋</text>新增巡检</button>
      </view>
      <view class="head-summary">
        <view><text class="summary-number">{{ items.length }}</text><text class="summary-unit">条记录</text></view>
        <view class="completion"><text>{{ completionRate }}%</text><text>巡检完成率</text></view>
      </view>
      <view class="progress"><view :style="{width:completionRate+'%'}"></view></view>
    </view>

    <view class="point-toolbar"><picker :range="pointFilters.map(p=>p.label)" :value="pointFilterIndex" @change="changePointFilter"><view class="point-filter">{{ pointFilters[pointFilterIndex].label }} ⌄</view></picker></view>
    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.key" :class="{active:activeTab===tab.key}" @click="activeTab=tab.key">
        <text class="tab-label">{{ tab.label }}</text><text class="tab-count">{{ countFor(tab.key) }}</text>
      </view>
    </view>

    <view class="search-box">
      <text class="search-icon">⌕</text>
      <input :value="keyword" confirm-type="search" placeholder="搜索项目、人员、位置、类型或结果" @input="onSearchInput" />
      <view v-if="keyword" class="search-clear" @click="clearSearch">×</view>
    </view>
    <view v-if="state==='success'" class="result-summary">
      <text>{{ keyword ? `找到 ${searched.length} 条匹配记录` : `${activeTabLabel} · ${filtered.length} 条` }}</text>
      <text v-if="keyword" @click="clearSearch">清除搜索</text>
    </view>

    <StatePanel v-if="state!=='success'" :state="state" :message="errorMessage" @retry="load" />
    <view v-if="state==='success'" class="task-list">
      <view v-for="task in searched" :key="task.id" class="task-card" @click="openDetail(task)">
        <view class="date-box"><view>{{ dayOf(task.plannedTime||task.time) }}</view><text>{{ monthOf(task.plannedTime||task.time) }}</text></view>
        <view class="record-content">
          <view class="record-top">
            <view class="record-heading">
              <view class="record-kicker">{{ task.inspectionType || '日常巡检' }}</view>
              <view class="task-title">{{ task.title || task.name || '巡检记录' }}</view>
            </view>
            <view class="task-status" :class="statusClass(task)">{{ statusText(task) }}</view>
          </view>
          <view class="record-info">
            <view v-if="task.pointId"><text>点位</text><text>{{ task.pointName || task.pointCode || task.pointId }}</text></view>
            <view v-if="task.checkInMethod"><text>打卡</text><text>{{ task.checkInMethod==='QR_CODE'?'二维码':task.checkInMethod }}{{ task.checkInTime ? ' · '+formatTime(task.checkInTime) : '' }}</text></view>
            <view><text>位置</text><text>{{ task.location || '未提供' }}</text></view>
            <view><text>时间</text><text>{{ formatTime(task.plannedTime||task.time) }}</text></view>
          </view>
          <view class="record-footer">
            <view><text class="person-icon">人</text>{{ task.assigneeName || '人员未提供' }}</view>
            <text class="detail-link">查看详情 <text>›</text></text>
          </view>
        </view>
      </view>
      <view v-if="!searched.length" class="search-empty">
        <view class="empty-search-icon">⌕</view>
        <view class="empty-search-title">没有匹配的巡检记录</view>
        <view class="empty-search-note">请尝试项目、人员、位置、类型、结果或记录 ID</view>
        <button v-if="keyword" @click="clearSearch">清除搜索条件</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed,ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import { getInspections, hasInspectionPhotos } from '@/api/inspection'
import { listOf } from '@/utils/normalize'
import type { Inspection,LoadState } from '@/types/domain'

type TabKey='pending'|'completed'|'all'
const state=ref<LoadState>('loading'),errorMessage=ref(''),items=ref<Inspection[]>([]),activeTab=ref<TabKey>('all'),keyword=ref('')
const tabs:Array<{key:TabKey;label:string}>=[{key:'pending',label:'待完善'},{key:'completed',label:'已完成'},{key:'all',label:'全部'}]

function createInspection(){uni.navigateTo({url:'/pages/inspection/execute'})}
function hasResult(item:Inspection){return Boolean(item.result)||['COMPLETED','DONE','1','已完成','正常','异常'].includes(String(item.status??item.condition))}
function done(item:Inspection){return hasResult(item)&&hasInspectionPhotos(item.photoPaths)}
const completed=computed(()=>items.value.filter(done).length)
const completionRate=computed(()=>items.value.length?Math.round(completed.value/items.value.length*100):0)
const statusFiltered=computed(()=>activeTab.value==='all'?items.value:activeTab.value==='completed'?items.value.filter(done):items.value.filter(item=>!done(item)))
const selectedPointId=ref('')
const knownPointFilters=ref<Array<{id:string;label:string}>>([])
const pointFilters=computed(()=>[{id:'',label:'全部巡检点位'},...knownPointFilters.value])
const pointFilterIndex=computed(()=>Math.max(0,pointFilters.value.findIndex(p=>p.id===selectedPointId.value)))
function changePointFilter(e:{detail:{value:number|string}}){selectedPointId.value=pointFilters.value[Number(e.detail.value)]?.id||'';void load()}
const filtered=computed(()=>selectedPointId.value?statusFiltered.value.filter(i=>String(i.pointId||'')===selectedPointId.value):statusFiltered.value)
const activeTabLabel=computed(()=>tabs.find(tab=>tab.key===activeTab.value)?.label||'全部')

function normalizeSearch(value:unknown){return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/\s+/g,' ').trim()}
function searchValues(item:Inspection){return [item.pointName,item.pointCode,item.pointArea,item.checkInTime,item.id,item.title,item.name,item.inspectionItem,item.location,item.checkPosition,item.assigneeName,item.inspector,item.inspectionType,item.result,item.status,item.condition,item.description,item.issueDescription,item.remark,item.coordinate,item.plannedTime,item.inspectionTime,item.time,item.createdAt]}
const searched=computed(()=>{const query=normalizeSearch(keyword.value);if(!query)return filtered.value;return filtered.value.filter(item=>searchValues(item).some(value=>normalizeSearch(value).includes(query)))})
function onSearchInput(event:Event){const inputEvent=event as Event&{detail?:{value?:string}};const target=event.target as HTMLInputElement|null;keyword.value=String(inputEvent.detail?.value??target?.value??'')}
function clearSearch(){keyword.value=''}

let loadSequence=0
async function load(){
  const sequence=++loadSequence,pointId=selectedPointId.value
  state.value='loading';errorMessage.value=''
  try{
    const records=listOf<Inspection>(await getInspections(pointId||undefined))
    if(sequence!==loadSequence)return
    items.value=records
    const known=new Map(knownPointFilters.value.map(p=>[p.id,p]))
    for(const item of records){if(item.pointId!=null)known.set(String(item.pointId),{id:String(item.pointId),label:String(item.pointName||item.pointCode||item.pointId)})}
    knownPointFilters.value=Array.from(known.values())
    state.value=records.length?'success':'empty'
  }catch(error){if(sequence===loadSequence){errorMessage.value=error instanceof Error?error.message:'巡检记录加载失败';state.value='error'}}
}
function countFor(key:TabKey){return key==='all'?items.value.length:key==='completed'?completed.value:items.value.length-completed.value}
function statusText(item:Inspection){return done(item)?'已完成':hasResult(item)?'待补照片':'待填写'}
function statusClass(item:Inspection){return done(item)?'done':'pending'}
function dayOf(value?:string){const match=String(value||'').match(/\d{4}-\d{2}-(\d{2})/);return match?.[1]||'--'}
function monthOf(value?:string){const match=String(value||'').match(/\d{4}-(\d{2})-\d{2}/);return match?`${match[1]}月`:'日期'}
function formatTime(value?:string){const text=String(value||'').trim();return text?text.replace('T',' ').replace(/\.\d+(?=$|Z)/,'').replace(/Z$/,''):'未提供'}
function openDetail(item:Inspection){uni.navigateTo({url:`/pages/inspection/detail?id=${encodeURIComponent(String(item.id))}`})}
onShow(load)
</script>

<style scoped>
.point-toolbar{display:flex;align-items:center;margin:18rpx 0}.point-toolbar picker{flex:1;min-width:0}.point-filter{padding:18rpx;background:#fff;border-radius:16rpx;color:#087f72;font-size:23rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inspection-page{padding-top:24rpx}.inspection-head{position:relative;overflow:hidden;padding:30rpx;border-radius:28rpx;color:#fff;background:linear-gradient(135deg,#087f72,#12a18e);box-shadow:0 16rpx 38rpx rgba(8,127,114,.2)}.head-decoration{position:absolute;right:-70rpx;top:-90rpx;width:260rpx;height:260rpx;border:45rpx solid rgba(255,255,255,.08);border-radius:50%}.head-top,.head-summary{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between}.head-eyebrow{font-size:17rpx;letter-spacing:3rpx;color:rgba(255,255,255,.72)}.head-title{margin-top:7rpx;font-size:31rpx;font-weight:850}.create-button{height:72rpx;line-height:72rpx;margin:0;padding:0 22rpx;border-radius:18rpx;color:#087f72;background:#fff;font-size:24rpx;font-weight:750}.create-button text{font-size:29rpx;margin-right:5rpx}.create-button::after{border:0}.head-summary{align-items:flex-end;margin-top:26rpx}.summary-number{font-size:64rpx;font-weight:900;line-height:1}.summary-unit{margin-left:10rpx;font-size:21rpx;color:rgba(255,255,255,.8)}.completion{text-align:right}.completion text{display:block}.completion text:first-child{font-size:32rpx;font-weight:850}.completion text:last-child{margin-top:3rpx;font-size:18rpx;color:rgba(255,255,255,.72)}.progress{position:relative;z-index:1;height:8rpx;margin-top:20rpx;overflow:hidden;border-radius:10rpx;background:rgba(255,255,255,.2)}.progress view{height:100%;border-radius:10rpx;background:#bdf4df}.tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7rpx;margin:24rpx 0 18rpx;padding:7rpx;border-radius:18rpx;background:#e5eeec}.tabs>view{display:flex;align-items:center;justify-content:center;gap:7rpx;min-width:0;padding:17rpx 7rpx;border-radius:13rpx;color:#71807e}.tabs .active{color:#087f72;background:#fff;font-weight:750;box-shadow:0 5rpx 14rpx rgba(31,79,72,.08)}.tab-label{font-size:22rpx;white-space:nowrap}.tab-count{min-width:28rpx;height:28rpx;line-height:28rpx;padding:0 7rpx;border-radius:16rpx;text-align:center;background:rgba(8,127,114,.09);font-size:17rpx}.search-box{height:84rpx;display:flex;align-items:center;padding:0 21rpx;border:2rpx solid #dce9e6;border-radius:22rpx;background:#fff;box-shadow:0 10rpx 28rpx rgba(28,79,71,.06)}.search-box:focus-within{border-color:#33aa9b;box-shadow:0 0 0 6rpx rgba(30,159,143,.08)}.search-icon{flex:none;color:#087f72;font-size:36rpx;transform:rotate(-15deg)}.search-box input{flex:1;height:100%;padding:0 14rpx;color:#173e39;font-size:24rpx}.search-clear{flex:none;width:40rpx;height:40rpx;line-height:37rpx;text-align:center;border-radius:50%;color:#fff;background:#a9b9b6;font-size:27rpx}.result-summary{display:flex;justify-content:space-between;padding:13rpx 5rpx 15rpx;color:#7a8986;font-size:19rpx}.result-summary text:last-child{color:#087f72}.task-list{display:flex;flex-direction:column;gap:17rpx}.task-card{display:flex;gap:20rpx;padding:25rpx;border:1rpx solid rgba(8,127,114,.07);border-radius:25rpx;background:#fff;box-shadow:0 12rpx 31rpx rgba(25,78,70,.07)}.date-box{flex:none;width:82rpx;height:96rpx;padding-top:12rpx;border-radius:18rpx;text-align:center;color:#087f72;background:linear-gradient(145deg,#e4f6f2,#f2faf8)}.date-box view{font-size:33rpx;font-weight:850}.date-box text{font-size:18rpx}.record-content{flex:1;min-width:0}.record-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12rpx}.record-heading{min-width:0}.record-kicker{margin-bottom:5rpx;color:#7e918d;font-size:18rpx}.task-title{font-size:28rpx;font-weight:850;color:#0b3631;overflow-wrap:anywhere}.task-status{flex:none;padding:7rpx 11rpx;border-radius:20rpx;font-size:18rpx}.task-status.pending{color:#b96b1c;background:#fff1df}.task-status.done{color:#087f72;background:#e3f5f1}.record-info{margin-top:17rpx;padding:13rpx 15rpx;border-radius:14rpx;background:#f6f9f8}.record-info>view{display:grid;grid-template-columns:54rpx 1fr;gap:9rpx;padding:4rpx 0;font-size:20rpx}.record-info>view text:first-child{color:#8a9996}.record-info>view text:last-child{color:#415d58;overflow-wrap:anywhere}.record-footer{display:flex;align-items:center;justify-content:space-between;margin-top:15rpx;padding-top:14rpx;border-top:1rpx solid #e9f0ee;color:#657873;font-size:20rpx}.person-icon{display:inline-grid;place-items:center;width:32rpx;height:32rpx;margin-right:7rpx;border-radius:10rpx;color:#087f72;background:#e8f6f3;font-size:16rpx}.detail-link{color:#087f72;font-weight:700}.detail-link text{font-size:27rpx}.search-empty{padding:65rpx 25rpx;text-align:center;color:#71807e}.empty-search-icon{width:82rpx;height:82rpx;display:grid;place-items:center;margin:0 auto 17rpx;border-radius:50%;color:#087f72;background:#e7f5f2;font-size:42rpx}.empty-search-title{color:#294943;font-size:26rpx;font-weight:750}.empty-search-note{margin-top:9rpx;font-size:20rpx}.search-empty button{width:230rpx;height:70rpx;line-height:70rpx;margin-top:21rpx;border-radius:15rpx;color:#087f72;background:#e7f5f2;font-size:22rpx}.search-empty button::after{border:0}
</style>
