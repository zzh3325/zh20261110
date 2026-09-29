<template>
  <view class="page">
    <DataEntries :keys="['alerts','thresholds','pushRules','pushRecords','methods']" />
    <view class="summary-grid"><MetricCard label="待处理" :value="pendingCount" icon="!" tone="red" /><MetricCard label="处理中" :value="processingCount" icon="…" tone="orange" /><MetricCard label="已解决" :value="resolvedCount" icon="✓" /></view>
    <view class="tabs"><view v-for="tab in tabs" :key="tab.key" :class="{active:activeTab===tab.key}" @click="activeTab=tab.key">{{ tab.label }}</view></view>
    <StatePanel :state="state" :message="errorMessage" @retry="load" />
    <view v-if="state==='success'" class="alert-list">
      <view v-for="item in filtered" :key="item.id" class="alert-card card" @click="openDetail(item)">
        <view class="level-line" :class="`level-${levelKey(item.level)}`" />
        <view class="row between"><view class="level-tag" :class="`level-${levelKey(item.level)}`">{{ levelText(item.level) }}</view><view class="status-tag" :class="`status-${statusKey(item.status)}`">{{ statusText(item.status) }}</view></view>
        <view class="alert-title">{{ item.title || item.metricName || '监测数据异常' }}</view>
        <view class="alert-device"><text class="device-dot" />{{ item.deviceName || '设备未提供' }}<text v-if="item.location"> · {{ item.location }}</text></view>
        <view class="reading-grid">
          <view class="reading-cell"><view class="muted reading-label">当前值</view><view class="reading-value danger">{{ displayValue(item.value,item.unit) }}</view></view>
          <view class="reading-cell"><view class="muted reading-label">{{ compareText(item.compareOp) }}阈值</view><view class="reading-value">{{ displayValue(item.threshold,item.unit) }}</view></view>
        </view>
        <view class="alert-footer"><text class="muted alert-time">{{ formatTime(item.alertTime) }}</text><text class="detail-link">查看详情 ›</text></view>
      </view>
      <StatePanel v-if="!filtered.length" state="empty" />
    </view>
  </view>
