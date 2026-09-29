<template>
  <view class="register-page">
    <view class="orb orb-one" /><view class="orb orb-two" />
    <view class="topbar" @click="goBack">‹ <text>返回登录</text></view>

    <view class="heading">
      <view class="heading-title">创建账号</view>
      <view class="heading-subtitle">注册信息提交前，密码会使用后端 RSA 公钥加密</view>
    </view>

    <view class="register-card">
      <view class="field">
        <view class="field-label">用户名 <text>*</text></view>
        <input v-model.trim="form.username" maxlength="40" placeholder="请输入登录用户名" confirm-type="next" />
      </view>
      <view class="field">
        <view class="field-label">姓名</view>
        <input v-model.trim="form.realName" maxlength="40" placeholder="请输入真实姓名（选填）" confirm-type="next" />
      </view>
      <view class="field">
        <view class="field-label">密码 <text>*</text></view>
        <input v-model="form.password" :password="!showPassword" maxlength="64" placeholder="请输入密码" confirm-type="next" />
        <view class="toggle" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</view>
      </view>
      <view class="field">
        <view class="field-label">确认密码 <text>*</text></view>
        <input v-model="form.confirmPassword" :password="!showPassword" maxlength="64" placeholder="请再次输入密码" confirm-type="done" @confirm="submit" />
      </view>

      <button class="register-btn" :loading="loading" :disabled="loading" @click="submit">注册账号</button>
      <view v-if="loading" class="progress">{{ progressText }}</view>
      <view class="login-link" @click="goBack">已有账号？<text>返回登录</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { register, type AuthStep } from '@/api/auth'

const loading = ref(false)
const showPassword = ref(false)
const progressText = ref('')
const form = reactive({
  username: '',
  realName: '',
  password: '',
  confirmPassword: ''
})

const stepText: Partial<Record<AuthStep, string>> = {
  'public-key': '正在获取 RSA 公钥…',
  encrypt: '正在加密密码…',
  submit: '正在提交注册信息…'
}

function validate(): string {
  if (!form.username) return '请输入用户名'
  if (!form.password) return '请输入密码'
  if (form.password.length < 6) return '密码至少需要 6 位'
  if (form.password !== form.confirmPassword) return '两次输入的密码不一致'
  return ''
}

async function submit() {
  if (loading.value) return
  const message = validate()
  if (message) {
    uni.showToast({ title: message, icon: 'none' })
    return
  }

  loading.value = true
  try {
    const response = await register({
      username: form.username,
      password: form.password,
      realName: form.realName || undefined
    }, (step) => {
      progressText.value = stepText[step] || '正在处理…'
    })
    uni.setStorageSync('register-prefill-username', form.username)
    uni.showToast({ title: response.message || '注册成功', icon: 'success' })
    setTimeout(goBack, 500)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '注册失败', icon: 'none' })
  } finally {
    loading.value = false
    progressText.value = ''
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/login/index' })
}
</script>

<style scoped lang="scss">
.register-page { min-height: 100vh; position: relative; overflow: hidden; padding: calc(var(--status-bar-height) + 34rpx) 38rpx 60rpx; background: linear-gradient(160deg, #053f3b 0%, #087f72 55%, #0d9d89 100%); }
.orb { position: absolute; border-radius: 50%; background: rgba(255,255,255,.07); }
.orb-one { width: 520rpx; height: 520rpx; right: -210rpx; top: -150rpx; }
.orb-two { width: 300rpx; height: 300rpx; left: -180rpx; bottom: 80rpx; }
.topbar { position: relative; color: rgba(255,255,255,.92); font-size: 46rpx; height: 60rpx; display: flex; align-items: center; gap: 8rpx; }
.topbar text { font-size: 25rpx; }
.heading { position: relative; color: #fff; margin: 44rpx 0 38rpx; }
.heading-title { font-size: 52rpx; font-weight: 900; letter-spacing: 2rpx; }
.heading-subtitle { margin-top: 12rpx; font-size: 23rpx; opacity: .76; }
.register-card { position: relative; padding: 36rpx 34rpx 34rpx; background: rgba(255,255,255,.97); border-radius: 34rpx; box-shadow: 0 28rpx 70rpx rgba(0,37,32,.24); }
.field { position: relative; padding: 14rpx 0 12rpx; border-bottom: 1rpx solid #dce8e6; margin-bottom: 12rpx; }
.field-label { font-size: 21rpx; color: #788a87; margin-bottom: 6rpx; }
.field-label text { color: #e25c4f; }
.field input { height: 50rpx; font-size: 28rpx; padding-right: 90rpx; }
.toggle { position: absolute; right: 0; bottom: 22rpx; font-size: 23rpx; color: #087f72; }
.register-btn { margin-top: 34rpx; height: 88rpx; line-height: 88rpx; border-radius: 20rpx; color: #fff; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg,#0ba08c,#067067); }
.register-btn::after { border: 0; }
.progress { text-align: center; margin-top: 16rpx; font-size: 22rpx; color: #087f72; }
.login-link { text-align: center; margin-top: 26rpx; font-size: 24rpx; color: #81908e; }
.login-link text { color: #087f72; font-weight: 700; }
</style>
