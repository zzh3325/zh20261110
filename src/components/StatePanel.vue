<template>
  <view v-if="state === 'loading'" class="card skeleton" />
  <view v-else-if="state === 'error'" class="card empty-state">
    <view class="empty-icon">⌁</view>
    <view class="strong">数据加载失败</view>
    <view class="muted message">{{ message || '请检查网络后重试' }}</view>
    <button class="retry" @click="$emit('retry')">重新加载</button>
  </view>
  <view v-else-if="state === 'empty'" class="card empty-state">
    <view class="empty-icon">◎</view>
    <view class="strong">暂无数据</view>
    <view class="muted message">{{ message || '当前没有符合条件的记录' }}</view>
  </view>
</template>

<script setup lang="ts">
import type { LoadState } from '@/types/domain'
defineProps<{ state: LoadState; message?: string }>()
defineEmits<{ retry: [] }>()
</script>

<style scoped>
.message { margin: 12rpx 0 22rpx; font-size: 24rpx; }
.retry { width: 220rpx; height: 70rpx; line-height: 70rpx; border: 0; border-radius: 16rpx; color: #087f72; background: #e8f6f3; font-size: 26rpx; }
.retry::after { border: 0; }
</style>