</template>
<script setup lang="ts">
import DataEntries from '@/components/DataEntries.vue'
import { computed,ref } from 'vue';import { onShow } from '@dcloudio/uni-app';import MetricCard from '@/components/MetricCard.vue';import StatePanel from '@/components/StatePanel.vue';import { getAllAlerts } from '@/api/alerts';import { listOf } from '@/utils/normalize';import type { AlertItem,LoadState } from '@/types/domain'
const state=ref<LoadState>('loading'),errorMessage=ref(''),items=ref<AlertItem[]>([]),activeTab=ref('current');const tabs=[{key:'current',label:'当前预警'},{key:'history',label:'历史记录'},{key:'all',label:'全部'}]
const pendingCount=computed(()=>items.value.filter(i=>['PENDING','0','待处理','未处理'].includes(String(i.status))).length),processingCount=computed(()=>items.value.filter(i=>['PROCESSING','1','处理中'].includes(String(i.status))).length),resolvedCount=computed(()=>items.value.filter(i=>['RESOLVED','CLOSED','2','已处理'].includes(String(i.status))).length)
const filtered=computed(()=>activeTab.value==='all'?items.value:activeTab.value==='history'?items.value.filter(i=>['RESOLVED','CLOSED','2','已处理'].includes(String(i.status))):items.value.filter(i=>!['RESOLVED','CLOSED','2','已处理'].includes(String(i.status))))
async function load(){state.value='loading';try{items.value=listOf<AlertItem>(await getAllAlerts());state.value=items.value.length?'success':'empty'}catch(e){errorMessage.value=e instanceof Error?e.message:'加载失败';state.value='error'}}
function levelText(v:unknown){return ({1:'Ⅰ级',2:'Ⅱ级',3:'Ⅲ级',4:'Ⅳ级'} as Record<string,string>)[String(v)]||String(v||'等级未提供')}
function statusText(v:unknown){const m:Record<string,string>={PENDING:'待处理',PROCESSING:'处理中',RESOLVED:'已解决',CLOSED:'已关闭',未处理:'待处理'};return m[String(v)]||String(v||'待处理')}
function levelKey(v:unknown){const value=String(v||'');if(value==='1'||value.includes('紧急'))return 'urgent';if(value==='2'||value.includes('中度'))return 'moderate';if(value==='3'||value.includes('一般'))return 'general';return 'tip'}
function statusKey(v:unknown){const value=statusText(v);return value.includes('已解决')||value.includes('已处理')||value.includes('已关闭')?'done':value.includes('处理中')?'processing':'pending'}
function displayValue(value:unknown,unit:unknown){if(value===null||value===undefined||String(value).trim()==='')return '--';const numeric=Number(value);const shown=Number.isFinite(numeric)?numeric.toLocaleString('zh-CN',{maximumFractionDigits:3}):String(value);return shown+(unit?' '+String(unit):'')}
function compareText(v:unknown){return ({GT:'大于',GTE:'大于等于',LT:'小于',LTE:'小于等于',EQ:'等于',RANGE:'区间',ABS_GT:'绝对值大于'} as Record<string,string>)[String(v||'').toUpperCase()]||'告警'}
function formatTime(v:unknown){const value=String(v||'');return value?value.replace('T',' ').replace(/(\.\d{3})\d+/, '$1'):'时间未提供'}
function openDetail(i:AlertItem){uni.navigateTo({url:`/pages/alert/detail?id=${encodeURIComponent(String(i.id))}`})}
onShow(load)
</script>
<style scoped>.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14rpx}.tabs{display:flex;margin:28rpx 0 22rpx;padding:8rpx;background:#e8efee;border-radius:18rpx}.tabs view{flex:1;text-align:center;padding:17rpx 5rpx;border-radius:13rpx;color:#71807e;font-size:24rpx}.tabs .active{background:#fff;color:#087f72;font-weight:700;box-shadow:0 5rpx 14rpx rgba(28,68,63,.08)}.alert-list{display:flex;flex-direction:column;gap:18rpx}.alert-card{position:relative;overflow:hidden;padding:24rpx 24rpx 20rpx 30rpx}.level-line{position:absolute;left:0;top:0;bottom:0;width:8rpx;background:#5687b4}.level-line.level-urgent{background:#d54b49}.level-line.level-moderate{background:#e78729}.level-line.level-general{background:#e5b33e}.level-line.level-tip{background:#5687b4}.level-tag{font-size:20rpx;color:#426b91;background:#eaf2fa;padding:7rpx 14rpx;border-radius:999rpx}.level-tag.level-urgent{color:#b83e3c;background:#ffe9e8}.level-tag.level-moderate{color:#b96519;background:#fff0df}.level-tag.level-general{color:#9b7414;background:#fff7d9}.status-tag{font-size:20rpx;padding:7rpx 13rpx;border-radius:999rpx}.status-pending{color:#a96413;background:#fff1dc}.status-processing{color:#356f9f;background:#e9f3fc}.status-done{color:#087f72;background:#e2f5f0}.alert-title{font-size:30rpx;font-weight:850;line-height:1.35;margin:20rpx 0 9rpx}.alert-device{display:flex;align-items:center;min-width:0;font-size:22rpx;color:#617370;overflow-wrap:anywhere}.device-dot{flex:none;width:10rpx;height:10rpx;border-radius:50%;background:#0b9584;margin-right:9rpx}.reading-grid{display:grid;grid-template-columns:1fr 1fr;gap:12rpx;margin:20rpx 0}.reading-cell{min-width:0;padding:17rpx 18rpx;background:#f3f8f6;border-radius:15rpx}.reading-cell:first-child{background:#fff3f1}.reading-label{font-size:19rpx}.reading-value{margin-top:6rpx;font-size:27rpx;font-weight:800;overflow-wrap:anywhere}.reading-value.danger{color:#c84943}.alert-footer{display:flex;align-items:center;justify-content:space-between;gap:16rpx;padding-top:16rpx;border-top:1rpx solid #edf2f1}.alert-time{font-size:19rpx;min-width:0}.detail-link{flex:none;color:#087f72;font-size:21rpx}</style>
