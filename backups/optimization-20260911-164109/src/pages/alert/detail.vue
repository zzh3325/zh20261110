<template>
  <view class="page">
    <StatePanel :state="state" @retry="load" />
    <template v-if="state==='success'">
      <view class="alert-hero" :class="`level-${item.level}`"><view class="eyebrow">{{ levelText(item.level) }}预警</view><view class="title">{{ item.title }}</view><view class="time">{{ item.alertTime }}</view></view>
      <view class="card details"><view class="detail row between"><text class="muted">监测设备</text><text>{{ item.deviceName || '--' }}</text></view><view class="detail row between"><text class="muted">监测位置</text><text>{{ item.location || '--' }}</text></view><view class="detail row between"><text class="muted">监测指标</text><text>{{ item.metricName || '--' }}</text></view><view class="detail row between"><text class="muted">当前值</text><text class="danger">{{ item.value ?? '--' }}</text></view><view class="detail row between"><text class="muted">告警阈值</text><text>{{ item.threshold ?? '--' }}</text></view></view>
      <view class="section-title">告警说明</view><view class="card description">{{ item.content || '暂无详细说明' }}</view>
      <view v-if="canHandle" class="handle card"><view class="strong">处理意见</view><textarea v-model="remark" placeholder="请输入现场核查或处理情况" maxlength="300" /><button class="btn-primary" :loading="submitting" @click="submitHandle">确认处理</button></view>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed,reactive,ref } from 'vue';import { onLoad } from '@dcloudio/uni-app';import StatePanel from '@/components/StatePanel.vue';import { useAuthStore } from '@/stores/auth';import { getAlert,handleAlert } from '@/api/alerts';import { demoAlerts } from '@/data/demo';import type { AlertItem,LoadState } from '@/types/domain'
const auth=useAuthStore(),state=ref<LoadState>('loading'),id=ref(''),remark=ref(''),submitting=ref(false),item=reactive<AlertItem>({id:'',title:''});const canHandle=computed(()=>!['RESOLVED','CLOSED','已处理'].includes(String(item.status)))
async function load(){state.value='loading';try{Object.assign(item,auth.demoMode?demoAlerts.find(a=>String(a.id)===id.value)||demoAlerts[0]:await getAlert(id.value));state.value='success'}catch{state.value='error'}}
function levelText(v:unknown){return ({1:'Ⅰ级',2:'Ⅱ级',3:'Ⅲ级',4:'Ⅳ级'} as Record<string,string>)[String(v)]||''}
async function submitHandle(){if(!remark.value.trim()){uni.showToast({title:'请填写处理意见',icon:'none'});return}if(auth.demoMode){item.status='RESOLVED';uni.showToast({title:'演示处理完成',icon:'success'});return}submitting.value=true;try{await handleAlert(id.value,{remark:remark.value,status:'RESOLVED'});uni.showToast({title:'处理成功',icon:'success'});setTimeout(()=>uni.navigateBack(),400)}finally{submitting.value=false}}
onLoad(o=>{id.value=String(o?.id||'');load()})
</script>
<style scoped>.alert-hero{padding:36rpx;border-radius:25rpx;color:#fff;background:linear-gradient(135deg,#d17b20,#e8a545);margin-bottom:22rpx}.alert-hero.level-1{background:linear-gradient(135deg,#a93636,#d95a55)}.eyebrow{font-size:22rpx;opacity:.8}.title{font-size:40rpx;font-weight:900;margin:14rpx 0}.time{font-size:21rpx;opacity:.75}.details{padding-top:10rpx;padding-bottom:10rpx}.detail{padding:22rpx 0;border-bottom:1rpx solid #edf2f1;font-size:25rpx}.detail:last-child{border:0}.danger{color:#cf4b42;font-weight:800}.description{line-height:1.8;font-size:26rpx}.handle{margin-top:24rpx}.handle textarea{width:100%;height:180rpx;margin:20rpx 0;padding:20rpx;border-radius:16rpx;background:#f3f7f6;font-size:25rpx}</style>
