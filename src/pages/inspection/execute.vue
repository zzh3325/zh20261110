<template>
	<view class="page execute-page">
		<view class="card inspection-form">
			<view class="form-heading">
				<view class="form-heading-icon">巡</view>
				<view class="grow">
					<view class="form-title">巡检信息</view>
					<view class="form-caption">请填写本次现场巡检的基础信息</view>
				</view>
				<view class="required-badge">必填</view>
			</view>
			<view class="form-fields">
				<view class="form-field">
					<view class="field-label">巡检项目 <text>*</text></view>
					<view class="input-shell"><text class="field-index">01</text><input v-model.trim="inspectionItem"
							placeholder="请输入巡检项目名称" :disabled="formLocked" @input="saveDraft" /></view>
				</view>
				<view class="form-field">
					<view class="field-label">检查部位 <text>*</text></view>
					<view class="input-shell"><text class="field-index">02</text><input v-model.trim="checkPosition"
							placeholder="默认带入点位位置，可补充具体检查部位" :disabled="formLocked" @input="saveDraft" /></view>
				</view>
				<view class="form-field">
					<view class="field-label">巡检类型 <text>*</text></view>
					<view class="input-shell"><text class="field-index">03</text><input v-model.trim="inspectionType"
							placeholder="请输入巡检类型" :disabled="formLocked" @input="saveDraft" /></view>
				</view>
				<view class="form-field">
          <view class="field-label">巡检时间（北京时间） <text>*</text></view>
          <view class="inspection-time-fields">
            <picker mode="date" :value="inspectionDate" :disabled="formLocked" @change="changeInspectionDate"><view class="picker-field"><text>{{ inspectionDate || '选择日期' }}</text><text class="picker-arrow">⌄</text></view></picker>
            <picker mode="time" :value="inspectionClock" :disabled="formLocked" @change="changeInspectionClock"><view class="picker-field"><text>{{ inspectionClock || '选择时间' }}</text><text class="picker-arrow">⌄</text></view></picker>
          </view>
          <view class="inspection-time-note"><view class="location-tip">{{ taskId ? '编辑保留原记录时间。' : inspectionTimeUserEdited ? '已手动指定巡检时间。' : '自动使用当前北京时间。' }}扫码核验时间保持不变。</view><button v-if="!taskId" class="current-time-button" :disabled="formLocked" @click="useCurrentInspectionTime">使用当前时间</button></view>
				</view>
				<view class="form-field">
          <view class="field-label">巡检人员</view><view class="input-shell inspector-value">{{ inspector || '未提供' }}</view>
				</view>
			</view>
		</view>
    <view class="check-card card">
      <view class="strong">巡检点位核验</view>
      <view v-if="loading" class="location-tip">正在加载巡检信息…</view>
      <view v-else-if="loadError" class="location-error">{{ loadError }}</view>
      <template v-else-if="taskId">
        <view class="verified-point">{{ existingPointName || checkPosition || '历史巡检记录' }}</view>
        <view class="location-tip">{{ existingMethod === 'QR_CODE' ? '二维码打卡记录，点位核验信息不可修改' : '历史记录，保留原位置和坐标信息' }}</view>
        <view v-if="coordinate" class="location-tip">{{ existingCoordinateSource === 'POINT_PRESET' ? '点位预设坐标（纬度,经度）' : '历史坐标（纬度,经度）' }}：{{ coordinate }}</view>
        <view v-if="existingCoordinateSystem" class="location-tip">坐标系：{{ coordinateSystemLabel(existingCoordinateSystem) }}</view>
        <view v-if="existingCheckInTime" class="location-tip">核验时间：{{ existingCheckInTime.replace('T', ' ') }}</view>
      </template>
      <template v-else-if="verified">
        <view class="verification-success">✓ 点位核验通过</view>
        <view class="verified-point">{{ verified.point.name }}</view>
        <view class="location-tip">{{ verified.point.code }} · {{ verified.point.area }}</view>
        <view class="location-tip">点位预设纬度：{{ verified.point.latitude }}°</view>
        <view class="location-tip">点位预设经度：{{ verified.point.longitude }}°</view>
        <view class="location-tip">坐标：WGS84（系统默认）</view>
        <view class="location-tip">坐标由 PC 管理端配置，非手机实时定位，不进行距离判定。</view>
        <view class="location-tip">{{ expected ? `应巡检点位：${expected.name}` : '临时巡检：已关联当前扫码点位' }}</view>
        <view class="location-tip">核验时间：{{ verified.checkInTime.replace('T', ' ') }}</view>
      </template>
      <template v-else>
        <view class="location-tip">请扫描现场点位二维码，核验通过后才能提交巡检。也可用微信或手机扫码工具直接打开二维码链接。</view>
        <button class="btn-primary scan-point-button" :loading="scanning" :disabled="scanning || formLocked" @click="scanPoint">{{ scanning ? '正在识别核验…' : '扫码核验' }}</button>
        
        <view v-if="scanError" class="location-error">{{ scanError }}</view>
        <view class="field-label point-select-label">应巡检点位（可选）</view>
        <picker :range="pointLabels" :value="pointIndex" :disabled="scanning || pointLoading || Boolean(pointLoadError)" @change="chooseExpected">
          <view class="picker-field"><text class="picker-value">{{ expected ? `${expected.name} · ${expected.code}` : '临时巡检（扫码确定点位）' }}</text><text class="picker-arrow">⌄</text></view>
        </picker>
        <view v-if="pointLoading" class="location-tip">正在加载固定点位…</view>
        <view v-if="pointLoadError" class="location-error">{{ pointLoadError }}<button class="btn-ghost" @click="loadPoints">重新加载</button></view>
        <view class="location-tip">选择后请在同一浏览器中打开扫码链接，系统会比对应巡检点位。不指定点位则按临时巡检处理。</view>
      </template>
    </view>
		<view class="section-title">巡检结论</view>
		<view class="result-options">
			<view :class="{active:draft.result==='NORMAL'}" @click="setResult('NORMAL')"><text>✓</text>
				<view>
					<view class="strong">正常</view>
					<view class="muted">未发现异常</view>
				</view>
			</view>
			<view class="abnormal" :class="{active:draft.result==='ABNORMAL'}" @click="setResult('ABNORMAL')">
				<text>!</text>
				<view>
					<view class="strong">异常</view>
					<view class="muted">发现安全隐患</view>
				</view>
			</view>
		</view>
    <view v-if="savedRecordId && !submitted" class="card upload-recovery">
      <view class="strong">记录 #{{ savedRecordId }} 已保存</view>
      <view class="location-tip">{{ draft.photos.length ? `剩余 ${draft.photos.length} 张照片待上传，重试只补传剩余照片。` : '请点击核对照片，确认上传成功后完成巡检。' }}</view>
      <view v-if="photoUploadError" class="location-error">{{ photoUploadError }}</view>
      <button class="btn-ghost" :disabled="submitting" @click="leaveSavedRecord">返回巡检记录</button>
    </view>
		<view class="section-title">现场照片 <text class="photo-required">必传 · 至少 1 张</text></view>
		<view class="photo-grid">
			<view v-for="(photo,index) in existingPhotos" :key="photo.path" class="photo">
				<image v-if="photo.url" :src="photo.url" mode="aspectFill" @click="previewPhoto(photo.url)" />
				<view v-else class="photo-unavailable">加载失败</view>
				<view class="photo-tag">已上传</view>
				<view class="remove" @click="removeExistingPhoto(index)">×</view>
			</view>
      <view v-for="photo in uploadedLocalPhotos" :key="'uploaded-'+photo" class="photo"><image :src="photo" mode="aspectFill" @click="previewPhoto(photo)" /><view class="photo-tag">已上传</view></view>
			<view v-for="(photo,index) in draft.photos" :key="photo" class="photo">
				<image :src="photo" mode="aspectFill" @click="previewPhoto(photo)" />
				<view class="photo-tag local">待上传</view>
				<view class="remove" @click="removePhoto(index)">×</view>
			</view>
			<view v-if="photoCount<6" class="add-photo" @click="choosePhoto">
				<view>＋</view><text>现场拍照</text>
			</view>
		</view>
		<view class="muted photo-note">请现场拍摄巡检设施及周边环境，至少 1 张、最多 6 张。照片成功上传并关联记录后才能完成巡检。</view>
		<view class="section-title">巡检说明</view>
		<view class="card textarea-card"><textarea v-model="draft.remark" maxlength="500"
				placeholder="请记录设备状况、异常现象和处理建议" :disabled="formLocked" @input="saveDraft" />
			<view class="muted word-count">{{ draft.remark.length }}/500</view>
		</view>
		<view class="actions"><button class="btn-ghost" :disabled="formLocked" @click="saveOnly">保存草稿</button><button class="btn-primary"
				:loading="submitting" :disabled="locked || !canSubmit" @click="submit">{{ submitButtonText }}</button></view>
	</view>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useInspectionDraftStore, type InspectionDraft } from '@/stores/inspectionDraft'
