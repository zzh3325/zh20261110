<template>
	<view class="page detail-page">
		<StatePanel :state="state" :message="error" @retry="load" />
		<template v-if="state==='success'">
			<view class="record-hero">
				<view class="hero-decoration"></view>
				<view class="record-number">巡检记录 · #{{ task.id || id }}</view>
				<view class="hero-main">
					<view class="hero-title">{{ task.title||'安全巡检记录' }}</view>
					<view class="result-badge" :class="resultClass">{{ task.result||'未填结果' }}</view>
				</view>
				<view class="hero-meta">
					<view class="type-chip">{{ task.inspectionType||'巡检类型未提供' }}</view>
					<view class="hero-time"><text>◷</text>{{ formatTime(task.time||task.inspectionTime) }}</view>
				</view>
			</view>

			<view class="section-heading">
				<view>
					<view class="section-title">基础信息</view>
					<view class="section-note">本次巡检的现场记录</view>
				</view>
			</view>
			<view class="info-card">
				<view v-for="field in fields" :key="field.key" class="info-row">
					<view class="info-icon">{{ field.icon }}</view>
					<view class="info-label">{{ field.label }}</view>
					<text class="info-value" selectable>{{ field.value }}</text>
				</view>
			</view>

			<view class="section-heading photo-heading">
				<view>
					<view class="section-title">现场照片</view>
					<view class="section-note">巡检过程中上传的影像记录</view>
				</view>
				<view class="photo-count">{{ photos.length }} 张</view>
			</view>
			<view v-if="photos.length" class="photo-card">
				<view class="photos" :class="{single:photos.length===1}">
					<view v-for="(photo,index) in photos" :key="photo.path" class="photo-item">
						<image v-if="photo.url" :src="photo.url" mode="aspectFill" @click="preview(photo.url)" />
						<view v-else class="photo-failed"><text>!</text>
							<view>照片加载失败</view>
						</view>
						<view class="photo-index">{{ String(index+1).padStart(2,'0') }}</view>
					</view>
				</view>
				<view v-if="photoWarning" class="photo-warning">{{ photoWarning }}</view>
			</view>
			<view v-else class="empty-photo">
				<view class="empty-photo-icon">▧</view>
				<view>暂无现场照片</view>
			</view>

      <view v-if="!photos.length" class="photo-required-hint">该记录缺少现场照片，尚未完成巡检，请编辑记录补拍上传至少 1 张。</view>
			<view class="action-panel">
				<button class="edit-button" @click="edit"><text>✎</text>编辑记录</button>
				<button class="delete-button" :loading="deleting" @click="remove"><text>×</text>删除记录</button>
			</view>
			<view class="permission-note">编辑和删除操作将由后端校验当前账号权限</view>
		</template>
	</view>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'
	import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
	import StatePanel from '@/components/StatePanel.vue'
	import { deleteInspection, getInspection } from '@/api/inspection'
	import { loadInspectionPhoto, releaseInspectionPhoto } from '@/utils/photos'
	import type { Inspection, LoadState } from '@/types/domain'
  import { coordinateSystemLabel } from '@/utils/inspection-coordinates'

	const state = ref<LoadState>('loading'), error = ref(''), id = ref(''), task = ref<Inspection>({ id: '' }), photoWarning = ref(''), deleting = ref(false)
	const photos = ref<Array<{ path : string; url : string }>>([])
	const resultClass = computed(() => String(task.value.result || '').includes('异常') ? 'abnormal' : String(task.value.result || '').includes('正常') ? 'normal' : 'unknown')
	const fields = computed(() => [
		{ key: 'location', icon: '位', label: '巡检位置' },
		{ key: 'assigneeName', icon: '人', label: '巡检人员' },
		...(task.value.pointId ? [
      { key: 'pointName', icon: '点', label: '巡检点位' },
      { key: 'pointCode', icon: '号', label: '点位编号' },
      { key: 'pointArea', icon: '区', label: '所属区域' }
    ] : []),
    ...(task.value.checkInMethod ? [{ key: 'checkInMethod', icon: '核', label: '打卡方式' }, { key: 'checkInTime', icon: '时', label: '核验时间' }] : []),
    ...(task.value.coordinate ? [{ key: 'coordinate', icon: '标', label: task.value.coordinateSource === 'POINT_PRESET' ? '预设坐标（纬,经）' : '历史坐标' }] : []),
    ...(task.value.coordinateSystem || task.value.coordinateSource === 'POINT_PRESET' ? [{ key: 'coordinateSystem', icon: '系', label: '坐标系' }] : []),
    { key: 'coordinateSource', icon: '源', label: '坐标来源' },
		{ key: 'description', icon: '记', label: '问题说明' }
  ].map(field => ({ ...field, value: String(field.key === 'coordinateSystem' ? coordinateSystemLabel(task.value.coordinateSystem || (task.value.coordinateSource === 'POINT_PRESET' ? 'WGS84' : '')) : field.key === 'coordinateSource' ? (task.value.coordinateSource === 'POINT_PRESET' ? 'PC 点位预设，非实时定位' : task.value.coordinateSource || '历史坐标') : field.key === 'checkInMethod' && task.value.checkInMethod === 'QR_CODE' ? '二维码核验' : field.key === 'checkInTime' ? formatTime(task.value.checkInTime) : task.value[field.key] ?? '').trim() || '未提供' })))
	let busy = false

	function formatTime(value ?: string) { const text = String(value || '').trim(); return text ? text.replace('T', ' ').replace(/\.\d+(?=$|Z)/, '').replace(/Z$/, '') : '时间未提供' }
	function releasePhotos() { photos.value.forEach(photo => photo.url && releaseInspectionPhoto(photo.url)); photos.value = [] }
	async function load() {
		if (!id.value || busy) return
		busy = true; state.value = 'loading'; error.value = ''; photoWarning.value = ''; releasePhotos()
		try {
			task.value = await getInspection(id.value)
			let failed = false
			for (const path of Array.isArray(task.value.photoPaths) ? task.value.photoPaths : []) {
				const photo = { path, url: '' }; photos.value.push(photo)
				try { photo.url = await loadInspectionPhoto(id.value, path) } catch { failed = true }
			}
			if (failed) photoWarning.value = '部分照片加载失败，请检查文件是否仍存在及账号访问权限。'
			state.value = 'success'
		} catch (cause) { error.value = cause instanceof Error ? cause.message : '加载失败'; state.value = 'error' } finally { busy = false }
	}
	function preview(url : string) { const urls = photos.value.map(photo => photo.url).filter(Boolean); if (url) uni.previewImage({ urls, current: url }) }
	function edit() { uni.navigateTo({ url: '/pages/inspection/execute?id=' + encodeURIComponent(id.value) }) }
	function remove() {
		if (deleting.value) return
		uni.showModal({
			title: '删除巡检记录', content: '删除后无法恢复，确认删除这条巡检记录吗？', confirmColor: '#d44747', success: async modal => {
				if (!modal.confirm) return
				deleting.value = true
				try { await deleteInspection(id.value); uni.showToast({ title: '删除成功', icon: 'success' }); setTimeout(() => uni.navigateBack(), 500) }
				catch (cause) { uni.showToast({ title: cause instanceof Error ? cause.message : '删除失败', icon: 'none' }) }
				finally { deleting.value = false }
			}
		})
	}
	onLoad(options => { id.value = String(options?.id || ''); if (!id.value) { state.value = 'error'; error.value = '缺少巡检记录 ID' } })
	onShow(load)
	onUnload(releasePhotos)
