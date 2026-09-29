<template>
  <view class="header safe-top">
    <view>
      <view class="eyebrow">DAQIAO RESERVOIR</view>
      <view class="title">{{ title }}</view>
      <view v-if="subtitle" class="subtitle">{{ subtitle }}</view>
    </view>
    <view v-if="$slots.default" class="action"><slot /></view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<style scoped lang="scss">
.header {
  min-height: 230rpx;
  padding: 30rpx 32rpx 38rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  color: #fff;
  background:
    radial-gradient(circle at 86% 0, rgba(89, 213, 190, .42), transparent 38%),
    linear-gradient(145deg, #07564f 0%, #078779 58%, #12a590 100%);
}
.eyebrow { font-size: 20rpx; letter-spacing: 4rpx; opacity: .72; margin-bottom: 10rpx; }
.title { font-size: 44rpx; line-height: 1.2; font-weight: 800; }
.subtitle { font-size: 24rpx; margin-top: 10rpx; opacity: .82; }
.action { align-self: flex-end; }
</style>
