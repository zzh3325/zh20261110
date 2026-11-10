<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { keepScanReturn } from '@/utils/inspection-check-in'

onLaunch((options) => {
  let scanCode = options?.path === 'pages/inspection/check-in' ? String(options.query?.code || '') : ''
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location.hash.split('?')[0] === '#/pages/inspection/check-in') scanCode = new URLSearchParams(window.location.hash.split('?')[1] || '').get('code') || ''
  // #endif
  if (scanCode) { try { keepScanReturn(scanCode) } catch { /* 非法扫码参数由核验页提示。 */ } }
  const auth = useAuthStore()
  auth.restore()
  if (!auth.isAuthenticated) {
    uni.reLaunch({ url: '/pages/login/index' })
  }
})
</script>

<style lang="scss">
page {
  min-height: 100%;
  background: #f3f7f6;
  color: #16322f;
}

.picker-field {
  box-sizing: border-box;
  min-height: 84rpx;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 0 18rpx 0 22rpx;
  color: #173d39;
  background: linear-gradient(135deg, #f8fcfb, #edf7f4);
  border: 2rpx solid #d8e9e5;
  border-radius: 18rpx;
  box-shadow: inset 0 1rpx 0 rgba(255,255,255,.9), 0 5rpx 14rpx rgba(18,83,74,.06);
  transition: border-color .16s ease, background .16s ease, transform .16s ease;
}
.picker-field:active {
  color: #075e56;
  background: #e7f5f1;
  border-color: #0b9584;
  transform: translateY(1rpx);
}
.picker-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 25rpx;
  line-height: 1.35;
}
.picker-arrow {
  flex: none;
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #087f72;
  background: #dff2ee;
  border-radius: 50%;
  font-size: 24rpx;
  font-weight: 800;
  line-height: 1;
}
.picker-field.compact {
  min-height: 78rpx;
  gap: 8rpx;
  padding: 0 10rpx 0 16rpx;
}
.picker-field.compact .picker-value { font-size: 22rpx; }
.picker-field.compact .picker-arrow { width: 34rpx; height: 34rpx; font-size: 20rpx; }
</style>
