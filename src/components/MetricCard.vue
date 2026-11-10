<template>
  <view class="metric" :class="[tone,{inline,'long-value':String(value).length>6}]">
    <view class="metric-top"><view class="icon">{{ icon }}</view><view class="value">{{ value }}</view></view>
    <view class="label">{{ label }}</view>
    <view v-if="caption" class="caption">{{ caption }}</view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: string | number; caption?: string; icon?: string; tone?: string; inline?: boolean }>(), {
  icon: '●', tone: 'green', inline: false
})
</script>

<style scoped lang="scss">
.metric { position: relative; min-width: 0; padding: 24rpx; overflow: hidden; border: 1rpx solid rgba(8,127,114,.07); border-radius: 22rpx; background: #fff; box-shadow: 0 10rpx 28rpx rgba(24,70,64,.06); }
.metric-top { min-width: 0; }
.icon { width: 54rpx; height: 54rpx; border-radius: 16rpx; display: grid; place-items: center; font-size: 24rpx; margin-bottom: 22rpx; background: #e4f5f1; color: #078779; }
.value { font-size: 38rpx; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.inline { min-height: 188rpx; display: flex; flex-direction: column; padding: 22rpx 22rpx 20rpx; background: linear-gradient(145deg,#fff 58%,#f0faf7); }
.inline::after { content: ''; position: absolute; left: 22rpx; right: 22rpx; bottom: 0; height: 5rpx; border-radius: 8rpx 8rpx 0 0; background: #34b6a2; opacity: .7; }
.inline .metric-top { min-height: 56rpx; display: flex; align-items: center; justify-content: space-between; gap: 14rpx; }
.inline .icon { flex: none; margin-bottom: 0; }
.inline .value { flex: 1; min-width: 0; text-align: right; color: #0b3531; font-size: 36rpx; font-weight: 900; letter-spacing: -.5rpx; }
.inline.long-value .value { font-size: 30rpx; }
.inline .label { margin-top: 17rpx; color: #264a45; font-size: 24rpx; font-weight: 750; }
.inline .caption { min-height: 42rpx; margin-top: 5rpx; line-height: 1.4; font-size: 18rpx; }
.label { font-size: 24rpx; color: #60716e; margin-top: 5rpx; }
.caption { font-size: 20rpx; color: #94a3a1; margin-top: 8rpx; }
.orange .icon { color: #cf7414; background: #fff1dc; }
.orange.inline { background: linear-gradient(145deg,#fff 58%,#fff9f0); }
.orange.inline::after { background: #efaa52; }
.red .icon { color: #c84c4c; background: #ffeaea; }
.red.inline::after { background: #df7474; }
.blue .icon { color: #2672bd; background: #e8f2ff; }
.blue.inline { background: linear-gradient(145deg,#fff 58%,#f3f7ff); }
.blue.inline::after { background: #6da4e5; }
</style>