import { saveInspection, updateInspection, getInspection, hasInspectionPhotos, InspectionPhotoUploadError } from '@/api/inspection'
import { getInspectionPoints, verifyInspectionPoint, pointError, type InspectionPoint, type PointVerification } from '@/api/inspection-points'
import { inspectionCodeFromQr, readInspectionQrImage } from '@/utils/inspection-qr-image'
import { getExpectedPoint, setExpectedPoint, takeVerification, keepScanReturn, clearScanReturn } from '@/utils/inspection-check-in'
import { loadInspectionPhoto, releaseInspectionPhoto, uploadInspectionPhotos } from '@/utils/photos'
import { inspectionTimeParts, inspectionTimeValue } from '@/utils/inspection-time'
import { pointPresetCoordinates, coordinateSystemLabel } from '@/utils/inspection-coordinates'

const auth = useAuthStore(), draftStore = useInspectionDraftStore()
const taskId = ref(''), submitting = ref(false), submitted = ref(false), loading = ref(true), loadError = ref('')
const inspectionItem = ref(''), checkPosition = ref(''), inspectionType = ref('日常巡检')
const coordinate = ref(''), inspectionTime = ref(new Date().toISOString()), draftKey = ref('')
const inspectionTimeUserEdited = ref(false)
const inspector = ref(auth.displayName)
const savedRecordId = ref(''), photoUploadError = ref(''), uploadedLocalPhotos = ref<string[]>([])
const submissionBlocked = ref(false)
const inspectionDate = computed(() => inspectionTimeParts(inspectionTime.value).date)
const inspectionClock = computed(() => inspectionTimeParts(inspectionTime.value).time)
const draft = reactive<InspectionDraft>({ taskId: '', result: '', remark: '', photos: [] })
const existingPhotos = ref<Array<{ path: string; url: string }>>([])
const points = ref<InspectionPoint[]>([]), expected = ref<InspectionPoint>(), verified = ref<PointVerification>()
const pointLoading = ref(false), pointLoadError = ref('')
const scanning = ref(false), scanError = ref('')
const existingPointId = ref(''), existingPointName = ref(''), existingMethod = ref(''), existingCheckInTime = ref('')
const existingCoordinateSystem = ref(''), existingCoordinateSource = ref('')
const photoCount = computed(() => existingPhotos.value.length + uploadedLocalPhotos.value.length + draft.photos.length)
const locked = computed(() => submitting.value || submitted.value || scanning.value || submissionBlocked.value)
const formLocked = computed(() => locked.value || Boolean(savedRecordId.value))
const canSubmit = computed(() => !loading.value && !loadError.value && (Boolean(savedRecordId.value) || Boolean(taskId.value) || Boolean(verified.value)))
const submitButtonText = computed(() => submissionBlocked.value ? '待核对记录' : submitted.value ? '已提交' : submitting.value ? '提交中…' : savedRecordId.value ? (draft.photos.length ? '重试上传照片' : '核对照片并完成') : '提交巡检')
const pointLabels = computed(() => ['临时巡检（扫码确定点位）', ...points.value.map(p => `${p.name} · ${p.code}`)])
const pointIndex = computed(() => Math.max(0, points.value.findIndex(p => p.id === expected.value?.id) + 1))
let redirectTimer: ReturnType<typeof setTimeout> | undefined
let liveTimeTimer: ReturnType<typeof setInterval> | undefined
function syncCurrentInspectionTime() {
  if (!taskId.value && !inspectionTimeUserEdited.value && !savedRecordId.value && !submitted.value && !submitting.value) inspectionTime.value = new Date().toISOString()
}
function stopLiveTime() { if (liveTimeTimer !== undefined) { clearInterval(liveTimeTimer); liveTimeTimer = undefined } }
function startLiveTime() {
  stopLiveTime(); syncCurrentInspectionTime()
  if (!taskId.value && !inspectionTimeUserEdited.value) liveTimeTimer = setInterval(syncCurrentInspectionTime, 1000)
}
function useCurrentInspectionTime() {
  if (formLocked.value || taskId.value) return
  inspectionTimeUserEdited.value = false; startLiveTime(); saveDraft()
}

