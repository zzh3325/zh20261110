<template>
  <view>
    <AppHeader :title="reservoir.name || '大桥水库'" subtitle="安全运行态势总览">
      <view class="weather">
        <view class="weather-value">{{ weather.temperature ?? '--' }}°</view>
        <view>{{ weather.text || '暂无气象数据' }}</view>
      </view>
    </AppHeader>

    <view class="page home-body">
      <view v-if="auth.demoMode" class="demo-tip row between">
        <view>当前为演示模式</view><view class="pill">DEMO</view>
      </view>
      <view v-if="dataWarning && state === 'success'" class="data-warning">{{ dataWarning }}</view>
      <StatePanel :state="state" :message="errorMessage" @retry="load" />

      <template v-if="state === 'success'">
        <view class="hero-card card" @click="openReservoir">
          <view class="row between">
            <view>
              <view class="pill">{{ reservoir.level || '水利工程' }}</view>
              <view class="hero-title">{{ reservoir.name }}</view>
              <view class="hero-address">⌖ {{ reservoir.address || '位置信息待完善' }}</view>
            </view>
            <view class="status-ring"><view>概况</view><text>{{ auth.demoMode ? '演示' : '以实测为准' }}</text></view>
          </view>
          
          <view class="row between water-meta">
            <text>当前水位 {{ currentWaterLevel }} m</text>
            <text>汛限 {{ reservoir.floodLimitWaterLevel ?? '--' }} m</text>
          </view>
        </view>

        <view v-if="weather.time" class="muted water-meta">气象采集时间：{{ weather.time }}</view>
        <view class="section">
          <view class="section-title">数据概况</view>
          <view class="metric-grid">
            <MetricCard label="测点台账" :value="summary.online" caption="已登记测点" icon="⌁" />
            <MetricCard label="待处理预警" :value="summary.alerts" caption="需及时关注" icon="!" tone="orange" />
            <MetricCard label="巡检记录" :value="summary.inspections" caption="已上报记录" icon="✓" tone="blue" />
            <MetricCard label="气象记录雨量" :value="`${weather.rainfall ?? '--'} mm`" caption="以采集时间为准" icon="☂" />
          </view>
        </view>

        <view class="section">
          <view class="row between section-head"><view class="section-title">快捷入口</view></view>
          <DataEntries :keys="['devices','meteo','files','locations']" />
          <view class="quick-grid">
            <view v-for="item in quickActions" :key="item.title" class="quick-item" @click="item.action">
              <view class="quick-icon" :class="item.tone">{{ item.icon }}</view>
              <view>{{ item.title }}</view>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="row between section-head">
            <view class="section-title">重点关注</view>
            <view class="section-link" @click="goAlert">查看全部 ›</view>
          </view>
          <view class="card focus-card" @click="goAlert">
            <view class="alert-dot" />
            <view class="grow"><view class="strong">{{ focusAlert.title }}</view><view class="muted focus-meta">{{ focusAlert.location }} · {{ focusAlert.alertTime }}</view></view>
            <view v-if="focusAlert.id" class="pill warning-pill">{{ focusAlert.level || '告警' }}</view>
          </view>
        </view>
        <view class="section"><view class="section-title">设备运行状态</view><view class="card"><view>{{ deviceSummary }}</view><view class="muted water-meta">来自设备台账；未知状态单独统计，不作为在线设备。</view></view></view>
        <view class="section"><view class="section-title">最近巡检记录</view><view v-if="!recentInspections.length" class="card muted">{{ inspectionNotice }}</view><view v-for="record in recentInspections" :key="record.id" class="card" @click="openInspection(record.id)"><view class="strong">{{ record.title||record.name }}</view><view class="muted water-meta">{{ record.time||'时间未提供' }} · {{ record.result||'未填结果' }}</view><view class="muted water-meta">{{ record.assigneeName||'人员未提供' }} · {{ record.location||'位置未提供' }}</view></view></view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import MetricCard from '@/components/MetricCard.vue'
import StatePanel from '@/components/StatePanel.vue'
import DataEntries from '@/components/DataEntries.vue'
import { fetchData } from '@/api/data-browser'
import { dataSources } from '@/api/data-sources'
import type { Inspection } from '@/types/domain'
import { useAuthStore } from '@/stores/auth'
import { getReservoir } from '@/api/reservoir'
import { monitoringApi } from '@/api/monitoring'
import { getAllAlerts } from '@/api/alerts'
import { getInspections } from '@/api/inspection'
import { demoAlerts, demoInspections, demoPoints, demoReservoir } from '@/data/demo'
import { listOf, formatTime } from '@/utils/normalize'
import type { AlertItem, LoadState, Reservoir } from '@/types/domain'

