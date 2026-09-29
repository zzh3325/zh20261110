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
				<view>当前为演示模式</view>
				<view class="pill">DEMO</view>
			</view>
			<view v-if="dataWarning && state === 'success'" class="data-warning">{{ dataWarning }}</view>
			<StatePanel :state="state" :message="errorMessage" @retry="load" />

			<template v-if="state === 'success'">
				<view class="hero-card card">
					<swiper class="reservoir-swiper" circular autoplay :interval="4500" :duration="500" indicator-dots
						indicator-color="rgba(255,255,255,.55)" indicator-active-color="#ffffff" @click="openReservoir">
						<swiper-item v-for="slide in reservoirSlides" :key="slide.image">
							<view class="reservoir-slide">
								<image class="reservoir-backdrop" :src="slide.image" mode="aspectFill" />
								<image class="reservoir-image" :src="slide.image" mode="aspectFit" />
								<view class="slide-shade" />
								<view class="slide-caption"><text>{{ slide.title }}</text><text
										class="slide-link">查看工程概况 ›</text></view>
							</view>
						</swiper-item>
					</swiper>
					<view class="hero-content" @click="openReservoir">
						<view class="hero-top row between">
							<view class="hero-identity">
								<view class="pill">{{ reservoir.level || '水利工程' }}</view>
								<view class="hero-title">{{ reservoir.name }}</view>
								<view class="hero-address">⌖ {{ reservoir.address || '位置信息待完善' }}</view>
							</view>
							<view class="detail-badge">
								<view>工程概况</view><text>查看详情 ›</text>
							</view>
						</view>
						<view class="water-overview">
							<view class="water-reading">
								<view class="reading-label">当前库水位</view>
								<view><text class="reading-number">{{ displayNumber(currentWaterLevel) }}</text><text
										class="reading-unit">m</text></view>
							</view>
							<view class="water-reading">
								<view class="reading-label">汛限水位</view>
								<view><text class="reading-number">{{ displayNumber(floodLimitWaterLevel) }}</text><text
										class="reading-unit">m</text></view>
							</view>
						</view>
						<view class="hero-update"><text
								class="live-dot" />{{ hydrologyTime ? '水情更新 '+formatDisplayTime(hydrologyTime) : '水情更新时间未提供' }}
						</view>
					</view>
				</view>

				<view v-if="weather.time" class="muted water-meta">气象采集时间：{{ weather.time }}</view>
				<view class="section">
					<view class="section-heading">
						<view>
							<view class="section-title">数据概况</view>
							<view class="section-note">关键业务数据实时汇总</view>
						</view>
						<view class="date-chip">{{ todayText }}</view>
					</view>
					<view class="metric-grid">
						<MetricCard label="测点台账" :value="summary.online" caption="已登记测点" icon="⌁" />
						<MetricCard label="待处理预警" :value="summary.alerts" caption="需及时关注" icon="!" tone="orange" />
						<MetricCard label="巡检记录" :value="summary.inspections" caption="已上报记录" icon="✓" tone="blue" />
						<MetricCard label="气象记录雨量" :value="rainfallValue" :caption="rainfallCaption" icon="☂" />
					</view>
				</view>

				<view class="section">
					<view class="section-heading">
						<view>
							<view class="section-title">快捷入口</view>
							<view class="section-note">{{ quickEditing ? '点击已选入口移除，在下方添加' : '常用业务一键直达' }}</view>
						</view>
						<view class="section-tool" @click="toggleQuickEditing">{{ quickEditing ? '完成' : '管理' }}</view>
					</view>
					<view v-if="quickEditing" class="quick-config-tip row between"><text>入口配置保存在当前设备</text><text
							@click="resetQuickActions">恢复默认</text></view>
					<view class="quick-grid">
						<view v-for="item in visibleQuickActions" :key="item.key" class="quick-item"
							:class="{editing:quickEditing}" @click="handleQuickAction(item)">
							<view v-if="quickEditing" class="quick-remove">−</view>
							<view class="quick-icon" :class="item.tone">{{ item.icon }}</view>
							<view>{{ item.title }}</view>
						</view>
					</view>
					<view v-if="quickEditing" class="quick-add-panel">
						<view class="quick-add-title">可添加入口</view>
						<view v-if="availableQuickActions.length" class="quick-add-list">
							<view v-for="item in availableQuickActions" :key="item.key" class="quick-add-item"
								@click="addQuickAction(item.key)"><text>＋</text>{{ item.title }}</view>
						</view>
						<view v-else class="quick-all-added">全部入口均已添加</view>
					</view>
				</view>

				<view class="section">
					<view class="row between section-head">
						<view class="section-title">重点关注</view>
						<view class="section-link" @click="goAlert">查看全部 ›</view>
					</view>
					<view class="card focus-card" @click="goAlert">
						<view class="alert-dot" />
						<view class="grow">
							<view class="strong">{{ focusAlert.title }}</view>
							<view class="muted focus-meta">{{ focusAlert.location }} · {{ focusAlert.alertTime }}</view>
						</view>
						<view v-if="focusAlert.id" class="pill warning-pill">{{ focusAlert.level || '告警' }}</view>
					</view>
				</view>
				<view class="section">
					<view class="section-heading">
						<view>
							<view class="section-title">设备运行状态</view>
							<view class="section-note">设备台账状态汇总</view>
						</view>
					</view>
					<view class="card status-card">
						<view class="status-summary">{{ deviceSummary }}</view>
						<view class="muted status-note">未知状态单独统计，不计入在线设备。</view>
					</view>
				</view>
				<view class="section">
					<view class="section-heading">
						<view>
							<view class="section-title">最近巡检</view>
							<view class="section-note">近期上报的巡检记录</view>
						</view>
					</view>
					<view v-if="!recentInspections.length" class="card muted">{{ inspectionNotice }}</view>
					<view v-for="record in recentInspections" :key="record.id" class="card inspection-card"
						@click="openInspection(record.id)">
						<view class="row between">
							<view class="strong">{{ record.title||record.name }}</view>
							<view class="record-arrow">›</view>
						</view>
						<view class="muted water-meta">{{ record.time||'时间未提供' }} · {{ record.result||'未填结果' }}</view>
						<view class="muted water-meta">{{ record.assigneeName||'人员未提供' }} ·
							{{ record.location||'位置未提供' }}
						</view>
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
	import { fetchData } from '@/api/data-browser'
	import { dataSources } from '@/api/data-sources'
	import { openDataSource } from '@/api/data-sources'
	import { loadLatestHydrology, loadLatestWeather } from '@/api/home-dashboard'
	import type { Inspection } from '@/types/domain'
	import { useAuthStore } from '@/stores/auth'
	import { getReservoir } from '@/api/reservoir'
	import { monitoringApi } from '@/api/monitoring'
	import { getAllAlerts } from '@/api/alerts'
	import { getInspections } from '@/api/inspection'
	import { demoAlerts, demoInspections, demoPoints, demoReservoir } from '@/data/demo'
	import { formatTime } from '@/utils/normalize'
	import type { AlertItem, LoadState, Reservoir } from '@/types/domain'

	const auth = useAuthStore()
	const state = ref<LoadState>('loading')
	const errorMessage = ref('')
	const dataWarning = ref('')
	const reservoir = reactive<Reservoir>({ id: 1, name: '' })
	const weather = reactive<Record<string, string | number>>({})
	const summary = reactive<{ online : number | string; alerts : number | string; inspections : number | string }>({ online: '--', alerts: '--', inspections: '--' })
	const focusAlert = reactive<AlertItem>({ id: '', title: '暂无重点预警', location: '--', alertTime: '--' })
	const currentWaterLevel = ref<number | string>('--')
	const floodLimitWaterLevel = ref<number | string>('--')
	const hydrologyTime = ref('')
	const todayText = new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(new Date())
	const rainfallAvailable = computed(() => weather.rainfall !== undefined && weather.rainfall !== null && weather.rainfall !== '--' && String(weather.rainfall) !== '')
	const rainfallValue = computed(() => rainfallAvailable.value ? `${weather.rainfall} mm` : '未返回')
	const rainfallCaption = computed(() => rainfallAvailable.value ? '以最新采集时间为准' : '最新气象记录未包含雨量')
	let loading = false
	const recentInspections = ref<Inspection[]>([]), deviceSummary = ref('暂不可用'), inspectionNotice = ref('暂无巡检记录')
	function openInspection(id : string | number) { uni.navigateTo({ url: '/pages/inspection/detail?id=' + encodeURIComponent(String(id)) }) }

	const reservoirSlides = [
		{ image: '/static/home/daqiao-reservoir-01.png', title: '大桥水库全景' },
		{ image: '/static/home/daqiao-reservoir-02.png', title: '大桥水库枢纽' },
		{ image: '/static/home/daqiao-reservoir-03.png', title: '大桥水库全景' },
		{ image: '/static/home/daqiao-reservoir-04.jpg', title: '大桥水库全景' }
	]
	const QUICK_STORAGE_KEY = 'home-quick-action-keys'
	const allQuickActions = [
		{ key: 'monitoring', title: '综合监测', icon: '测', tone: 'green', action: () => uni.switchTab({ url: '/pages/monitoring/index' }) },
		{ key: 'devices', title: '设备台账', icon: '设', tone: 'cyan', action: () => uni.navigateTo({ url: '/pages/device/index' }) },
		{ key: 'video', title: '视频监控', icon: '▶', tone: 'blue', action: () => uni.navigateTo({ url: '/pages/monitoring/video' }) },
		{ key: 'weather', title: '气象观测', icon: '气', tone: 'sky', action: () => uni.navigateTo({ url: '/pages/monitoring/business?category=weather' }) },
		{ key: 'alerts', title: '预警信息', icon: '!', tone: 'orange', action: () => uni.switchTab({ url: '/pages/alert/index' }) },
		{ key: 'inspections', title: '巡检任务', icon: '巡', tone: 'purple', action: () => uni.switchTab({ url: '/pages/inspection/index' }) },
		{ key: 'files', title: '档案资料', icon: '档', tone: 'brown', action: () => openDataSource('files') },
		{ key: 'locations', title: '资产位置', icon: '位', tone: 'rose', action: () => openDataSource('locations') }
	] as const
	type QuickAction = typeof allQuickActions[number]
	type QuickActionKey = QuickAction['key']
	const defaultQuickKeys : QuickActionKey[] = ['monitoring', 'devices', 'video', 'weather', 'alerts', 'inspections', 'files', 'locations']
	function readQuickKeys() {
		const stored = uni.getStorageSync(QUICK_STORAGE_KEY)
		const values = Array.isArray(stored) ? stored : []
		const valid = values.filter((key) : key is QuickActionKey => allQuickActions.some(item => item.key === key))
		return valid.length ? Array.from(new Set(valid)) : defaultQuickKeys.slice()
	}
	const quickKeys = ref<QuickActionKey[]>(readQuickKeys())
	const quickEditing = ref(false)
	const visibleQuickActions = computed(() => quickKeys.value.map(key => allQuickActions.find(item => item.key === key)).filter((item) : item is QuickAction => Boolean(item)))
	const availableQuickActions = computed(() => allQuickActions.filter(item => !quickKeys.value.includes(item.key)))
	function saveQuickKeys() { uni.setStorageSync(QUICK_STORAGE_KEY, quickKeys.value) }
	function toggleQuickEditing() { quickEditing.value = !quickEditing.value }
	function handleQuickAction(item : QuickAction) { if (quickEditing.value) { removeQuickAction(item.key); return }; item.action() }
	function removeQuickAction(key : QuickActionKey) {
		if (quickKeys.value.length <= 1) { uni.showToast({ title: '至少保留一个快捷入口', icon: 'none' }); return }
		quickKeys.value = quickKeys.value.filter(item => item !== key); saveQuickKeys()
	}
	function addQuickAction(key : QuickActionKey) { if (!quickKeys.value.includes(key)) { quickKeys.value.push(key); saveQuickKeys() } }
	function resetQuickActions() { quickKeys.value = defaultQuickKeys.slice(); saveQuickKeys(); uni.showToast({ title: '已恢复默认入口', icon: 'none' }) }

	function displayNumber(value : unknown) { const number = Number(value); return value === null || value === undefined || String(value) === '' || !Number.isFinite(number) ? '--' : number.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) }
	function formatDisplayTime(value : string) { return value.replace('T', ' ').replace(/(\.\d{3})\d+/, '$1') }

	async function load() {
		if (loading) return
		if (!auth.demoMode && !uni.getStorageSync('auth-token')) { uni.reLaunch({ url: '/pages/login/index' }); return }
		loading = true
		recentInspections.value = []; deviceSummary.value = '暂不可用'; inspectionNotice.value = '巡检接口暂不可用'
		Object.keys(weather).forEach(key => delete weather[key])
		Object.keys(reservoir).forEach(key => delete reservoir[key])
		Object.assign(reservoir, { id: 1, name: '' })
		Object.assign(summary, { online: '--', alerts: '--', inspections: '--' })
		Object.assign(focusAlert, { id: '', title: '预警数据暂不可用', location: '--', alertTime: '--', level: '' })
		currentWaterLevel.value = '--'; floodLimitWaterLevel.value = '--'; hydrologyTime.value = ''
		state.value = 'loading'; errorMessage.value = ''; dataWarning.value = ''
		try {
			if (auth.demoMode) {
				Object.assign(reservoir, demoReservoir)
				currentWaterLevel.value = 2017.82
				floodLimitWaterLevel.value = demoReservoir.floodLimitWaterLevel ?? '--'
				hydrologyTime.value = new Date().toISOString()
				Object.assign(weather, { temperature: 18.6, text: '多云', rainfall: 2.4 })
				Object.assign(summary, { online: demoPoints.length, alerts: demoAlerts.filter(a => a.status !== 'RESOLVED').length, inspections: demoInspections.filter(i => i.status === 'PENDING').length })
				Object.assign(focusAlert, demoAlerts[0])
			} else {
				const reservoirId = import.meta.env.VITE_RESERVOIR_ID || '1'
				const results = await Promise.allSettled([
					getReservoir(reservoirId),
					loadLatestWeather(),
					loadLatestHydrology(),
					monitoringApi.sensorPoints(),
					getAllAlerts(),
					getInspections(),
					fetchData(dataSources.find(s => s.key === 'devices')!, {})
				])

				const [reservoirResult, meteoResult, hydrologyResult, pointsResult, alertsResult, inspectionsResult, devicesResult] = results
				if (devicesResult.status === 'fulfilled') {
					const devices = devicesResult.value.rows
					const count = (status : string) => devices.filter(d => d.deviceStatus === status).length
					const known = count('RUNNING') + count('OFFLINE') + count('MAINTENANCE')
					deviceSummary.value = `运行 ${count('RUNNING')} · 离线 ${count('OFFLINE')} · 维护 ${count('MAINTENANCE')} · 未知 ${devices.length - known}`
				}
				if (reservoirResult.status === 'fulfilled') Object.assign(reservoir, reservoirResult.value)

				if (meteoResult.status === 'fulfilled') {
					Object.assign(weather, {
						temperature: meteoResult.value.temperature ?? '--',
						rainfall: meteoResult.value.rainfall ?? '--',
						humidity: meteoResult.value.humidity ?? '--',
						text: '最新气象实测',
						time: formatTime(meteoResult.value.time)
					})
				}
				if (hydrologyResult.status === 'fulfilled') {
					currentWaterLevel.value = hydrologyResult.value.currentWaterLevel ?? '--'
					floodLimitWaterLevel.value = hydrologyResult.value.floodLimitWaterLevel ?? reservoir.floodLimitWaterLevel ?? '--'
					hydrologyTime.value = hydrologyResult.value.time
				} else floodLimitWaterLevel.value = reservoir.floodLimitWaterLevel ?? '--'

				const points = pointsResult.status === 'fulfilled' ? pointsResult.value : []
				const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : []
				const inspections = inspectionsResult.status === 'fulfilled' ? inspectionsResult.value : []
				if (inspectionsResult.status === 'fulfilled') {
					inspectionNotice.value = '暂无巡检记录'
					recentInspections.value = [...inspections].sort((a, b) => (Date.parse(b.time || '') || 0) - (Date.parse(a.time || '') || 0)).slice(0, 3)
				}
				Object.assign(summary, {
					online: pointsResult.status === 'fulfilled' ? points.length : '--',
					alerts: alertsResult.status === 'fulfilled' ? alerts.filter((alert) => !['已处理', 'RESOLVED', 'CLOSED'].includes(String(alert.status))).length : '--',
					inspections: inspectionsResult.status === 'fulfilled' ? inspections.length : '--'
				})
				if (alertsResult.status === 'fulfilled') {
					const pending = alerts.find(alert => !['已处理', 'RESOLVED', 'CLOSED'].includes(String(alert.status)))
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
	.weather {
		text-align: right;
		font-size: 20rpx;
		opacity: .88;
	}

	.weather-value {
		font-size: 50rpx;
		font-weight: 800;
		line-height: 1;
	}

	.home-body {
		margin-top: -22rpx;
		position: relative;
		padding-bottom: 42rpx
	}

	.demo-tip {
		margin-bottom: 20rpx;
		padding: 18rpx 22rpx;
		color: #675018;
		background: #fff4ce;
		border-radius: 16rpx;
		font-size: 23rpx;
	}

	.data-warning {
		margin-bottom: 18rpx;
		padding: 16rpx 20rpx;
		border-radius: 14rpx;
		color: #8a611d;
		background: #fff4d8;
		font-size: 21rpx;
	}

	.hero-card {
		position: relative;
		overflow: hidden;
		padding: 0;
		border: 1rpx solid #dcebe8;
		background: linear-gradient(145deg, #fff 20%, #eef9f6)
	}

	.reservoir-swiper {
		height: 420rpx;
		background: #173c38
	}

	.reservoir-slide {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: #173c38
	}

	.reservoir-backdrop {
		position: absolute;
		inset: -18rpx;
		width: calc(100% + 36rpx);
		height: calc(100% + 36rpx);
		opacity: .48;
		filter: blur(15rpx);
		transform: scale(1.04)
	}

	.reservoir-image {
		position: relative;
		z-index: 1;
		display: block;
		width: 100%;
		height: 100%
	}

	.slide-shade {
		position: absolute;
		z-index: 2;
		inset: 0;
		background: linear-gradient(180deg, rgba(4, 29, 26, .02) 45%, rgba(3, 30, 27, .72))
	}

	.slide-caption {
		position: absolute;
		z-index: 3;
		left: 26rpx;
		right: 26rpx;
		bottom: 29rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: #fff;
		font-size: 25rpx;
		font-weight: 800;
		text-shadow: 0 2rpx 6rpx #0008
	}

	.slide-link {
		font-size: 18rpx;
		font-weight: 500
	}

	.hero-content {
		position: relative;
		padding: 28rpx 30rpx 30rpx
	}

	.hero-content::after {
		content: '';
		position: absolute;
		width: 220rpx;
		height: 220rpx;
		right: -100rpx;
		top: -110rpx;
		border-radius: 50%;
		background: #0aa28b12
	}

	.hero-top,
	.water-overview,
	.hero-update {
		position: relative;
		z-index: 1
	}

	.hero-top {
		align-items: flex-start
	}

	.hero-identity {
		min-width: 0;
		padding-right: 16rpx
	}

	.hero-title {
		font-size: 40rpx;
		font-weight: 850;
		margin: 15rpx 0 8rpx;
	}

	.hero-address {
		font-size: 22rpx;
		color: #6d7e7b;
		overflow-wrap: anywhere
	}

	.detail-badge {
		flex: none;
		text-align: right;
		color: #087f72;
		font-size: 21rpx;
		font-weight: 800;
		padding: 12rpx 14rpx;
		border-radius: 16rpx;
		background: #e4f5f1
	}

	.detail-badge text {
		display: block;
		font-size: 17rpx;
		font-weight: 400;
		margin-top: 3rpx
	}

	.water-overview {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14rpx;
		margin-top: 26rpx
	}

	.water-reading {
		padding: 20rpx;
		border-radius: 18rpx;
		background: #f1f8f6;
		border: 1rpx solid #e1eeeb
	}

	.water-reading:first-child {
		color: #fff;
		background: linear-gradient(135deg, #0b9382, #08746b);
		border-color: transparent
	}

	.reading-label {
		font-size: 19rpx;
		opacity: .78;
		margin-bottom: 8rpx
	}

	.reading-number {
		font-size: 36rpx;
		font-weight: 900
	}

	.reading-unit {
		font-size: 19rpx;
		margin-left: 7rpx;
		opacity: .76
	}

	.hero-update {
		display: flex;
		align-items: center;
		color: #6e817d;
		font-size: 19rpx;
		margin-top: 17rpx
	}

	.live-dot {
		width: 10rpx;
		height: 10rpx;
		border-radius: 50%;
		background: #13aa83;
		box-shadow: 0 0 0 5rpx #13aa8320;
		margin-right: 9rpx
	}

	.water-meta {
		font-size: 20rpx;
		color: #748582;
		margin-top: 10rpx;
	}

	.metric-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18rpx;
	}

	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 18rpx;
		margin-bottom: 18rpx
	}

	.section-heading .section-title {
		margin: 0
	}

	.section-note {
		font-size: 19rpx;
		color: #879592;
		margin-top: 5rpx
	}

	.date-chip {
		flex: none;
		color: #087f72;
		background: #e3f4f0;
		border-radius: 999rpx;
		padding: 7rpx 12rpx;
		font-size: 18rpx
	}

	.section-head {
		margin-bottom: 18rpx;
	}

	.section-head .section-title {
		margin: 0;
	}

	.section-link {
		color: #087f72;
		font-size: 22rpx;
	}

	.section-tool {
		flex: none;
		color: #087f72;
		background: #e4f5f1;
		border-radius: 999rpx;
		padding: 10rpx 20rpx;
		font-size: 20rpx;
		font-weight: 700
	}

	.quick-config-tip {
		margin: -3rpx 4rpx 13rpx;
		padding: 13rpx 17rpx;
		border-radius: 14rpx;
		color: #637672;
		background: #eef7f5;
		font-size: 18rpx
	}

	.quick-config-tip text:last-child {
		color: #087f72;
		font-weight: 700
	}

	.quick-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8rpx;
		padding: 24rpx 10rpx;
		background: #fff;
		border: 1rpx solid #e3eeeb;
		border-radius: 24rpx;
		box-shadow: 0 8rpx 24rpx #17463e0b
	}

	.quick-item {
		position: relative;
		min-width: 0;
		text-align: center;
		font-size: 19rpx;
		color: #526965;
		padding: 8rpx 0;
		border-radius: 16rpx
	}

	.quick-item:active {
		background: #f0f8f6
	}

	.quick-item.editing {
		animation: quick-breathe 1.5s ease-in-out infinite
	}

	.quick-remove {
		position: absolute;
		z-index: 2;
		right: 8rpx;
		top: 0;
		width: 28rpx;
		height: 28rpx;
		line-height: 25rpx;
		border-radius: 50%;
		color: #fff;
		background: #e06464;
		font-size: 25rpx;
		font-weight: 700;
		box-shadow: 0 3rpx 8rpx #9d303044
	}

	.quick-icon {
		width: 66rpx;
		height: 66rpx;
		margin: 0 auto 10rpx;
		display: grid;
		place-items: center;
		border-radius: 20rpx;
		font-size: 23rpx;
		font-weight: 800;
		color: #087f72;
		background: #e6f6f3;
	}

	.quick-icon.blue {
		color: #2874b8;
		background: #e8f2ff
	}

	.quick-icon.orange {
		color: #c97016;
		background: #fff0dc
	}

	.quick-icon.purple {
		color: #7958b5;
		background: #f1eaff
	}

	.quick-icon.cyan {
		color: #087f72;
		background: #e2f4f2
	}

	.quick-icon.sky {
		color: #2672a8;
		background: #e6f4fb
	}

	.quick-icon.brown {
		color: #9a681d;
		background: #f8efdf
	}

	.quick-icon.rose {
		color: #ad526b;
		background: #faeaf0
	}

	.quick-add-panel {
		margin-top: 14rpx;
		padding: 20rpx;
		border: 1rpx dashed #bcded7;
		border-radius: 20rpx;
		background: #f8fbfa
	}

	.quick-add-title {
		font-size: 20rpx;
		font-weight: 750;
		color: #526965;
		margin-bottom: 13rpx
	}

	.quick-add-list {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx
	}

	.quick-add-item {
		padding: 11rpx 17rpx;
		border-radius: 999rpx;
		color: #087f72;
		background: #e4f5f1;
		font-size: 19rpx
	}

	.quick-add-item text {
		font-weight: 900;
		margin-right: 5rpx
	}

	.quick-all-added {
		color: #879592;
		font-size: 19rpx
	}

	@keyframes quick-breathe {
		50% {
			transform: translateY(-2rpx)
		}
	}

	.focus-card {
		display: flex;
		align-items: center;
		gap: 18rpx;
	}

	.alert-dot {
		width: 14rpx;
		height: 14rpx;
		border-radius: 50%;
		background: #e58a2a;
		box-shadow: 0 0 0 8rpx #fff0df;
	}

	.focus-meta {
		font-size: 21rpx;
		margin-top: 8rpx;
	}

	.warning-pill {
		color: #b56312;
		background: #fff0dd
	}

	.status-card {
		border-left: 8rpx solid #0b9584
	}

	.status-summary {
		font-size: 25rpx;
		font-weight: 750;
		line-height: 1.6
	}

	.status-note {
		font-size: 19rpx;
		margin-top: 8rpx
	}

	.inspection-card {
		margin-bottom: 14rpx
	}

	.inspection-card .strong {
		min-width: 0;
		overflow-wrap: anywhere
	}

	.record-arrow {
		flex: none;
		color: #087f72;
		font-size: 34rpx
	}
</style>