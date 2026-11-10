<template>
  <view class="page scan-page">
    <view class="card scan-card">
      <view class="scan-symbol">⌗</view><view class="scan-title">巡检点位核验</view>
      <view class="scan-note">扫描现场点位二维码后，由系统确认本次巡检点位</view>
      <view v-if="expected" class="expected">应巡检：{{ expected.name }}（{{ expected.code }}）</view>
      <view v-else class="scan-note">临时巡检：本次记录将关联当前扫码点位</view>
      <view v-if="busy" class="scan-note">正在核验点位，请稍候…</view>
      <view v-else-if="error" class="error-box">{{ error }}</view>
      <template v-else-if="verified">
        <view class="success-label">✓ 点位核验通过</view>
        <view class="point-name">{{ verified.point.name }}</view>
        <view class="scan-note">{{ verified.point.code }} · {{ verified.point.area || '区域未填写' }}</view>
        <view class="scan-note">{{ verified.point.location || '位置说明未填写' }}</view>
        <view class="preset-coordinates">
          <view>点位预设坐标</view>
          <view>纬度 {{ verified.point.latitude }}° · 经度 {{ verified.point.longitude }}°</view>
          <view>WGS84（系统默认）</view>
          <view>由 PC 管理端配置，非手机实时定位，不进行距离判定。</view>
        </view>
        <view class="scan-note">核验时间：{{ formatTime(verified.checkInTime) }}</view>
        <button class="btn-primary confirm" @click="confirm">确认点位，填写巡检</button>
      </template>
      <button v-if="error && code" class="btn-primary confirm" @click="verify">重新核验</button>
      <button class="btn-ghost confirm" @click="back">返回巡检记录</button>
    </view>
    <view class="scan-note instruction">点位不匹配时，请扫描应巡检点位的二维码。若从其他浏览器打开链接而没有应巡检点位，本次将按临时巡检处理。</view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { verifyInspectionPoint, pointError, type PointVerification, type InspectionPoint } from '@/api/inspection-points'
import { getExpectedPoint, keepScanReturn, clearScanReturn, acceptVerification } from '@/utils/inspection-check-in'
const code = ref(''), busy = ref(false), error = ref(''), verified = ref<PointVerification>(), expected = ref<InspectionPoint>()
const auth = useAuthStore()
async function verify() {
  if (busy.value) return
  verified.value = undefined; error.value = ''; busy.value = true
  try {
    if (!code.value || code.value.length > 2048) throw new Error('二维码链接无效，请扫描现场完整二维码')
    verified.value = await verifyInspectionPoint(code.value, expected.value?.id)
    clearScanReturn()
  } catch (e) { error.value = pointError(e) } finally { busy.value = false }
}
function confirm() {
  if (!verified.value) return
  if (Date.parse(verified.value.expiresAt) <= Date.now()) { error.value = '核验已过期，请重新核验'; verified.value = undefined; return }
  acceptVerification(verified.value)
  uni.redirectTo({ url: '/pages/inspection/execute' })
}
function back() { clearScanReturn(); uni.switchTab({ url: '/pages/inspection/index' }) }
function formatTime(value: string) { return value.replace('T', ' ').replace(/\.\d+Z?$/, '') }
onLoad(options => {
  code.value = String(options?.code || '')
  try { keepScanReturn(code.value) } catch (e) { error.value = pointError(e); return }
  if (!auth.isAuthenticated) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  expected.value = getExpectedPoint()
  void verify()
})
</script>
<style scoped>
.preset-coordinates{margin-top:22rpx;padding:20rpx;border-radius:18rpx;background:#eef7f4;text-align:left;font-size:24rpx;line-height:1.8;color:#315b50}.preset-coordinates view:first-child{font-weight:750}.preset-coordinates view:last-child{margin-top:8rpx;color:#71847d;font-size:21rpx}
.scan-page{padding-top:30rpx}.scan-card{text-align:center;padding:42rpx 28rpx}.scan-symbol{margin:auto;width:100rpx;height:100rpx;border-radius:28rpx;line-height:100rpx;background:#e5f5f1;color:#087f72;font-size:64rpx}.scan-title{font-size:36rpx;font-weight:800;margin-top:24rpx}.scan-note{font-size:24rpx;color:#6c817b;line-height:1.7;margin-top:14rpx;overflow-wrap:anywhere}.expected{margin:24rpx 0;padding:18rpx;background:#eef6f4;border-radius:16rpx;font-size:25rpx}.error-box{margin:26rpx 0;padding:24rpx;color:#a23b2c;background:#fff0eb;border-radius:18rpx;line-height:1.7;font-size:26rpx}.success-label{margin-top:30rpx;color:#087f72;font-weight:700}.point-name{font-size:36rpx;font-weight:800;margin-top:20rpx}.confirm{margin-top:24rpx}.instruction{padding:0 12rpx}
</style>