</script>

<style scoped>
.photo-required-hint{margin-top:18rpx;padding:18rpx;border-radius:16rpx;background:#fff4e6;color:#a56528;font-size:23rpx;line-height:1.6}
	.detail-page {
		padding-top: 24rpx
	}

	.record-hero {
		position: relative;
		overflow: hidden;
		padding: 30rpx;
		border-radius: 28rpx;
		color: #fff;
		background: linear-gradient(135deg, #087f72, #12a18e);
		box-shadow: 0 16rpx 38rpx rgba(8, 127, 114, .2)
	}

	.hero-decoration {
		position: absolute;
		right: -70rpx;
		top: -90rpx;
		width: 250rpx;
		height: 250rpx;
		border: 42rpx solid rgba(255, 255, 255, .08);
		border-radius: 50%
	}

	.record-number,
	.hero-main,
	.hero-meta {
		position: relative;
		z-index: 1
	}

	.record-number {
		font-size: 18rpx;
		letter-spacing: 1rpx;
		color: rgba(255, 255, 255, .72)
	}

	.hero-main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 18rpx;
		margin-top: 14rpx
	}

	.hero-title {
		min-width: 0;
		font-size: 39rpx;
		font-weight: 900;
		line-height: 1.25;
		overflow-wrap: anywhere
	}

	.result-badge {
		flex: none;
		padding: 8rpx 16rpx;
		border-radius: 999rpx;
		font-size: 20rpx;
		font-weight: 750
	}

	.result-badge.normal {
		color: #087f72;
		background: #dff7ef
	}

	.result-badge.abnormal {
		color: #bd541b;
		background: #fff0df
	}

	.result-badge.unknown {
		color: #5f706d;
		background: #edf3f2
	}

	.hero-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14rpx;
		margin-top: 26rpx
	}

	.type-chip {
		padding: 8rpx 14rpx;
		border: 1rpx solid rgba(255, 255, 255, .25);
		border-radius: 999rpx;
		background: rgba(255, 255, 255, .12);
		font-size: 19rpx
	}

	.hero-time {
		min-width: 0;
		text-align: right;
		color: rgba(255, 255, 255, .82);
		font-size: 19rpx;
		overflow-wrap: anywhere
	}

	.hero-time text {
		margin-right: 6rpx
	}

	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin: 30rpx 2rpx 16rpx
	}

	.section-heading .section-title {
		margin: 0;
		font-size: 31rpx
	}

	.section-note {
		margin-top: 5rpx;
		color: #879692;
		font-size: 19rpx
	}

	.info-card {
		padding: 5rpx 24rpx;
		border: 1rpx solid rgba(8, 127, 114, .07);
		border-radius: 25rpx;
		background: #fff;
		box-shadow: 0 12rpx 32rpx rgba(25, 78, 70, .07)
	}

	.info-row {
		display: grid;
		grid-template-columns: 48rpx 118rpx minmax(0, 1fr);
		align-items: center;
		gap: 13rpx;
		padding: 22rpx 0;
		border-bottom: 1rpx solid #e9f0ee
	}

	.info-row:last-child {
		border-bottom: 0
	}

	.info-icon {
		width: 44rpx;
		height: 44rpx;
		display: grid;
		place-items: center;
		border-radius: 13rpx;
		color: #087f72;
		background: #e7f6f3;
		font-size: 17rpx;
		font-weight: 800
	}

	.info-label {
		color: #748681;
		font-size: 22rpx
	}

	.info-value {
		text-align: right;
		color: #153c37;
		font-size: 24rpx;
		font-weight: 650;
		line-height: 1.5;
		overflow-wrap: anywhere
	}

	.photo-heading {
		align-items: center
	}

	.photo-count {
		padding: 7rpx 13rpx;
		border-radius: 999rpx;
		color: #087f72;
		background: #e5f5f1;
		font-size: 19rpx
	}

	.photo-card {
		padding: 16rpx;
		border-radius: 24rpx;
		background: #fff;
		box-shadow: 0 12rpx 30rpx rgba(25, 78, 70, .07)
	}

	.photos {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12rpx
	}

	.photos.single {
		grid-template-columns: minmax(0, 280rpx)
	}

	.photo-item,
	.photos image,
	.photo-failed {
		position: relative;
		width: 100%;
		height: 180rpx;
		border-radius: 16rpx;
		overflow: hidden
	}

	.photos.single .photo-item,
	.photos.single image,
	.photos.single .photo-failed {
		height: 230rpx
	}

	.photo-failed {
		display: grid;
		place-items: center;
		text-align: center;
		color: #84928f;
		background: #e8efee;
		font-size: 18rpx
	}

	.photo-failed text {
		display: block;
		margin-bottom: 5rpx;
		color: #b56b26;
		font-size: 28rpx
	}

	.photo-index {
		position: absolute;
		right: 7rpx;
		bottom: 7rpx;
		padding: 4rpx 8rpx;
		border-radius: 8rpx;
		color: #fff;
		background: rgba(5, 42, 37, .65);
		font-size: 16rpx
	}

	.photo-warning {
		margin: 13rpx 5rpx 3rpx;
		color: #b36c18;
		font-size: 20rpx
	}

	.empty-photo {
		padding: 45rpx;
		text-align: center;
		border: 2rpx dashed #cadeda;
		border-radius: 23rpx;
		color: #82938f;
		background: #f8fbfa;
		font-size: 21rpx
	}

	.empty-photo-icon {
		font-size: 43rpx;
		margin-bottom: 8rpx;
		color: #62a99f
	}

	.action-panel {
		display: grid;
		grid-template-columns: 1.25fr 1fr;
		gap: 12rpx;
		margin-top: 32rpx;
		padding: 12rpx;
		border-radius: 24rpx;
		background: #fff;
		box-shadow: 0 12rpx 32rpx rgba(25, 78, 70, .08)
	}

	.action-panel button {
		height: 62rpx;
		line-height: 62rpx;
		margin: 0;
		border-radius: 17rpx;
		font-size: 23rpx;
		font-weight: 750
	}
/* .action-panel {
  grid-template-columns: 1.25fr 1fr;
  gap: 12rpx;
  padding: 12rpx;
}

.action-panel button {
  height: 72rpx;
  line-height: 72rpx;
  font-size: 23rpx;
} */

	.action-panel button::after {
		border: 0
	}

	.action-panel button text {
		margin-right: 7rpx
	}

	.edit-button {
		color: #fff;
		background: linear-gradient(135deg, #0a9584, #08756c)
	}

	.delete-button {
		color: #c84b4b;
		background: #fff1f1
	}

	.permission-note {
		text-align: center;
		margin: 16rpx 0 8rpx;
		color: #91a09d;
		font-size: 18rpx
	}
</style>