const auth = useAuthStore()
const state = ref<LoadState>('loading')
const errorMessage = ref('')
const dataWarning = ref('')
const reservoir = reactive<Reservoir>({ id: 1, name: '' })
const weather = reactive<Record<string, string | number>>({})
const summary = reactive<{online: number | string; alerts: number | string; inspections: number | string}>({ online: '--', alerts: '--', inspections: '--' })
const focusAlert = reactive<AlertItem>({ id: '', title: '暂无重点预警', location: '--', alertTime: '--' })
const currentWaterLevel = ref<number | string>('--')
let loading = false
const recentInspections=ref<Inspection[]>([]),deviceSummary=ref('暂不可用'),inspectionNotice=ref('暂无巡检记录')
function openInspection(id:string|number){uni.navigateTo({url:'/pages/inspection/detail?id='+encodeURIComponent(String(id))})}

const quickActions = [
  { title: '监测数据', icon: '⌁', tone: 'green', action: () => uni.switchTab({ url: '/pages/monitoring/index' }) },
  { title: '视频监控', icon: '▶', tone: 'blue', action: () => uni.navigateTo({ url: '/pages/monitoring/video' }) },
  { title: '预警信息', icon: '!', tone: 'orange', action: () => uni.switchTab({ url: '/pages/alert/index' }) },
  { title: '巡检任务', icon: '✓', tone: 'purple', action: () => uni.switchTab({ url: '/pages/inspection/index' }) }
]

async function load() {
  if (loading) return
  if (!auth.demoMode && !uni.getStorageSync('auth-token')) { uni.reLaunch({url:'/pages/login/index'}); return }
  loading = true
  recentInspections.value=[];deviceSummary.value='暂不可用';inspectionNotice.value='巡检接口暂不可用'
  Object.keys(weather).forEach(key => delete weather[key])
  Object.keys(reservoir).forEach(key => delete reservoir[key])
  Object.assign(reservoir, { id: 1, name: '' })
  Object.assign(summary, {online:'--',alerts:'--',inspections:'--'})
  Object.assign(focusAlert, {id:'',title:'预警数据暂不可用',location:'--',alertTime:'--',level:''})
  currentWaterLevel.value = '--'
  state.value = 'loading'; errorMessage.value = ''; dataWarning.value = ''
  try {
    if (auth.demoMode) {
      Object.assign(reservoir, demoReservoir)
      currentWaterLevel.value = 2017.82
      Object.assign(weather, { temperature: 18.6, text: '多云', rainfall: 2.4 })
      Object.assign(summary, { online: demoPoints.length, alerts: demoAlerts.filter(a => a.status !== 'RESOLVED').length, inspections: demoInspections.filter(i => i.status === 'PENDING').length })
      Object.assign(focusAlert, demoAlerts[0])
    } else {
      const reservoirId = import.meta.env.VITE_RESERVOIR_ID || '1'
      const results = await Promise.allSettled([
        getReservoir(reservoirId),
        monitoringApi.meteoData({ page: 0, size: 1 }),
        monitoringApi.sensorPoints(),
        getAllAlerts(),
        getInspections(),
        fetchData(dataSources.find(s=>s.key==='devices')!,{})
      ])

      const [reservoirResult, meteoResult, pointsResult, alertsResult, inspectionsResult] = results
      const devicesResult=results[5]
      if(devicesResult.status==='fulfilled') {
        const devices=devicesResult.value.rows
        const count=(status:string)=>devices.filter(d=>d.deviceStatus===status).length
        const known=count('RUNNING')+count('OFFLINE')+count('MAINTENANCE')
        deviceSummary.value=`运行 ${count('RUNNING')} · 离线 ${count('OFFLINE')} · 维护 ${count('MAINTENANCE')} · 未知 ${devices.length-known}`
      }
      if (reservoirResult.status === 'fulfilled') Object.assign(reservoir, reservoirResult.value)

      if (meteoResult.status === 'fulfilled') {
        const latest = listOf<Record<string, unknown>>(meteoResult.value)[0]
        const values = (latest?.resultValue || {}) as Record<string, string | number>
        Object.assign(weather, {
          temperature: values['温度'] ?? '--',
          rainfall: values['降雨量'] ?? values['雨量'] ?? '--',
          text: latest ? '气象采集记录' : '暂无气象数据',
          time: latest ? formatTime(latest.collectTime) : ''
        })
      }

      const points = pointsResult.status === 'fulfilled' ? pointsResult.value : []
      const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : []
      const inspections = inspectionsResult.status === 'fulfilled' ? inspectionsResult.value : []
      if(inspectionsResult.status==='fulfilled') {
        inspectionNotice.value='暂无巡检记录'
        recentInspections.value=[...inspections].sort((a,b)=>(Date.parse(b.time||'')||0)-(Date.parse(a.time||'')||0)).slice(0,3)
      }
      Object.assign(summary, {
        online: pointsResult.status === 'fulfilled' ? points.length : '--',
        alerts: alertsResult.status === 'fulfilled' ? alerts.filter((alert) => !['已处理', 'RESOLVED', 'CLOSED'].includes(String(alert.status))).length : '--',
        inspections: inspectionsResult.status === 'fulfilled' ? inspections.length : '--'
      })
      if (alertsResult.status === 'fulfilled') {
        const pending = alerts.find(alert => !['已处理','RESOLVED','CLOSED'].includes(String(alert.status)))
        if (pending) Object.assign(focusAlert, pending)
        else focusAlert.title = '暂无未处理预警'
      }
      const failedCount = results.filter((result) => result.status === 'rejected').length
      if (failedCount) dataWarning.value = `${failedCount} 项实时数据暂不可用，其他内容已正常展示`
      if (failedCount === results.length) throw new Error('所有首页数据接口均不可用')
    }
    state.value = 'success'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '数据加载失败'
    state.value = 'error'
  } finally { loading = false }
}

