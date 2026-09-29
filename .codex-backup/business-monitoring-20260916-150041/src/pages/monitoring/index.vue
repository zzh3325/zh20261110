<template>
  <view class="page">
    <view class="overview card">
      <view class="row between"><view><view class="section-subtitle">传感器测点台账</view><view class="overview-value">{{ state==='error'?'--':points.length }} 个</view></view><view>状态以设备台账为准</view></view>
    </view>
    <view class="section-title">多源监测与设备</view>
    <DataEntries :keys="['devices','totalPoints','periods','totalData','gnss','displacement','meteo','acquisition','termite','manual','locations']" />
    <scroll-view scroll-x class="category-scroll">
      <view class="categories">
        <view v-for="item in categories" :key="item.key" class="category" :class="{active:activeType===item.key}" @click="activeType=item.key">{{ item.icon }} {{ item.label }}</view>
      </view>
    </scroll-view>
    <view class="toolbar row between">
      <view class="section-title">监测测点</view>
      <view class="muted count">{{ filteredPoints.length }} 个</view>
    </view>
    <StatePanel :state="state" :message="errorMessage" @retry="load" />
    <view v-if="state==='success'" class="point-list">
      <view v-for="point in filteredPoints" :key="point.id" class="point card" @click="openPoint(point)">
        <view class="point-symbol" :class="point.status">{{ symbolOf(point.type) }}</view>
        <view class="grow"><view class="row between"><view class="strong ellipsis">{{ point.name }}</view><view class="status" :class="point.status">{{ statusText(point.status) }}</view></view><view class="muted point-meta">{{ point.location || point.code || '位置待完善' }}</view><view class="row between reading"><view><text class="reading-value">{{ point.latestValue ?? '--' }}</text><text class="unit">{{ point.unit }}</text></view><view class="muted time">{{ point.lastTime || '--' }}</view></view></view>
      </view>
      <StatePanel v-if="!filteredPoints.length" state="empty" message="当前分类暂无测点" />
    </view>
    <view class="video-entry card row between" @click="openVideo"><view><view class="strong">现场视频监控</view><view class="muted video-sub">直播、录像和问题时段回放</view></view><view class="play">▶</view></view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import DataEntries from '@/components/DataEntries.vue'
import { useAuthStore } from '@/stores/auth'
import { monitoringApi } from '@/api/monitoring'
import { demoPoints } from '@/data/demo'
import { listOf } from '@/utils/normalize'
import type { LoadState, MonitorPoint } from '@/types/domain'

const auth=useAuthStore(), state=ref<LoadState>('loading'), errorMessage=ref(''), points=ref<MonitorPoint[]>([]), activeType=ref('all')
const categories=computed(()=>[{key:'all',label:'全部传感器',icon:'◉'},...Array.from(new Set(points.value.map(p=>p.type).filter(Boolean))).map(type=>({key:String(type),label:String(type),icon:'⌁'}))])
const filteredPoints=computed(()=>activeType.value==='all'?points.value:points.value.filter(p=>String(p.type||'').includes(activeType.value)))
const onlineCount=computed(()=>points.value.filter(p=>p.status==='normal' || p.status==='warning').length)
const onlineRate=computed(()=>points.value.length?Math.round(onlineCount.value/points.value.length*100):0)
async function load(){state.value='loading';try{points.value=auth.demoMode?demoPoints:listOf<MonitorPoint>(await monitoringApi.sensorPoints());state.value=points.value.length?'success':'empty'}catch(e){errorMessage.value=e instanceof Error?e.message:'加载失败';state.value='error'}}
function openPoint(p:MonitorPoint){uni.navigateTo({url:`/pages/monitoring/detail?id=${encodeURIComponent(String(p.id))}&name=${encodeURIComponent(p.name)}`})}
function openVideo(){uni.navigateTo({url:'/pages/monitoring/video'})}
function symbolOf(type?:string){return type?.includes('水')?'≈':type?.includes('位移')?'↗':type?.includes('气象')?'☁':'⌁'}
function statusText(status?:string){return status==='offline'?'离线':status==='warning'?'预警':status==='normal'?'在线':'状态未确认'}
onShow(load)
</script>
<style scoped lang="scss">
.overview{background:linear-gradient(135deg,#075e56,#0c9b88);color:#fff}.overview-value{font-size:62rpx;font-weight:900;margin-top:8rpx}.online-ring{width:116rpx;height:116rpx;border-radius:50%;display:grid;place-content:center;text-align:center;border:10rpx solid rgba(255,255,255,.28);font-size:32rpx;font-weight:800}.online-ring text{font-size:18rpx;font-weight:400}.category-scroll{white-space:nowrap;margin:26rpx -28rpx 10rpx;padding:0 28rpx;width:auto}.categories{display:inline-flex;gap:14rpx;padding-right:28rpx}.category{padding:17rpx 24rpx;background:#fff;border-radius:18rpx;color:#6e7f7c;font-size:24rpx}.category.active{background:#087f72;color:#fff}.toolbar{margin-top:26rpx}.toolbar .section-title{margin:0}.count{font-size:23rpx}.point-list{display:flex;flex-direction:column;gap:18rpx}.point{display:flex;gap:22rpx}.point-symbol{flex:none;width:82rpx;height:82rpx;display:grid;place-items:center;border-radius:22rpx;background:#e7f5f2;color:#087f72;font-size:34rpx}.point-symbol.warning{background:#fff0dc;color:#c76f15}.point-symbol.offline{background:#eef1f1;color:#899592}.ellipsis{max-width:340rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.status{font-size:20rpx;color:#087f72}.status.warning{color:#cc7319}.status.offline{color:#8a9694}.point-meta{font-size:22rpx;margin:8rpx 0 17rpx}.reading-value{font-size:38rpx;font-weight:800}.unit{font-size:21rpx;margin-left:7rpx;color:#71807e}.time{font-size:18rpx}.video-entry{margin-top:24rpx}.video-sub{font-size:22rpx;margin-top:8rpx}.play{width:72rpx;height:72rpx;border-radius:50%;display:grid;place-items:center;color:#fff;background:#087f72;padding-left:5rpx}
</style>
