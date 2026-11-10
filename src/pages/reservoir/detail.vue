<template>
  <view class="page">
    <StatePanel :state="state" :message="errorMessage" @retry="load" />
    <template v-if="state === 'success'">
      <view class="cover card">
        <view class="cover-pattern">{{ reservoir.reservoirName }}</view>
        <view class="pill">{{ display(reservoir.projectScale) }}</view>
        <view class="title">{{ display(reservoir.reservoirName) }}</view>
        <view class="muted">{{ display(reservoir.latitudeLongitude) }}</view>
      </view>
      <template v-for="section in sections" :key="section.title">
        <view class="section-title">{{ section.title }}</view>
        <view class="card detail-list">
          <view v-for="field in section.fields" :key="field.key" class="detail-row">
            <text class="muted">{{ field.label }}</text>
            <text class="strong">{{ display(reservoir[field.key], field.unit) }}</text>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import { getReservoirDetail } from '@/api/reservoir'
import type { LoadState } from '@/types/domain'

const state = ref<LoadState>('loading')
const errorMessage = ref('')
const reservoir = ref<Record<string, unknown>>({})
const reservoirId = ref('')
let loading = false
type Field = { key: string; label: string; unit?: string }
const sections: {title: string; fields: Field[]}[] = [
  { title: '基本信息', fields: [
    {key:'reservoirCode',label:'水库编码'}, {key:'reservoirLevel',label:'水库等级'},
    {key:'aliasName',label:'水库别名'}, {key:'projectScale',label:'工程规模'},
    {key:'projectStatus',label:'工程状态'}, {key:'projectGrade',label:'工程等别'},
    {key:'mainStructureGrade',label:'主要建筑物级别'}, {key:'latitudeLongitude',label:'位置 / 经纬度'},
    {key:'basinArea',label:'所属流域'}, {key:'basinCode',label:'流域编码'},
    {key:'reservoirOverview',label:'水库概况'}
  ]},
  { title: '特征参数', fields: [
    {key:'totalCapacity',label:'总库容',unit:'m³'}, {key:'floodControlCapacity',label:'调洪库容',unit:'m³'},
    {key:'normalStorageLevel',label:'正常蓄水位',unit:'m'},
    {key:'deadWaterLevel',label:'死水位',unit:'m'},
    {key:'mainFloodLimitLevel',label:'主汛期限制水位',unit:'m'},
    {key:'floodControlLevel',label:'防洪水位',unit:'m'},
    {key:'designFloodLevel',label:'设计洪水位',unit:'m'},
    {key:'checkFloodLevel',label:'校核洪水位',unit:'m'},
    {key:'controlledBasinArea',label:'控制流域面积'},
    {key:'controlledChannelLength',label:'防洪库容',unit:'m³'},
    {key:'averageAnnualRainfall',label:'兴利库容',unit:'m³'},
    {key:'averageAnnualRunoff',label:'死库容',unit:'m³'},
    {key:'designPeakDischarge',label:'设计洪峰流量'},
    {key:'designDailyPeakFlow',label:'设计日洪峰流量'},
    {key:'checkPeakDischarge',label:'校核洪峰流量'},
    {key:'checkTotalFloodVolume',label:'校核洪水总量'}
  ]},
  { title: '大坝信息', fields: [
    {key:'damName',label:'大坝名称'}, {key:'damId',label:'大坝编码'},
    {key:'isMainDam',label:'是否主坝'}, {key:'damType',label:'坝型'},
    {key:'seepageBodyType',label:'防渗体类型'},
    {key:'seepageBodyThickness',label:'防渗体厚度'},
    {key:'damTopElevation',label:'坝顶高程'},
    {key:'damTopLength',label:'坝顶长度'}, {key:'damTopWidth',label:'坝顶宽度'},
    {key:'maxDamHeight',label:'最大坝高'},
    {key:'foundationGeologicalCondition',label:'坝基地质条件'},
    {key:'permeabilityCoefficient',label:'渗透系数'}
  ]},
  { title: '运行管理', fields: [
    {key:'managementUnit',label:'管理单位'}, {key:'responsibilityYear',label:'责任年度'},
    {key:'responsiblePersonName',label:'责任人'}, {key:'responsiblePersonPosition',label:'责任人职务'},
    {key:'responsiblePersonPhone',label:'责任人电话'}, {key:'responsibilitySystem',label:'责任制度'},
    {key:'superiorResponsiblePersonName',label:'上级责任人'},
    {key:'superiorResponsiblePersonPosition',label:'上级责任人职务'},
    {key:'superiorResponsiblePersonPhone',label:'上级责任人电话'}
  ]}
]

function display(value: unknown, unit = '') {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return '--'
  return unit ? `${value} ${unit}` : String(value)
}

async function load() {
  if (loading) return
  loading = true
  state.value = 'loading'
  errorMessage.value = ''
  reservoir.value = {}
  try {
    if (!/^\d+$/.test(reservoirId.value)) throw new Error('缺少有效的水库 ID')
    reservoir.value = await getReservoirDetail(reservoirId.value)
    state.value = 'success'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '水库信息加载失败'
    state.value = 'error'
  } finally { loading = false }
}
onLoad(options => {
  reservoirId.value = String(options?.id || import.meta.env.VITE_RESERVOIR_ID || '1')
  load()
})
</script>

<style scoped>
.cover{position:relative;overflow:hidden;padding:42rpx 30rpx;background:linear-gradient(135deg,#e1f4f0,#fff)}
.cover-pattern{position:absolute;right:-10rpx;top:10rpx;font-size:80rpx;font-weight:900;color:rgba(8,127,114,.05);transform:rotate(-8deg);pointer-events:none}
.title{font-size:44rpx;font-weight:800;margin:20rpx 0 10rpx}
.section-title{margin:32rpx 4rpx 18rpx}
.detail-row{display:flex;justify-content:space-between;gap:24rpx;padding:22rpx 0;border-bottom:1rpx solid #edf2f1;font-size:26rpx;align-items:flex-start}
.detail-row:last-child{border:0}
.detail-row .muted{flex:0 0 38%}
.detail-row .strong{text-align:right;overflow-wrap:anywhere;white-space:pre-wrap;min-width:0}
</style>
