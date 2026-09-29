<template>
  <view class="chart-wrap">
    <view class="chart-head row between">
      <view>
        <view class="strong">{{ title }}</view>
        <view class="muted unit">{{ unit ? `单位：${unit}` : '' }}</view>
      </view>
      <view class="pill">{{ points.length }} 条</view>
    </view>
    <view class="chart">
      <view class="grid-line" v-for="i in 4" :key="i" :style="{ top: `${i * 20}%` }" />
      <view class="bars">
        <view v-for="(point, index) in points" :key="index" class="bar-column">
          <view v-if="point.value !== null" class="bar" :style="{ height: `${height(point.value)}%` }" />
          <view class="x-label">{{ point.time }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Measurement } from '@/types/domain'
const props = defineProps<{ title: string; unit?: string; points: Measurement[] }>()
const values = computed(() => props.points.filter(item => item.value !== null).map(item => Number(item.value)).filter(Number.isFinite))
const min = computed(() => Math.min(...values.value, 0))
const max = computed(() => Math.max(...values.value, 1))
function height(value: number | null) { return 18 + ((Number(value) - min.value) / Math.max(max.value - min.value, .001)) * 72 }
</script>

<style scoped>
.chart-wrap { background: #fff; border-radius: 24rpx; padding: 26rpx; }
.unit { font-size: 21rpx; margin-top: 6rpx; }
.chart { height: 310rpx; margin-top: 24rpx; position: relative; overflow: hidden; }
.grid-line { position: absolute; left: 0; right: 0; border-top: 1rpx dashed #dfe9e7; }
.bars { position: absolute; inset: 0; display: flex; gap: 10rpx; align-items: flex-end; }
.bar-column { height: 100%; flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.bar { width: 70%; min-height: 10rpx; border-radius: 10rpx 10rpx 3rpx 3rpx; background: linear-gradient(180deg, #32bea6, #087f72); box-shadow: 0 4rpx 12rpx rgba(8,127,114,.2); }
.x-label { height: 36rpx; margin-top: 8rpx; font-size: 17rpx; color: #82918f; transform: scale(.9); white-space: nowrap; }
</style>
