<template>
  <view class="page video-page">
    <view class="section-subtitle intro">现场摄像头、实时直播和录像回放</view>
    <StatePanel :state="state" :message="errorMessage" @retry="load" />
    <view v-if="state==='success'" class="video-list">
      <view v-for="stream in streams" :key="stream.id" class="video-card card">
        <view class="preview" @click="play(stream)">
          <view class="camera-grid" /><view class="play-btn">▶</view>
          <view class="live-badge"><text /> LIVE</view>
        </view>
        <view class="video-info row between"><view><view class="strong">{{ stream.name || `视频通道 ${stream.id}` }}</view><view class="muted meta">{{ stream.status || '状态未知' }}</view></view><view class="link" @click="play(stream)">播放 ›</view></view>
      </view>
    </view>
    <view v-if="playingUrl" class="player-modal" @click.self="closePlayer">
      <view class="player-box"><view class="row between player-head"><view class="strong">实时视频</view><view @click="closePlayer">✕</view></view><video :src="playingUrl" controls autoplay class="player" /><view class="player-tip">播放能力取决于后端返回格式与浏览器协议支持</view></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue';import { onLoad } from '@dcloudio/uni-app';import StatePanel from '@/components/StatePanel.vue';import { useAuthStore } from '@/stores/auth';import { getLive,getStreams,type Stream } from '@/api/video';import { listOf } from '@/utils/normalize';import type { LoadState } from '@/types/domain'
const auth=useAuthStore(),state=ref<LoadState>('loading'),errorMessage=ref(''),streams=ref<Stream[]>([]),playingUrl=ref('')
async function load(){state.value='loading';try{streams.value=auth.demoMode?[{id:1,name:'主坝全景摄像机',status:'在线'},{id:2,name:'进水塔摄像机',status:'在线'},{id:3,name:'右岸边坡摄像机',status:'离线'}]:listOf<Stream>(await getStreams());state.value=streams.value.length?'success':'empty'}catch(e){errorMessage.value=e instanceof Error?e.message:'视频列表加载失败';state.value='error'}}
async function play(stream:Stream){if(auth.demoMode){uni.showToast({title:'演示模式不连接视频流',icon:'none'});return}try{const result=await getLive(stream.id);playingUrl.value=result.url||result.liveUrl||stream.liveUrl||'';if(!playingUrl.value)throw new Error('后端未返回播放地址')}catch(e){uni.showToast({title:e instanceof Error?e.message:'播放失败',icon:'none'})}}
function closePlayer(){playingUrl.value=''}
onLoad(load)
</script>
<style scoped>.intro{margin-bottom:22rpx}.video-list{display:flex;flex-direction:column;gap:22rpx}.video-card{padding:0;overflow:hidden}.preview{height:300rpx;position:relative;display:grid;place-items:center;background:linear-gradient(150deg,#173b38,#071c1b)}.camera-grid{position:absolute;inset:0;opacity:.12;background-image:linear-gradient(rgba(255,255,255,.35) 1rpx,transparent 1rpx),linear-gradient(90deg,rgba(255,255,255,.35) 1rpx,transparent 1rpx);background-size:42rpx 42rpx}.play-btn{position:relative;width:86rpx;height:86rpx;border-radius:50%;display:grid;place-items:center;padding-left:6rpx;color:#fff;background:rgba(19,173,149,.86);box-shadow:0 0 0 14rpx rgba(19,173,149,.18)}.live-badge{position:absolute;left:20rpx;top:20rpx;color:#fff;font-size:20rpx;padding:8rpx 13rpx;background:rgba(0,0,0,.45);border-radius:10rpx}.live-badge text{display:inline-block;width:10rpx;height:10rpx;border-radius:50%;background:#ff5656;margin-right:6rpx}.video-info{padding:24rpx}.meta{font-size:22rpx;margin-top:7rpx}.link{color:#087f72;font-size:24rpx}.player-modal{position:fixed;z-index:99;inset:0;padding:30rpx;background:rgba(3,18,16,.72);display:grid;place-items:center}.player-box{width:100%;background:#fff;border-radius:24rpx;overflow:hidden}.player-head{padding:24rpx}.player{width:100%;height:420rpx;background:#000}.player-tip{padding:20rpx;color:#72827f;font-size:21rpx}</style>
