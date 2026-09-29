<template>
  <view>
    <video :id="elementId" :src="nativeUrl" class="live-player" controls autoplay playsinline />
    <view v-if="errorMessage" class="play-error">{{ errorMessage }}</view>
  </view>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
// #ifdef H5
import Hls from 'hls.js'
// #endif
const props = defineProps<{ url: string }>()
const elementId = 'live-' + Math.random().toString(36).slice(2)
const errorMessage = ref('')
const nativeUrl = computed(() => /\.m3u8(?:\?|$)/i.test(props.url) ? '' : props.url)
// #ifdef H5
let player: Hls | undefined
// #endif
function cleanup() {
  // #ifdef H5
  player?.destroy()
  player = undefined
  const root = document.getElementById(elementId)
  const video = root instanceof HTMLVideoElement ? root : root?.querySelector('video')
  video?.pause()
  // #endif
}
async function start() {
  cleanup()
  errorMessage.value = ''
  await nextTick()
  // #ifdef H5
  const root = document.getElementById(elementId)
  const video = root instanceof HTMLVideoElement ? root : root?.querySelector('video')
  if (!video) return
  video.onerror = () => { errorMessage.value = '视频播放失败，请检查视频源和跨域配置' }
  if (/\.m3u8(?:\?|$)/i.test(props.url)) {
    if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = props.url
    else if (Hls.isSupported()) {
      player = new Hls()
      player.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) { errorMessage.value = '直播加载失败，请检查视频服务、网络与跨域配置'; player?.destroy(); player = undefined }
      })
      player.loadSource(props.url)
      player.attachMedia(video)
    } else errorMessage.value = '当前浏览器不支持此直播格式'
  }
  // #endif
}
onMounted(start)
watch(() => props.url, start)
onBeforeUnmount(cleanup)
</script>
<style scoped>
.live-player { width: 100%; height: 420rpx; background: #000; }
.play-error { padding: 20rpx; color: #b43b36; font-size: 24rpx; }
</style>
