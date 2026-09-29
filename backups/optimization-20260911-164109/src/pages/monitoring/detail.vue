<template>
  <view class="page">
    <StatePanel :state="state" @retry="load" />
    <template v-if="state==='success'">
      <view class="current card"><view class="row between"><view><view class="muted">当前监测值</view><view><text class="value">{{ point.latestValue ?? latestValue }}</text><text class="unit">{{ point.unit || measurements[0]?.unit }}</text></view></view><view class="pill">数据正常</view></view><view class="muted update">更新时间：{{ point.lastTime || '--' }}</view></view>
      <view class="section"><TrendChart title="监测趋势" :points="measurements" :unit="point.unit" /></view>
      <view class="card"><view class="detail-row row between"><text class="muted">测点名称</text><text>{{ point.name }}</text></view><view class="detail-row row between"><text class="muted">测点编码</text><text>{{ point.code || '--' }}</text></view><view class="detail-row row between"><text class="muted">监测类型</text><text>{{ point.type || '--' }}</text></view><view class="detail-row row between"><text class="muted">安装位置</text><text>{{ point.location || '--' }}</text></view></view>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue';import TrendChart from '@/components/TrendChart.vue'
import { useAuthStore } from '@/stores/auth';import { monitoringApi } from '@/api/monitoring';import { demoMeasurements, demoPoints } from '@/data/demo';import { listOf } from '@/utils/normalize'
import type { LoadState, Measurement, MonitorPoint } from '@/types/domain'
const auth=useAuthStore(),state=ref<LoadState>('loading'),id=ref(''),point=reactive<MonitorPoint>({id:'',name:''}),measurements=ref<Measurement[]>([])
const latestValue=computed(()=>measurements.value.length ? measurements.value[measurements.value.length - 1].value : '--')
async function load(){state.value='loading';try{if(auth.demoMode){Object.assign(point,demoPoints.find(p=>String(p.id)===id.value)||demoPoints[1]);measurements.value=demoMeasurements}else{const [p,d]=await Promise.all([monitoringApi.sensorPoint(id.value),monitoringApi.sensorData(id.value,{page:1,size:30})]);Object.assign(point,p);measurements.value=listOf<Measurement>(d)}state.value='success'}catch{state.value='error'}}
onLoad((o)=>{id.value=String(o?.id||'1');point.name=decodeURIComponent(String(o?.name||''));load()})
</script>
<style scoped>.current{padding:34rpx}.value{font-size:68rpx;font-weight:900;color:#075e56}.unit{margin-left:10rpx;color:#70817e}.update{font-size:22rpx;margin-top:22rpx}.detail-row{padding:23rpx 0;border-bottom:1rpx solid #edf2f1;font-size:25rpx}.detail-row:last-child{border:0}</style>
