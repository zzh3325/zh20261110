<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'

onLaunch(() => {
  const auth = useAuthStore()
  auth.restore()
  if (!auth.isAuthenticated) {
    uni.reLaunch({ url: '/pages/login/index' })
  }
})
</script>

<style lang="scss">
page {
  min-height: 100%;
  background: #f3f7f6;
  color: #16322f;
}
</style>
