<template>
  <view>
    <AppHeader :title="reservoir.name || '大桥水库'" subtitle="安全运行态势总览">
      <view class="weather">
        <view class="weather-value">{{ weather.temperature ?? 18 }}°</view>
        <view>{{ weather.text || '多云' }}</view>
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
            <view class="status-ring"><view>安全</view><text>运行中</text></view>
          </view>
          <view class="water-line"><view :style="{ width: waterPercent + '%' }" /></view>
          <view class="row between water-meta">
            <text>当前水位 {{ currentWaterLevel }} m</text>
            <text>汛限 {{ reservoir.floodLimitWaterLevel || '--' }} m</text>
          </view>
        </view>

        <view class="section">
          <view class="section-title">今日态势</view>
          <view class="metric-grid">
            <MetricCard label="在线测点" :value="summary.online" caption="运行正常" icon="⌁" />
            <MetricCard label="待处理预警" :value="summary.alerts" caption="需及时关注" icon="!" tone="orange" />
            <MetricCard label="待巡检任务" :value="summary.inspections" caption="今日计划" icon="✓" tone="blue" />
            <MetricCard label="今日降雨" :value="`${weather.rainfall ?? 0} mm`" caption="近24小时" icon="☂" />
          </view>
        </view>

        <view class="section">
          <view class="row between section-head"><view class="section-title">快捷入口</view></view>
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
            <view class="pill warning-pill">Ⅱ级</view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import MetricCard from '@/components/MetricCard.vue'
import StatePanel from '@/components/StatePanel.vue'
import { useAuthStore } from '@/stores/auth'
import { getReservoir } from '@/api/reservoir'
import { monitoringApi } from '@/api/monitoring'
import { getAllAlerts } from '@/api/alerts'
import { getInspections } from '@/api/inspection'
import { demoAlerts, demoInspections, demoPoints, demoReservoir } from '@/data/demo'
import { listOf } from '@/utils/normalize'
import type { AlertItem, LoadState, Reservoir } from '@/types/domain'

const auth = useAuthStore()
const state = ref<LoadState>('loading')
const errorMessage = ref('')
const dataWarning = ref('')
const reservoir = reactive<Reservoir>({ id: 1, name: '' })
const weather = reactive<Record<string, string | number>>({})
const summary = reactive({ online: 0, alerts: 0, inspections: 0 })
const focusAlert = reactive<AlertItem>({ id: '', title: '暂无重点预警', location: '--', alertTime: '--' })
const currentWaterLevel = ref<number | string>(2017.82)
const waterPercent = computed(() => Math.min(100, Math.max(18, 70 + (Number(currentWaterLevel.value) % 1) * 20)))

const quickActions = [
  { title: '监测数据', icon: '⌁', tone: 'green', action: () => uni.switchTab({ url: '/pages/monitoring/index' }) },
  { title: '视频监控', icon: '▶', tone: 'blue', action: () => uni.navigateTo({ url: '/pages/monitoring/video' }) },
  { title: '预警信息', icon: '!', tone: 'orange', action: () => uni.switchTab({ url: '/pages/alert/index' }) },
  { title: '巡检任务', icon: '✓', tone: 'purple', action: () => uni.switchTab({ url: '/pages/inspection/index' }) }
]

async function load() {
  state.value = 'loading'; errorMessage.value = ''; dataWarning.value = ''
  try {
    if (auth.demoMode) {
      Object.assign(reservoir, demoReservoir)
      Object.assign(weather, { temperature: 18.6, text: '多云', rainfall: 2.4 })
      Object.assign(summary, { online: demoPoints.length, alerts: demoAlerts.filter(a => a.status !== 'RESOLVED').length, inspections: demoInspections.filter(i => i.status === 'PENDING').length })
      Object.assign(focusAlert, demoAlerts[0])
    } else {
      const reservoirId = import.meta.env.VITE_RESERVOIR_ID || '1'
      const results = await Promise.allSettled([
        getReservoir(reservoirId),
        monitoringApi.meteoData({ page: 1, size: 1 }),
        monitoringApi.sensorPoints(),
        getAllAlerts(),
        getInspections()
      ])

      const [reservoirResult, meteoResult, pointsResult, alertsResult, inspectionsResult] = results
      if (reservoirResult.status === 'fulfilled') Object.assign(reservoir, reservoirResult.value)

      if (meteoResult.status === 'fulfilled') {
        const latest = listOf<Record<string, unknown>>(meteoResult.value)[0]
        const values = (latest?.resultValue || {}) as Record<string, string | number>
        Object.assign(weather, {
          temperature: values['温度'] ?? '--',
          rainfall: values['降雨量'] ?? values['雨量'] ?? 0,
          text: Number(values['湿度']) >= 85 ? '湿度较高' : '气象正常'
        })
      }

      const points = pointsResult.status === 'fulfilled' ? pointsResult.value : []
      const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : []
      const inspections = inspectionsResult.status === 'fulfilled' ? inspectionsResult.value : []
      Object.assign(summary, {
        online: points.filter((point) => point.status !== 'offline').length,
        alerts: alerts.filter((alert) => !['已处理', 'RESOLVED', 'CLOSED'].includes(String(alert.status))).length,
        inspections: inspections.filter((inspection) => !['正常', '已完成', 'COMPLETED', 'DONE'].includes(String(inspection.status ?? inspection.condition))).length
      })
      if (alerts[0]) Object.assign(focusAlert, alerts[0])
      const failedCount = results.filter((result) => result.status === 'rejected').length
      if (failedCount) dataWarning.value = `${failedCount} 项实时数据暂不可用，其他内容已正常展示`
      if (failedCount === results.length) throw new Error('所有首页数据接口均不可用')
    }
    state.value = 'success'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '数据加载失败'
    state.value = 'error'
  }
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
