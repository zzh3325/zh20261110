<template>
  <view class="page device-ledger">
    <view class="card overview">
      <view class="row between overview-head">
        <view><view class="section-title">设备总览</view><view class="muted scope">统计当前页面定义的 11 类设备</view></view>
        <view class="total"><text>{{ summary.total }}</text><small>台</small></view>
      </view>
      <view class="status-grid">
        <view class="status-cell online"><text>{{ summary.online }}</text><small>在线</small></view>
        <view class="status-cell offline"><text>{{ summary.offline }}</text><small>离线</small></view>
        <view class="status-cell maintenance"><text>{{ summary.maintenance }}</text><small>维护</small></view>
        <view class="status-cell unknown"><text>{{ summary.unknown }}</text><small>未知</small></view>
      </view>
      <view class="status-bar"><view class="online-bar" :style="{width:onlineRate+'%'}" /></view>
      <view class="muted rate">在线率 {{ onlineRate }}% · 未返回状态的设备单独计入“未知”</view>
    </view>

    <StatePanel v-if="state!=='success'" :state="state" :message="errorMessage" @retry="load" />
    <template v-else>
      <view v-if="warnings.length" class="notice">{{ warnings.join('；') }}，其余数据仍可查看。</view>
      <view class="category-grid">
        <view v-for="item in categories" :key="item.key" class="category" :class="{active:item.key===activeKey}" @click="selectCategory(item.key)">
          <text class="category-name">{{ item.title }}</text><small>{{ categoryCount(item.key) }}</small>
        </view>
      </view>

      <view class="row between list-head">
        <view><view class="section-title">{{ activeCategory?.title }}</view><view class="muted list-count">共 {{ activeRows.length }} 台</view></view>
        <view v-if="activeKey==='video'" class="video-link" @click="openVideo">进入视频监控 ›</view>
      </view>
      <input v-model="keyword" class="search" placeholder="搜索设备名称、编号或位置" />

      <view class="device-list">
        <view v-for="(row,index) in visibleRows" :key="String(row.id??row.deviceNumber??row.serialNo??index)" class="card device-card">
          <view class="row between card-head">
            <view class="device-name">{{ deviceTitle(row) }}</view>
            <view class="health" :class="deviceHealth(row)"><text />{{ healthText(row) }}</view>
          </view>
          <view class="field"><text>设备编号</text><text selectable>{{ deviceNumber(row) }}</text></view>
          <view class="field"><text>站点 ID</text><text selectable>{{ row.stationId ?? row.deviceId ?? '未提供' }}</text></view>
          <view class="field"><text>安装位置</text><text selectable>{{ deviceLocation(row) }}</text></view>
          <view v-if="row.monitoringLocation" class="field"><text>监测点位</text><text selectable>{{ row.monitoringLocation }}</text></view>
          <view class="row card-actions">
            <view class="detail-toggle" @click="expanded=expanded===index?-1:index">{{ expanded===index?'收起详情':'查看详情 ›' }}</view>
            <view v-if="row._source==='camera'" class="detail-toggle" @click="openCamera(row)">查看通道 ›</view>
          </view>
          <view v-if="expanded===index" class="details">
            <view v-for="field in detailFields(row)" :key="field.key" class="field"><text>{{ field.label }}</text><text selectable>{{ field.value }}</text></view>
          </view>
        </view>
      </view>
      <StatePanel v-if="!visibleRows.length" state="empty" :message="keyword?'没有匹配的设备':'该分类暂无设备'" />
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import { displayFields } from '@/api/data-browser'
import { deviceCategories, deviceHealth, deviceLocation, deviceNumber, deviceTitle, healthText, loadDeviceLedger, summarizeDevices, type LedgerDevice } from '@/api/device-ledger'
import { useAuthStore } from '@/stores/auth'
import type { LoadState } from '@/types/domain'

