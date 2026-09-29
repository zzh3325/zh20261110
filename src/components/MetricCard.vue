<template>
  <view class="metric" :class="tone">
    <view class="icon">{{ icon }}</view>
    <view class="value">{{ value }}</view>
    <view class="label">{{ label }}</view>
    <view v-if="caption" class="caption">{{ caption }}</view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: string | number; caption?: string; icon?: string; tone?: string }>(), {
  icon: '●', tone: 'green'
})
</script>

<style scoped lang="scss">
.metric { min-width: 0; padding: 24rpx; border-radius: 22rpx; background: #fff; box-shadow: 0 10rpx 28rpx rgba(24,70,64,.06); }
.icon { width: 54rpx; height: 54rpx; border-radius: 16rpx; display: grid; place-items: center; font-size: 24rpx; margin-bottom: 22rpx; background: #e4f5f1; color: #078779; }
.value { font-size: 38rpx; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.label { font-size: 24rpx; color: #60716e; margin-top: 5rpx; }
.caption { font-size: 20rpx; color: #94a3a1; margin-top: 8rpx; }
.orange .icon { color: #cf7414; background: #fff1dc; }
.red .icon { color: #c84c4c; background: #ffeaea; }
.blue .icon { color: #2672bd; background: #e8f2ff; }
</style>
