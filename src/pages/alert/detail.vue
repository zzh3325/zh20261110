<template>
  <view class="page">
    <StatePanel :state="state" @retry="load" />
    <template v-if="state==='success'">
      <view class="alert-hero" :class="`level-${levelKey(item.level)}`"><view class="eyebrow">{{ levelText(item.level) }}</view><view class="title">{{ item.title }}</view><view class="time">{{ formatTime(item.alertTime) }}</view></view>
      <view class="card details"><view class="detail row between"><text class="muted">监测设备</text><text>{{ item.deviceName || '--' }}</text></view><view class="detail row between"><text class="muted">监测位置</text><text>{{ item.location || '--' }}</text></view><view class="detail row between"><text class="muted">监测指标</text><text>{{ item.metricName || '--' }}</text></view><view class="detail row between"><text class="muted">当前值</text><text class="danger">{{ displayValue(item.value,item.unit) }}</text></view><view class="detail row between"><text class="muted">{{ compareText(item.compareOp) }}阈值</text><text>{{ displayValue(item.threshold,item.unit) }}</text></view><view class="detail row between"><text class="muted">处理状态</text><text>{{ item.status||'待处理' }}</text></view></view>
      <view class="section-title">告警说明</view><view class="card description">{{ item.content || '暂无详细说明' }}</view>
      <view v-if="canHandle" class="handle card"><view class="strong">确认已完成现场处理</view><view class="muted">提交后将告警标记为已处理。</view><button class="btn-primary" :loading="submitting" @click="submitHandle">确认处理</button></view>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed,reactive,ref } from 'vue';import { onLoad } from '@dcloudio/uni-app';import StatePanel from '@/components/StatePanel.vue';import { getAlert,handleAlert } from '@/api/alerts';import type { AlertItem,LoadState } from '@/types/domain'
const state=ref<LoadState>('loading'),id=ref(''),submitting=ref(false),item=reactive<AlertItem>({id:'',title:''});const canHandle=computed(()=>!['RESOLVED','CLOSED','已处理'].includes(String(item.status)))
async function load(){state.value='loading';try{Object.assign(item,await getAlert(id.value));state.value='success'}catch{state.value='error'}}
function levelText(v:unknown){return ({1:'Ⅰ级',2:'Ⅱ级',3:'Ⅲ级',4:'Ⅳ级'} as Record<string,string>)[String(v)]||String(v||'等级未提供')}
function levelKey(v:unknown){const value=String(v||'');if(value==='1'||value.includes('紧急'))return 'urgent';if(value==='2'||value.includes('中度'))return 'moderate';if(value==='3'||value.includes('一般'))return 'general';return 'tip'}
function displayValue(value:unknown,unit:unknown){if(value===null||value===undefined||String(value).trim()==='')return '--';const numeric=Number(value);const shown=Number.isFinite(numeric)?numeric.toLocaleString('zh-CN',{maximumFractionDigits:3}):String(value);return shown+(unit?' '+String(unit):'')}
function compareText(v:unknown){return ({GT:'大于',GTE:'大于等于',LT:'小于',LTE:'小于等于',EQ:'等于',RANGE:'区间',ABS_GT:'绝对值大于'} as Record<string,string>)[String(v||'').toUpperCase()]||'告警'}
function formatTime(v:unknown){const value=String(v||'');return value?value.replace('T',' ').replace(/(\.\d{3})\d+/, '$1'):'时间未提供'}
async function submitHandle(){if(submitting.value)return;submitting.value=true;try{await handleAlert(id.value);uni.showToast({title:'处理成功',icon:'success'});setTimeout(()=>uni.navigateBack(),400)}catch(e){uni.showToast({title:e instanceof Error?e.message:'处理失败',icon:'none'})}finally{submitting.value=false}}
onLoad(o=>{id.value=String(o?.id||'');load()})
</script>
<style scoped>.alert-hero{padding:36rpx;border-radius:25rpx;color:#fff;background:linear-gradient(135deg,#467ba7,#63a0ca);margin-bottom:22rpx}.alert-hero.level-urgent{background:linear-gradient(135deg,#a93636,#d95a55)}.alert-hero.level-moderate{background:linear-gradient(135deg,#c36a1d,#e59a3a)}.alert-hero.level-general{background:linear-gradient(135deg,#ae801a,#d8af3c)}.eyebrow{font-size:22rpx;opacity:.88}.title{font-size:38rpx;font-weight:900;line-height:1.35;margin:14rpx 0}.time{font-size:21rpx;opacity:.8}.details{padding-top:10rpx;padding-bottom:10rpx}.detail{padding:22rpx 0;border-bottom:1rpx solid #edf2f1;font-size:25rpx;gap:24rpx}.detail>text:first-child{flex:none}.detail>text:last-child{text-align:right;overflow-wrap:anywhere}.detail:last-child{border:0}.danger{color:#cf4b42;font-weight:800}.description{line-height:1.8;font-size:24rpx;overflow-wrap:anywhere}.handle{margin-top:24rpx}.handle textarea{width:100%;height:180rpx;margin:20rpx 0;padding:20rpx;border-radius:16rpx;background:#f3f7f6;font-size:25rpx}</style>