const auth=useAuthStore(),categories=deviceCategories,state=ref<LoadState>('loading'),errorMessage=ref(''),warnings=ref<string[]>([]),rows=ref<LedgerDevice[]>([]),activeKey=ref(categories[0].key),keyword=ref(''),expanded=ref(-1)
const summary=computed(()=>summarizeDevices(rows.value))
const onlineRate=computed(()=>summary.value.total?Math.round(summary.value.online/summary.value.total*100):0)
const activeCategory=computed(()=>categories.find(item=>item.key===activeKey.value))
const activeRows=computed(()=>rows.value.filter(row=>row._category===activeKey.value))
const visibleRows=computed(()=>{const word=keyword.value.trim().toLowerCase();return word?activeRows.value.filter(row=>[deviceTitle(row),deviceNumber(row),deviceLocation(row)].some(value=>value.toLowerCase().includes(word))):activeRows.value})
function categoryCount(key:string){return rows.value.filter(row=>row._category===key).length}
function selectCategory(key:string){activeKey.value=key;keyword.value='';expanded.value=-1}
function detailFields(row:LedgerDevice){return displayFields(row,row._source==='camera'?'cameras':'devices').filter(field=>!['_category','_source','deviceName','name','deviceNumber','serialNo','stationId','deviceId','location','remarks','monitoringLocation','deviceStatus','status'].includes(field.key))}
function openVideo(){uni.navigateTo({url:'/pages/monitoring/video'})}
function openCamera(row:LedgerDevice){uni.navigateTo({url:'/pages/monitoring/video?deviceId='+encodeURIComponent(String(row.id))})}
async function load(){if(auth.demoMode){rows.value=[];errorMessage.value='演示模式不请求真实设备接口，请登录后查看设备台账';state.value='empty';return}state.value='loading';errorMessage.value='';try{const result=await loadDeviceLedger();rows.value=result.rows;warnings.value=result.warnings;state.value='success'}catch(e){rows.value=[];errorMessage.value=e instanceof Error?e.message:'设备台账加载失败';state.value='error'}}
onLoad(options=>{if(options?.category&&categories.some(item=>item.key===options.category))activeKey.value=options.category;load()})
</script>

<style scoped>
.overview{padding:30rpx;background:linear-gradient(145deg,#087f72,#0a9c8a);color:#fff}.overview .section-title{margin:0 0 7rpx}.scope{color:#d9f3ee;font-size:21rpx}.total{display:flex;align-items:flex-end;gap:7rpx}.total text{font-size:64rpx;font-weight:900;line-height:1}.total small{font-size:22rpx;margin-bottom:7rpx}.status-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10rpx;margin-top:28rpx}.status-cell{padding:17rpx 4rpx;text-align:center;border-radius:16rpx;background:#ffffff18}.status-cell text{display:block;font-size:34rpx;font-weight:800}.status-cell small{font-size:20rpx;color:#e5f4f1}.status-bar{height:10rpx;background:#ffffff2b;border-radius:20rpx;overflow:hidden;margin-top:22rpx}.online-bar{height:100%;background:#8ce0bb;border-radius:20rpx}.rate{color:#d9f3ee;font-size:20rpx;margin-top:10rpx}.notice{margin:20rpx 2rpx;color:#a26713;background:#fff5dd;padding:18rpx;border-radius:14rpx;font-size:22rpx}.category-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10rpx;margin:26rpx 0 30rpx}.category{min-height:210rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12rpx;padding:14rpx 2rpx;border:1rpx solid #dbe8e5;background:#fff;border-radius:16rpx;color:#647774;font-size:23rpx}.category-name{writing-mode:vertical-rl;text-orientation:upright;letter-spacing:3rpx;line-height:1.15;white-space:nowrap}.category small{min-width:34rpx;height:34rpx;line-height:34rpx;text-align:center;border-radius:17rpx;background:#eef4f2;font-size:18rpx}.category.active{color:#fff;background:#087f72;border-color:#087f72;box-shadow:0 8rpx 20rpx #087f7230}.category.active small{background:#ffffff2b}.list-head{margin-bottom:18rpx}.list-head .section-title{margin:0}.list-count{font-size:21rpx;margin-top:5rpx}.video-link{color:#087f72;font-size:22rpx}.search{background:#fff;border:1rpx solid #e0eae8;border-radius:16rpx;padding:20rpx 24rpx;height:auto;font-size:24rpx;margin-bottom:20rpx}.device-list{display:flex;flex-direction:column;gap:18rpx}.device-card{padding:24rpx}.card-head{gap:20rpx;margin-bottom:12rpx}.device-name{font-size:29rpx;font-weight:800;min-width:0;overflow-wrap:anywhere}.health{flex:none;font-size:20rpx;padding:7rpx 12rpx;border-radius:999rpx;background:#eef1f0;color:#73807e}.health text{display:inline-block;width:10rpx;height:10rpx;border-radius:50%;background:currentColor;margin-right:7rpx}.health.online{color:#087f72;background:#e1f5ed}.health.offline{color:#c34848;background:#ffebeb}.health.maintenance{color:#b27118;background:#fff2dc}.field{display:flex;justify-content:space-between;gap:22rpx;padding:15rpx 0;border-bottom:1rpx solid #edf2f1;font-size:22rpx}.field>text:first-child{color:#71807e;flex:0 0 28%}.field>text:last-child{text-align:right;overflow-wrap:anywhere;min-width:0}.card-actions{justify-content:flex-end;gap:28rpx;margin-top:18rpx}.detail-toggle{font-size:22rpx;color:#087f72}.details{margin-top:13rpx;padding-top:4rpx;border-top:1rpx dashed #dfe9e7}
</style>