function saveDraft() {
  if (formLocked.value || loading.value) return
  draftStore.save({ ...draft, taskId: draftKey.value, inspectionItem: inspectionItem.value, checkPosition: checkPosition.value, inspectionType: inspectionType.value, inspectionTime: inspectionTime.value, inspectionTimeUserEdited: inspectionTimeUserEdited.value })
}
function setResult(value: 'NORMAL' | 'ABNORMAL') { if (!formLocked.value) { draft.result = value; saveDraft() } }
function pickerValue(event: Event): string { return String((event as Event & { detail?: { value?: string } }).detail?.value || '') }
function changeInspectionDate(event: Event) {
  if (formLocked.value) return
  try { inspectionTime.value = inspectionTimeValue(pickerValue(event), inspectionClock.value || inspectionTimeParts(new Date().toISOString()).time); inspectionTimeUserEdited.value = true; stopLiveTime(); saveDraft() }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '日期无效', icon: 'none' }) }
}
function changeInspectionClock(event: Event) {
  if (formLocked.value) return
  try { inspectionTime.value = inspectionTimeValue(inspectionDate.value || inspectionTimeParts(new Date().toISOString()).date, pickerValue(event)); inspectionTimeUserEdited.value = true; stopLiveTime(); saveDraft() }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '时间无效', icon: 'none' }) }
}
async function loadPoints() {
  if (pointLoading.value) return
  pointLoading.value = true; pointLoadError.value = ''
  try { points.value = (await getInspectionPoints()).filter(point => point.enabled) }
  catch (error) { pointLoadError.value = `巡检点位列表加载失败：${pointError(error)}` } finally { pointLoading.value = false }
}
function chooseExpected(event: { detail: { value: number | string } }) {
  if (locked.value || verified.value) return
  expected.value = points.value[Number(event.detail.value) - 1]
  setExpectedPoint(expected.value)
}
async function verifyScannedQr(text: string) {
  const code = inspectionCodeFromQr(text)
  keepScanReturn(code)
  let result: PointVerification
  try { result = await verifyInspectionPoint(code, expected.value?.id) }
  catch (error) { if (uni.getStorageSync('auth-token')) clearScanReturn(); throw error }
  clearScanReturn()
  const preset = pointPresetCoordinates(result.point)
  const confirmed = await new Promise<boolean>(resolve => {
    uni.showModal({ title: '点位核验通过', content: `${result.point.name}（${result.point.code}）\n${result.point.location}\n预设纬度 ${preset.latitude}°，经度 ${preset.longitude}°\n确认使用此点位继续巡检？`, confirmText: '确认点位', cancelText: '取消', success: r => resolve(r.confirm), fail: () => resolve(false) })
  })
  if (!confirmed) return
  if (Date.parse(result.expiresAt) <= Date.now()) throw new Error('核验凭证已过期，请重新扫描点位二维码')
  verified.value = result; coordinate.value = preset.coordinate
  if (!inspectionItem.value.trim()) inspectionItem.value = `${result.point.name}巡检`
  if (!checkPosition.value.trim()) checkPosition.value = result.point.location || result.point.name
  draftKey.value = `qr:${result.point.id}`; draft.taskId = draftKey.value
}
function scanPoint() {
  if (formLocked.value || loading.value || taskId.value) return
  saveDraft(); scanError.value = ''; scanning.value = true
    uni.chooseImage({ count: 1, sourceType: ['camera'], success: async result => {
      try {
        const path = result.tempFilePaths[0]
        if (!path) throw new Error('请现场拍摄清晰的点位二维码')
        await verifyScannedQr(await readInspectionQrImage(path))
      } catch (error) { scanError.value = pointError(error) }
      finally { scanning.value = false; if (verified.value) saveDraft() }
    }, fail: error => { scanning.value = false; if (!String(error.errMsg).toLowerCase().includes('cancel')) scanError.value = '无法打开相机，请检查拍照权限后重试' } })
}
function choosePhoto() {
  if (locked.value) return
  if (photoCount.value >= 6) { uni.showToast({ title: '最多选择6张照片', icon: 'none' }); return }
    uni.chooseImage({ count: 1, sourceType: ['camera'], success: r => {
      if (locked.value) return
      draft.photos.push(...r.tempFilePaths.slice(0, 6 - photoCount.value)); saveDraft()
    }, fail: error => { if (!String(error.errMsg).toLowerCase().includes('cancel')) uni.showToast({ title: '无法打开相机，请检查拍照权限', icon: 'none' }) } })
}
function removePhoto(index: number) { if (!locked.value) { draft.photos.splice(index, 1); saveDraft() } }
function removeExistingPhoto(index: number) { if (!formLocked.value) { const [photo] = existingPhotos.value.splice(index, 1); if (photo?.url) releaseInspectionPhoto(photo.url) } }
function previewPhoto(url: string) { if (url) uni.previewImage({ urls: [...existingPhotos.value.map(p => p.url).filter(Boolean), ...uploadedLocalPhotos.value, ...draft.photos], current: url }) }
function saveOnly() { if (!formLocked.value && !loading.value) { saveDraft(); uni.showToast({ title: '草稿已保存', icon: 'success' }) } }
function returnToRecords() { uni.switchTab({ url: '/pages/inspection/index', fail: () => uni.reLaunch({ url: '/pages/inspection/index' }) }) }
function clearSavedDraft() { try { draftStore.remove(draftKey.value) } catch { /* 不因草稿清理失败重试新增。 */ } }
function recordSaved(id: string | number) { savedRecordId.value = String(id); clearSavedDraft() }
function photoUploaded(path: string) {
  const index = draft.photos.indexOf(path)
  if (index >= 0) draft.photos.splice(index, 1)
  if (!uploadedLocalPhotos.value.includes(path)) uploadedLocalPhotos.value.push(path)
}
async function finishSubmission() {
  if (draft.photos.length) throw new Error('还有照片未成功上传，暂不能完成巡检')
  if (!savedRecordId.value) throw new Error('缺少已保存记录 ID，无法确认照片')
  const record = await getInspection(savedRecordId.value)
  if (!hasInspectionPhotos(record.photoPaths)) throw new Error('服务器尚未关联现场照片，请补拍上传后再完成巡检')
  submitted.value = true; photoUploadError.value = ''; clearSavedDraft()
  if (!taskId.value) { try { setExpectedPoint() } catch { /* 清理偏好失败不影响成功跳转。 */ } }
  uni.showToast({ title: '提交成功', icon: 'success', duration: 1000 })
  redirectTimer = setTimeout(returnToRecords, 800)
}
function leaveSavedRecord() {
  if (locked.value) return
  if (!draft.photos.length && (uploadedLocalPhotos.value.length || existingPhotos.value.length)) { returnToRecords(); return }
  uni.showModal({ title: '还有照片未上传', content: '记录已保存。返回后可在该记录详情中编辑并重新选择照片补传，是否返回？', success: result => { if (result.confirm) returnToRecords() } })
}
async function submit() {
  if (locked.value || !canSubmit.value) return
  syncCurrentInspectionTime()
  if (photoCount.value < 1) { uni.showToast({ title: '请先现场拍照，至少上传 1 张照片才能完成巡检', icon: 'none' }); return }
  if (savedRecordId.value) {
    submitting.value = true; photoUploadError.value = ''
    try { await uploadInspectionPhotos(savedRecordId.value, [...draft.photos], photoUploaded); await finishSubmission() }
    catch (error) { photoUploadError.value = error instanceof Error ? error.message : '照片上传失败，请重试' }
    finally { submitting.value = false }
    return
  }
  if (!inspectionItem.value.trim() || !checkPosition.value.trim() || !inspectionType.value.trim()) { uni.showToast({ title: '请完整填写巡检信息', icon: 'none' }); return }
  if (!inspectionTimeParts(inspectionTime.value).date) { uni.showToast({ title: '请选择有效的巡检日期和时间', icon: 'none' }); return }
  if (!taskId.value && (!verified.value || Date.parse(verified.value.expiresAt) <= Date.now())) {
    verified.value = undefined; uni.showToast({ title: '点位核验已过期，请重新扫描现场二维码', icon: 'none' }); return
  }
  if (!draft.result) { uni.showToast({ title: '请选择巡检结论', icon: 'none' }); return }
  if (draft.result === 'ABNORMAL' && !draft.remark.trim()) { uni.showToast({ title: '异常巡检必须填写说明', icon: 'none' }); return }
  submitting.value = true
  try {
    const preset = taskId.value ? undefined : pointPresetCoordinates(verified.value!.point)
    await (taskId.value ? updateInspection : saveInspection)({
      id: taskId.value, ...draft, coordinate: coordinate.value, inspectionTime: inspectionTime.value,
      inspectionItem: inspectionItem.value, checkPosition: checkPosition.value, inspectionType: inspectionType.value,
      inspector: inspector.value, photoPaths: existingPhotos.value.map(p => p.path), attachmentLocalPaths: [...draft.photos],
      ...(!taskId.value ? {
        pointId: verified.value!.point.id, expectedPointId: verified.value!.expectedPointId, checkInMethod: 'QR_CODE',
        checkInProof: verified.value!.checkInProof, checkInTime: verified.value!.checkInTime,
        pointLatitude: preset!.latitude, pointLongitude: preset!.longitude,
        coordinateSystem: preset!.coordinateSystem, coordinateSource: preset!.coordinateSource
      } : {})
    }, { onRecordSaved: recordSaved, onPhotoUploaded: photoUploaded })
    await finishSubmission()
  } catch (error) {
    if (savedRecordId.value) {
      photoUploadError.value = error instanceof Error ? error.message : '照片尚未确认，暂不能完成巡检'
      uni.showToast({ title: '记录已保存，照片未确认完成', icon: 'none' })
    } else if (error instanceof InspectionPhotoUploadError) {
      submissionBlocked.value = true; clearSavedDraft(); uni.showModal({ title: '记录已保存，请到列表确认', content: error.message, showCancel: false, complete: returnToRecords })
    } else { uni.showModal({ title: '提交未完成', content: error instanceof Error ? error.message : '提交失败，草稿已保留', showCancel: false }) }
  } finally { submitting.value = false }
}
async function loadExistingPhotos(paths: string[]) {
  let failed = false
  for (const path of paths) {
    const photo = { path, url: '' }; existingPhotos.value.push(photo)
    try { photo.url = await loadInspectionPhoto(taskId.value, path) } catch { failed = true }
  }
  if (failed) uni.showToast({ title: '部分历史照片加载失败', icon: 'none' })
}
function draftResult(value: unknown): InspectionDraft['result'] {
  const text = String(value ?? '').toUpperCase()
  return text === '异常' || text === 'ABNORMAL' ? 'ABNORMAL' : text === '正常' || text === 'NORMAL' ? 'NORMAL' : ''
}
onLoad(async options => {
  taskId.value = String(options?.id || '')
  verified.value = taskId.value ? undefined : takeVerification()
  expected.value = getExpectedPoint()
  draftKey.value = taskId.value || (verified.value ? `qr:${verified.value.point.id}` : '')
  uni.setNavigationBarTitle({ title: taskId.value ? '编辑巡检记录' : '新增巡检记录' })
  try {
    const savedDraft = draftStore.get(draftKey.value)
    Object.assign(draft, savedDraft); draft.photos = [...savedDraft.photos]; draft.taskId = draftKey.value
    inspectionItem.value = savedDraft.inspectionItem || ''; inspectionType.value = savedDraft.inspectionType || '日常巡检'
    if (!taskId.value) {
      inspectionTimeUserEdited.value = savedDraft.inspectionTimeUserEdited === true && Boolean(inspectionTimeParts(savedDraft.inspectionTime || '').date)
      inspectionTime.value = inspectionTimeUserEdited.value ? savedDraft.inspectionTime! : new Date().toISOString()
    }
    if (taskId.value) {
      const item = await getInspection(taskId.value)
      inspectionItem.value = savedDraft.inspectionItem || item.title || ''; checkPosition.value = item.location || ''
      inspectionType.value = savedDraft.inspectionType || String(item.inspectionType || '日常巡检')
      coordinate.value = String(item.coordinate || ''); inspectionTime.value = String(item.inspectionTime || item.time || '')
      inspector.value = String(item.inspector || item.assigneeName || '')
      existingCoordinateSystem.value = String(item.coordinateSystem || (item.coordinateSource === 'POINT_PRESET' ? 'WGS84' : '')); existingCoordinateSource.value = String(item.coordinateSource || '')
      existingPointId.value = String(item.pointId || ''); existingPointName.value = String(item.pointName || '')
      existingMethod.value = String(item.checkInMethod || ''); existingCheckInTime.value = String(item.checkInTime || '')
      if (!draft.result) draft.result = draftResult(item.result)
      if (!draft.remark) draft.remark = String(item.issueDescription || item.remark || '')
      await loadExistingPhotos(Array.isArray(item.photoPaths) ? item.photoPaths : [])
    } else if (verified.value) {
      const p = verified.value.point
      if (expected.value && expected.value.id !== p.id) throw new Error('点位不匹配，请重新扫描应巡检点位二维码')
      checkPosition.value = savedDraft.checkPosition || p.location || p.name
      if (!inspectionItem.value) inspectionItem.value = `${p.name}巡检`
      coordinate.value = pointPresetCoordinates(p).coordinate
    } else { void loadPoints() }
  } catch (error) { loadError.value = error instanceof Error ? error.message : '巡检信息加载失败' }
  finally { loading.value = false }
})
onShow(startLiveTime)
onHide(stopLiveTime)
onUnload(() => {
  stopLiveTime()
  if (redirectTimer !== undefined) clearTimeout(redirectTimer)
  existingPhotos.value.forEach(p => p.url && releaseInspectionPhoto(p.url))
})
</script>
<style scoped>
.photo-required{margin-left:10rpx;font-size:21rpx;color:#c55d2f;font-weight:500}
.inspection-time-note{display:flex;flex-wrap:wrap;align-items:center;gap:10rpx;margin-top:10rpx}.inspection-time-note .location-tip{flex:1;min-width:230rpx}.current-time-button{margin:0;padding:0 14rpx;height:50rpx;line-height:50rpx;font-size:20rpx;color:#087f72;background:#e4f3ef;border-radius:12rpx}.current-time-button::after{border:0}
.scan-point-button{margin-top:20rpx;font-size:28rpx}
.inspection-time-fields{display:grid;grid-template-columns:1.4fr 1fr;gap:12rpx}.inspection-time-fields picker{min-width:0}.inspection-time-fields .picker-field{justify-content:space-between;font-size:24rpx;padding-left:14rpx}.inspector-value{color:#657c76;font-size:25rpx}.upload-recovery{margin-top:22rpx;border:2rpx solid #e6c992;background:#fffbf2}.upload-recovery button{margin-top:18rpx}
.verification-success{margin-top:20rpx;color:#087f72;font-size:27rpx;font-weight:750}.verified-point{margin-top:16rpx;font-size:31rpx;font-weight:800}.point-select-label{margin-top:22rpx!important}.check-card .location-tip{margin-top:14rpx}.btn-primary[disabled]{opacity:.55}
	.execute-page {
		padding-top: 22rpx
	}

	.inspection-form {
		padding: 28rpx 26rpx 25rpx;
		border: 2rpx solid #e1eeeb;
		box-shadow: 0 12rpx 34rpx rgba(26, 88, 79, .08)
	}

	.form-heading {
		display: flex;
		align-items: center;
		gap: 17rpx;
		padding-bottom: 23rpx;
		border-bottom: 1rpx solid #e8f0ee
	}

	.form-heading-icon {
		flex: none;
		width: 62rpx;
		height: 62rpx;
		display: grid;
		place-items: center;
		border-radius: 18rpx;
		color: #fff;
		background: linear-gradient(145deg, #12a18e, #087f72);
		font-size: 25rpx;
		font-weight: 800;
		box-shadow: 0 8rpx 18rpx rgba(8, 127, 114, .2)
	}

	.form-title {
		font-size: 30rpx;
		font-weight: 850;
		color: #073d38
	}

	.form-caption {
		margin-top: 4rpx;
		color: #7a8987;
		font-size: 20rpx
	}

	.required-badge {
		flex: none;
		padding: 6rpx 12rpx;
		border-radius: 20rpx;
		color: #bd5a35;
		background: #fff0e9;
		font-size: 18rpx
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		padding-top: 24rpx
	}

	.field-label {
		margin: 0 0 9rpx 4rpx;
		color: #304d49;
		font-size: 22rpx;
		font-weight: 700
	}

	.field-label text {
		color: #d45a42
	}

	.input-shell {
		height: 82rpx;
		display: flex;
		align-items: center;
		padding: 0 18rpx;
		border: 2rpx solid #dceae7;
		border-radius: 17rpx;
		background: #f5faf9;
		transition: border-color .2s, background-color .2s, box-shadow .2s
	}

	.input-shell:focus-within {
		border-color: #25a796;
		background: #fff;
		box-shadow: 0 0 0 6rpx rgba(37, 167, 150, .08)
	}

	.field-index {
		flex: none;
		width: 48rpx;
		color: #84aaa4;
		font-size: 19rpx;
		font-weight: 800;
		letter-spacing: 1rpx
	}

	.input-shell input {
		flex: 1;
		height: 100%;
		color: #123c37;
		font-size: 25rpx
	}

	.check-card {
		margin-top: 18rpx;
		border: 2rpx solid #d8ebe7
	}

	.location-modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8rpx;
		margin-top: 22rpx;
		padding: 7rpx;
		border-radius: 16rpx;
		background: #e9f1ef
	}

	.location-modes view {
		padding: 15rpx;
		text-align: center;
		border-radius: 12rpx;
		color: #687875;
		font-size: 23rpx
	}

	.location-modes .active {
		color: #087f72;
		background: #fff;
		font-weight: 750;
		box-shadow: 0 4rpx 12rpx rgba(20, 92, 82, .08)
	}

	.location-panel {
		padding-top: 20rpx
	}

	.location-text {
		font-size: 22rpx
	}

	.location-tip,
	.location-error {
		font-size: 20rpx;
		line-height: 1.55
	}

	.location-tip {
		color: #71807e
	}

	.location-tip.compact {
		margin-top: 8rpx
	}

	.location-error {
		margin-top: 18rpx;
		padding-top: 16rpx;
		border-top: 1rpx solid #e4efed;
		color: #b35c18
	}

	.locate {
		flex: none;
		width: 82rpx;
		height: 82rpx;
		display: grid;
		place-items: center;
		border-radius: 50%;
		font-size: 34rpx;
		color: #087f72;
		background: #e7f6f3
	}

	.locate.checked {
		color: #fff;
		background: #087f72
	}

	.locate.loading {
		opacity: .65
	}

	.manual-location {
		padding-top: 20rpx
	}

	.manual-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14rpx
	}

	.manual-fields>view {
		padding: 15rpx 18rpx;
		border: 1rpx solid #d9e8e5;
		border-radius: 15rpx;
		background: #f4f9f8
	}

	.manual-fields text {
		display: block;
		color: #71807e;
		font-size: 19rpx
	}

	.manual-fields input {
		height: 54rpx;
		margin-top: 3rpx;
		font-size: 24rpx
	}

	.manual-confirm {
		height: 72rpx;
		line-height: 72rpx;
		margin-top: 14rpx;
		border-radius: 14rpx;
		color: #fff;
		background: #087f72;
		font-size: 24rpx
	}

	.manual-confirm::after {
		border: 0
	}

	.result-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16rpx
	}

	.result-options>view {
		display: flex;
		align-items: center;
		gap: 18rpx;
		padding: 24rpx;
		border: 2rpx solid transparent;
		border-radius: 22rpx;
		background: #fff
	}

	.result-options>view>text {
		width: 54rpx;
		height: 54rpx;
		display: grid;
		place-items: center;
		border-radius: 16rpx;
		color: #087f72;
		background: #e7f6f3
	}

	.result-options .active {
		border-color: #087f72;
		background: #f1fbf8
	}

	.result-options .abnormal>text {
		color: #c56d16;
		background: #fff0dc
	}

	.result-options .abnormal.active {
		border-color: #d17a21;
		background: #fffaf3
	}

	.result-options .muted {
		font-size: 20rpx;
		margin-top: 5rpx
	}

	.photo-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14rpx
	}

	.photo,
	.add-photo {
		position: relative;
		height: 190rpx;
		border-radius: 18rpx;
		overflow: hidden
	}

	.photo image {
		width: 100%;
		height: 100%
	}

	.photo-unavailable {
		height: 100%;
		display: grid;
		place-items: center;
		color: #84928f;
		background: #eaf0ef;
		font-size: 20rpx
	}

	.photo-tag {
		position: absolute;
		left: 7rpx;
		bottom: 7rpx;
		padding: 5rpx 9rpx;
		border-radius: 8rpx;
		color: #fff;
		background: #087f72d9;
		font-size: 17rpx
	}

	.photo-tag.local {
		background: #b36c18df
	}

	.remove {
		position: absolute;
		right: 8rpx;
		top: 8rpx;
		width: 38rpx;
		height: 38rpx;
		line-height: 35rpx;
		text-align: center;
		border-radius: 50%;
		color: #fff;
		background: rgba(0, 0, 0, .55)
	}

	.add-photo {
		display: grid;
		place-content: center;
		text-align: center;
		color: #71807e;
		border: 2rpx dashed #b8cfca;
		background: #f8fbfa
	}

	.add-photo view {
		font-size: 50rpx;
		line-height: 1
	}

	.add-photo text {
		font-size: 20rpx;
		margin-top: 8rpx
	}

	.photo-note {
		font-size: 20rpx;
		margin-top: 12rpx
	}

	.textarea-card textarea {
		width: 100%;
		height: 220rpx;
		font-size: 25rpx
	}

	.word-count {
		text-align: right;
		font-size: 20rpx
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr 1.6fr;
		gap: 16rpx;
		margin-top: 30rpx;
		padding-bottom: 25rpx
	}
</style>
