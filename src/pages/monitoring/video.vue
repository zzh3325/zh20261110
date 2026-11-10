<template>
  <view class="page video-page">
    <view class="section-subtitle intro">现场摄像头、实时直播和录像回放</view>
    <view class="video-entries"><DataEntries :keys="['cameras','recordings','incidents']" :columns="3" /></view>
    <StatePanel :state="state" :message="errorMessage" @retry="load" />
    <view v-if="state==='success'" class="video-list">
      <view v-for="camera in cameras" :key="camera.key" class="video-card card">
        <view class="preview" @click="play(camera.selected)">
          <view class="camera-grid" /><view class="play-btn">▶</view>
          <view class="live-badge"><text /> {{ camera.selected.status === 'ONLINE' ? 'LIVE' : camera.selected.status }}</view>
        </view>
        <view class="video-info row between">
          <view class="camera-info"><view class="strong">{{ camera.name }}</view><view class="muted meta">{{ camera.selected.status || '状态未知' }}</view></view>
          <view class="link" @click="play(camera.selected)">播放 ›</view>
        </view>
        <view v-if="camera.streams.length > 1" class="stream-switch" aria-label="选择码流">
          <button v-for="stream in camera.streams" :key="stream.id" size="mini" class="stream-option"
            :class="{ active: camera.selected.id === stream.id }" :aria-pressed="camera.selected.id === stream.id"
            @click="selectStream(camera, stream)">{{ streamLabel(stream) }}</button>
        </view>
        <view class="video-info row between">
          <view class="link" @click="openDataSource('recordings', { streamId: camera.selected.id })">查询录像</view>
          <view class="link" @click="openDataSource('incidents', { streamId: camera.selected.id })">问题时段</view>
        </view>
      </view>
    </view>
    <view v-if="playingUrl" class="player-modal" @click.self="closePlayer">
      <view class="player-box"><view class="row between player-head"><view class="strong">实时视频</view><view @click="closePlayer">✕</view></view><LivePlayer :url="playingUrl" /></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { onHide, onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import DataEntries from '@/components/DataEntries.vue'
import LivePlayer from '@/components/LivePlayer.vue'
import StatePanel from '@/components/StatePanel.vue'
import { openDataSource } from '@/api/data-sources'
import { getLive, getStreams, groupCameraStreams, streamLabel, type CameraStreams, type Stream } from '@/api/video'
import type { LoadState } from '@/types/domain'

const state = ref<LoadState>('loading')
const errorMessage = ref('')
const cameras = ref<CameraStreams[]>([])
const playingUrl = ref('')
let deviceId = ''
let playRequest = 0

async function load() {
  state.value = 'loading'
  errorMessage.value = ''
  try {
    const streams = await getStreams(deviceId ? { deviceId } : undefined)
    cameras.value = groupCameraStreams(streams)
    state.value = cameras.value.length ? 'success' : 'empty'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '视频列表加载失败'
    state.value = 'error'
  }
}

async function play(stream: Stream) {
  const request = ++playRequest
  try {
    const result = await getLive(stream.id)
    if (request !== playRequest) return
    const url = result.url || result.liveUrl || stream.liveUrl
    if (!url) throw new Error('暂无可用播放地址')
    playingUrl.value = url
  } catch (error) {
    if (request === playRequest) uni.showToast({ title: error instanceof Error ? error.message : '播放失败', icon: 'none' })
  }
}

function selectStream(camera: CameraStreams, stream: Stream) {
  if (camera.selected.id === stream.id) return
  closePlayer()
  camera.selected = stream
}

function closePlayer() {
  playRequest++
  playingUrl.value = ''
}

onLoad(options => {
  deviceId = String(options?.deviceId ?? '')
  load()
})
onHide(closePlayer)
</script>
<style scoped>.intro{margin-bottom:22rpx}.video-entries :deep(.entries){gap:10rpx}.video-entries :deep(.entry){padding:22rpx 8rpx;text-align:center}.video-entries :deep(.entry-title){font-size:23rpx;white-space:nowrap}.video-entries :deep(.entry-sub){font-size:17rpx;white-space:nowrap}.video-list{display:flex;flex-direction:column;gap:22rpx}.video-card{padding:0;overflow:hidden}.preview{height:300rpx;position:relative;display:grid;place-items:center;background:linear-gradient(150deg,#173b38,#071c1b)}.camera-grid{position:absolute;inset:0;opacity:.12;background-image:linear-gradient(rgba(255,255,255,.35) 1rpx,transparent 1rpx),linear-gradient(90deg,rgba(255,255,255,.35) 1rpx,transparent 1rpx);background-size:42rpx 42rpx}.play-btn{position:relative;width:86rpx;height:86rpx;border-radius:50%;display:grid;place-items:center;padding-left:6rpx;color:#fff;background:rgba(19,173,149,.86);box-shadow:0 0 0 14rpx rgba(19,173,149,.18)}.live-badge{position:absolute;left:20rpx;top:20rpx;color:#fff;font-size:20rpx;padding:8rpx 13rpx;background:rgba(0,0,0,.45);border-radius:10rpx}.live-badge text{display:inline-block;width:10rpx;height:10rpx;border-radius:50%;background:#ff5656;margin-right:6rpx}.video-info{padding:24rpx}.meta{font-size:22rpx;margin-top:7rpx}.link{color:#087f72;font-size:24rpx}.player-modal{position:fixed;z-index:99;inset:0;padding:30rpx;background:rgba(3,18,16,.72);display:grid;place-items:center}.player-box{width:100%;background:#fff;border-radius:24rpx;overflow:hidden}.player-head{padding:24rpx}.player{width:100%;height:420rpx;background:#000}
.camera-info{min-width:0;overflow-wrap:anywhere}
.video-info .link{flex:none}
.stream-switch{display:flex;flex-wrap:wrap;gap:12rpx;padding:0 24rpx}
.stream-option{margin:0;min-height:54rpx;padding:0 20rpx;border-radius:12rpx;background:#eef5f3;color:#4e6863;font-size:22rpx}
.stream-option::after{border:0}
.stream-option.active{background:#dff2ee;color:#076d62;font-weight:700}
</style>
