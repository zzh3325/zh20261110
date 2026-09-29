<template>
  <view class="login-page">
    <view class="orb orb-one" /><view class="orb orb-two" />
    <view class="brand">
      <view class="brand-mark">桥</view>
      <view class="brand-eyebrow">RESERVOIR SAFETY</view>
      <view class="brand-title">大桥水库</view>
      <view class="brand-subtitle">安全标准化信息平台</view>
    </view>

    <view class="login-card">
      <view class="welcome">欢迎登录</view>
      <view class="hint">使用平台账号进入水库安全管理系统</view>
      <view class="field">
        <view class="field-label">账号</view>
        <input v-model.trim="form.username" placeholder="请输入用户名" confirm-type="next" />
      </view>
      <view class="field">
        <view class="field-label">密码</view>
        <input v-model="form.password" :password="!showPassword" placeholder="请输入密码" confirm-type="done" @confirm="submit" />
        <view class="toggle" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</view>
      </view>
      <button class="login-btn" :loading="loading" :disabled="loading" @click="submit">安全登录</button>
      <view v-if="loading" class="progress">{{ progressText }}</view>
      <!-- <button class="demo-btn" :disabled="loading" @click="enterDemo">进入演示模式</button> -->
      <view class="register-link" @click="goRegister">没有账号？<text>立即注册</text></view>
      <!-- <view class="security">密码将使用后端 RSA 公钥加密传输</view> -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { AuthStep } from '@/api/auth'

const auth = useAuthStore()
const loading = ref(false)
const showPassword = ref(false)
const form = reactive({ username: '', password: '' })
const progressText = ref('')

const stepText: Record<AuthStep, string> = {
  'public-key': '正在获取 RSA 公钥…',
  encrypt: '正在加密密码…',
  submit: '正在提交登录信息…',
  'user-info': '正在获取用户信息…'
}

onMounted(() => {
  const username = uni.getStorageSync('register-prefill-username')
  if (typeof username === 'string' && username) form.username = username
  uni.removeStorageSync('register-prefill-username')
})

async function submit() {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await auth.signIn(form.username, form.password, (step) => {
      progressText.value = stepText[step]
    })
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 350)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none' })
  } finally {
    loading.value = false
    progressText.value = ''
  }
}

function goRegister() {
  if (!loading.value) uni.navigateTo({ url: '/pages/register/index' })
}

function enterDemo() {
  auth.enterDemo()
  uni.switchTab({ url: '/pages/home/index' })
}
</script>

<style scoped lang="scss">
.login-page { min-height: 100vh; position: relative; overflow: hidden; padding: calc(var(--status-bar-height) + 80rpx) 38rpx 60rpx; background: linear-gradient(160deg, #053f3b 0%, #087f72 55%, #0d9d89 100%); }
.orb { position: absolute; border-radius: 50%; background: rgba(255,255,255,.07); }
.orb-one { width: 520rpx; height: 520rpx; right: -210rpx; top: -150rpx; }
.orb-two { width: 300rpx; height: 300rpx; left: -180rpx; top: 520rpx; }
.brand { color: #fff; position: relative; margin-bottom: 70rpx; }
.brand-mark { width: 92rpx; height: 92rpx; display: grid; place-items: center; border: 2rpx solid rgba(255,255,255,.45); border-radius: 28rpx; font-size: 46rpx; font-weight: 800; margin-bottom: 36rpx; background: rgba(255,255,255,.12); backdrop-filter: blur(8px); }
.brand-eyebrow { font-size: 20rpx; letter-spacing: 6rpx; opacity: .64; }
.brand-title { font-size: 64rpx; font-weight: 900; letter-spacing: 3rpx; margin-top: 10rpx; }
.brand-subtitle { font-size: 28rpx; letter-spacing: 4rpx; opacity: .82; margin-top: 10rpx; }
.login-card { position: relative; padding: 42rpx 34rpx 34rpx; background: rgba(255,255,255,.97); border-radius: 34rpx; box-shadow: 0 28rpx 70rpx rgba(0,37,32,.24); }
.welcome { font-size: 40rpx; font-weight: 800; color: #123b37; }
.hint { font-size: 23rpx; color: #7b8d8a; margin: 12rpx 0 38rpx; }
.field { position: relative; padding: 18rpx 0 14rpx; border-bottom: 1rpx solid #dce8e6; margin-bottom: 18rpx; }
.field-label { font-size: 21rpx; color: #788a87; margin-bottom: 8rpx; }
.field input { height: 54rpx; font-size: 30rpx; padding-right: 90rpx; }
.toggle { position: absolute; right: 0; bottom: 25rpx; font-size: 23rpx; color: #087f72; }
.login-btn { margin-top: 40rpx; height: 92rpx; line-height: 92rpx; border-radius: 20rpx; color: #fff; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg,#0ba08c,#067067); }
.login-btn::after,.demo-btn::after { border: 0; }
.progress { text-align: center; margin-top: 16rpx; font-size: 22rpx; color: #087f72; }
.demo-btn { margin-top: 18rpx; height: 78rpx; line-height: 78rpx; border-radius: 18rpx; color: #087f72; font-size: 26rpx; background: #edf8f6; }
.register-link { text-align: center; margin-top: 24rpx; font-size: 24rpx; color: #81908e; }
.register-link text { color: #087f72; font-weight: 700; }
.security { text-align: center; font-size: 20rpx; color: #93a19f; margin-top: 24rpx; }
</style>
