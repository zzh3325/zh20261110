<template>
  <view class="page">
    <StatePanel :state="state" @retry="load" />
    <template v-if="state === 'success'">
      <view class="cover card">
        <view class="cover-pattern">大桥水库</view>
        <view class="pill">{{ reservoir.level || '水库工程' }}</view>
        <view class="title">{{ reservoir.name }}</view>
        <view class="muted">{{ reservoir.address || '地址信息待完善' }}</view>
      </view>
      <view class="section-title">基本信息</view>
      <view class="card detail-list">
        <view v-for="item in fields" :key="item.label" class="detail-row row between">
          <text class="muted">{{ item.label }}</text><text class="strong">{{ item.value }}</text>
        </view>
      </view>
      <view class="section-title contact-title">运行管理</view>
      <view class="card">
        <view class="strong">{{ reservoir.manager || '运行管理中心' }}</view>
        <view class="muted contact">责任单位与责任人信息以后端数据为准</view>
        <button v-if="reservoir.latitude && reservoir.longitude" class="btn-ghost" @click="openMap">导航至水库</button>
      </view>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import { useAuthStore } from '@/stores/auth'
import { getReservoir } from '@/api/reservoir'
import { demoReservoir } from '@/data/demo'
import type { LoadState, Reservoir } from '@/types/domain'

const auth = useAuthStore(), state = ref<LoadState>('loading')
const reservoir = reactive<Reservoir>({ id: 1, name: '' })
const fields = computed(() => [
  { label: '水库类型', value: reservoir.level || '--' },
  { label: '总库容', value: reservoir.totalCapacity ? `${reservoir.totalCapacity} 万m³` : '--' },
  { label: '正常蓄水位', value: reservoir.normalWaterLevel ? `${reservoir.normalWaterLevel} m` : '--' },
  { label: '汛限水位', value: reservoir.floodLimitWaterLevel ? `${reservoir.floodLimitWaterLevel} m` : '--' },
  { label: '经度', value: reservoir.longitude || '--' },
  { label: '纬度', value: reservoir.latitude || '--' }
])
async function load() { state.value='loading'; try { Object.assign(reservoir, auth.demoMode ? demoReservoir : await getReservoir(import.meta.env.VITE_RESERVOIR_ID || 1)); state.value='success' } catch { state.value='error' } }
function openMap(){ uni.openLocation({ latitude:Number(reservoir.latitude), longitude:Number(reservoir.longitude), name:reservoir.name, address:reservoir.address || '', scale:14 }) }
onLoad(load)
</script>
<style scoped>
.cover { position: relative; overflow: hidden; padding: 42rpx 30rpx; background: linear-gradient(135deg,#e1f4f0,#fff); }.cover-pattern { position:absolute; right:-10rpx; top:10rpx; font-size:80rpx; font-weight:900; color:rgba(8,127,114,.05); transform:rotate(-8deg); }.title{font-size:44rpx;font-weight:800;margin:20rpx 0 10rpx}.section-title{margin:32rpx 4rpx 18rpx}.detail-row{padding:22rpx 0;border-bottom:1rpx solid #edf2f1;font-size:26rpx}.detail-row:last-child{border:0}.contact-title{margin-top:34rpx}.contact{font-size:23rpx;margin:10rpx 0 24rpx}
</style>