function openReservoir() { uni.navigateTo({ url: '/pages/reservoir/detail' }) }
function goAlert() { uni.switchTab({ url: '/pages/alert/index' }) }
onShow(load)
</script>

<style scoped lang="scss">
.weather { text-align: right; font-size: 22rpx; opacity: .82; }.weather-value { font-size: 48rpx; font-weight: 700; line-height: 1; }
.home-body { margin-top: -22rpx; position: relative; }.demo-tip { margin-bottom: 20rpx; padding: 18rpx 22rpx; color: #675018; background: #fff4ce; border-radius: 16rpx; font-size: 23rpx; }
.data-warning { margin-bottom: 18rpx; padding: 16rpx 20rpx; border-radius: 14rpx; color: #8a611d; background: #fff4d8; font-size: 21rpx; }
.hero-card { padding: 30rpx; }.hero-title { font-size: 40rpx; font-weight: 800; margin: 16rpx 0 8rpx; }.hero-address { font-size: 23rpx; color: #6d7e7b; }
.status-ring { width: 122rpx; height: 122rpx; border-radius: 50%; border: 10rpx solid #d7f2eb; display: grid; place-content: center; text-align: center; color: #087f72; font-weight: 800; }.status-ring text { display: block; font-size: 18rpx; font-weight: 400; margin-top: 2rpx; }
.water-line { height: 12rpx; margin-top: 30rpx; border-radius: 99rpx; background: #e6efed; overflow: hidden; }.water-line view { height: 100%; border-radius: inherit; background: linear-gradient(90deg,#29bda7,#087f72); }
.water-meta { font-size: 20rpx; color: #748582; margin-top: 10rpx; }.metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18rpx; }
.section-head { margin-bottom: 18rpx; }.section-head .section-title { margin: 0; }.section-link { color: #087f72; font-size: 24rpx; }
.quick-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12rpx; padding: 28rpx 14rpx; background: #fff; border-radius: 24rpx; }.quick-item { text-align: center; font-size: 22rpx; }.quick-icon { width: 84rpx; height: 84rpx; margin: 0 auto 14rpx; display: grid; place-items: center; border-radius: 24rpx; font-size: 32rpx; color: #087f72; background: #e6f6f3; }.quick-icon.blue { color:#2874b8;background:#e8f2ff }.quick-icon.orange{color:#c97016;background:#fff0dc}.quick-icon.purple{color:#7958b5;background:#f1eaff}
.focus-card { display: flex; align-items: center; gap: 18rpx; }.alert-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #e58a2a; box-shadow: 0 0 0 8rpx #fff0df; }.focus-meta { font-size: 21rpx; margin-top: 8rpx; }.warning-pill { color:#b56312;background:#fff0dd }
</style>
