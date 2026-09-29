<template>
  <view class="page">
    <DataEntries :keys="['alerts','thresholds','pushRules','pushRecords','methods']" />
    <view class="summary-grid"><MetricCard label="待处理" :value="pendingCount" icon="!" tone="red" /><MetricCard label="处理中" :value="processingCount" icon="…" tone="orange" /><MetricCard label="已解决" :value="resolvedCount" icon="✓" /></view>
    <view class="tabs"><view v-for="tab in tabs" :key="tab.key" :class="{active:activeTab===tab.key}" @click="activeTab=tab.key">{{ tab.label }}</view></view>
    <StatePanel :state="state" :message="errorMessage" @retry="load" />
    <view v-if="state==='success'" class="alert-list">
      <view v-for="item in filtered" :key="item.id" class="alert-card card" @click="openDetail(item)">
        <view class="level-line" :class="`level-${item.level}`" />
        <view class="row between"><view class="level-tag" :class="`level-${item.level}`">{{ levelText(item.level) }}</view><view class="status-tag">{{ statusText(item.status) }}</view></view>
        <view class="alert-title">{{ item.title || item.metricName || '监测数据异常' }}</view>
        <view class="alert-device">{{ item.deviceName || item.location || '--' }}</view>
        <view class="reading row between"><view><text class="muted">监测值 </text><text class="strong">{{ item.value ?? '--' }}</text><text class="muted"> / 阈值 {{ item.threshold ?? '--' }}</text></view><view class="muted">›</view></view>
        <view class="muted alert-time">{{ item.alertTime || '--' }}</view>
      </view>
      <StatePanel v-if="!filtered.length" state="empty" />
    </view>
  </view>
</template>
<script setup lang="ts">
import DataEntries from '@/components/DataEntries.vue'
import { computed,ref } from 'vue';import { onShow } from '@dcloudio/uni-app';import MetricCard from '@/components/MetricCard.vue';import StatePanel from '@/components/StatePanel.vue';import { useAuthStore } from '@/stores/auth';import { getAllAlerts } from '@/api/alerts';import { demoAlerts } from '@/data/demo';import { listOf } from '@/utils/normalize';import type { AlertItem,LoadState } from '@/types/domain'
const auth=useAuthStore(),state=ref<LoadState>('loading'),errorMessage=ref(''),items=ref<AlertItem[]>([]),activeTab=ref('current');const tabs=[{key:'current',label:'当前预警'},{key:'history',label:'历史记录'},{key:'all',label:'全部'}]
const pendingCount=computed(()=>items.value.filter(i=>['PENDING','0','待处理','未处理'].includes(String(i.status))).length),processingCount=computed(()=>items.value.filter(i=>['PROCESSING','1','处理中'].includes(String(i.status))).length),resolvedCount=computed(()=>items.value.filter(i=>['RESOLVED','CLOSED','2','已处理'].includes(String(i.status))).length)
const filtered=computed(()=>activeTab.value==='all'?items.value:activeTab.value==='history'?items.value.filter(i=>['RESOLVED','CLOSED','2','已处理'].includes(String(i.status))):items.value.filter(i=>!['RESOLVED','CLOSED','2','已处理'].includes(String(i.status))))
async function load(){state.value='loading';try{items.value=auth.demoMode?demoAlerts:listOf<AlertItem>(await getAllAlerts());state.value=items.value.length?'success':'empty'}catch(e){errorMessage.value=e instanceof Error?e.message:'加载失败';state.value='error'}}
function levelText(v:unknown){return ({1:'Ⅰ级',2:'Ⅱ级',3:'Ⅲ级',4:'Ⅳ级'} as Record<string,string>)[String(v)]||String(v||'等级未提供')}
function statusText(v:unknown){const m:Record<string,string>={PENDING:'待处理',PROCESSING:'处理中',RESOLVED:'已解决',CLOSED:'已关闭',未处理:'待处理'};return m[String(v)]||String(v||'待处理')}
function openDetail(i:AlertItem){uni.navigateTo({url:`/pages/alert/detail?id=${encodeURIComponent(String(i.id))}`})}
onShow(load)
</script>
<style scoped>.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14rpx}.tabs{display:flex;margin:28rpx 0 22rpx;padding:8rpx;background:#e8efee;border-radius:18rpx}.tabs view{flex:1;text-align:center;padding:17rpx 5rpx;border-radius:13rpx;color:#71807e;font-size:24rpx}.tabs .active{background:#fff;color:#087f72;font-weight:700;box-shadow:0 5rpx 14rpx rgba(28,68,63,.08)}.alert-list{display:flex;flex-direction:column;gap:18rpx}.alert-card{position:relative;overflow:hidden}.level-line{position:absolute;left:0;top:0;bottom:0;width:8rpx;background:#d79624}.level-line.level-1{background:#c64848}.level-line.level-2{background:#e18322}.level-line.level-3{background:#d6a923}.level-line.level-4{background:#3582bd}.level-tag{font-size:20rpx;color:#b36318;background:#fff0dc;padding:7rpx 14rpx;border-radius:10rpx}.level-tag.level-1{color:#b53b3b;background:#ffeaea}.status-tag{font-size:20rpx;color:#6e7f7c}.alert-title{font-size:31rpx;font-weight:800;margin:22rpx 0 9rpx}.alert-device{font-size:23rpx;color:#617370}.reading{margin:22rpx 0;padding:18rpx;background:#f5f8f7;border-radius:14rpx;font-size:23rpx}.alert-time{font-size:20rpx}</style>
