import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import type { UserInfo } from '@/types/domain'

const USER_KEY = 'daqiao-current-user'
const DEMO_KEY = 'daqiao-demo-mode'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const demoMode = ref(false)
  const isAuthenticated = computed(() => Boolean(user.value))
  const displayName = computed(() => user.value?.realName || user.value?.name || user.value?.username || '用户')

  function restore() {
    user.value = uni.getStorageSync(USER_KEY) || null
    demoMode.value = Boolean(uni.getStorageSync(DEMO_KEY))
  }

  async function signIn(username: string, password: string, onStep?: authApi.AuthStepHandler) {
    const response = await authApi.login({ username, password }, onStep)
    uni.setStorageSync('auth-token', response.token)
    onStep?.('user-info')
    try {
      user.value = response.user || await authApi.getUserInfo(username)
    } catch {
      // Token 已成功取得时，不让资料接口异常阻断登录和页面跳转。
      user.value = response.user || { username }
    }
    demoMode.value = false
    uni.setStorageSync(USER_KEY, user.value)
    uni.removeStorageSync(DEMO_KEY)
  }

  function enterDemo() {
    demoMode.value = true
    user.value = { id: 'demo', username: 'demo', realName: '演示用户', department: '运行管理中心', role: ['viewer', 'inspector'] }
    uni.setStorageSync(USER_KEY, user.value)
    uni.setStorageSync(DEMO_KEY, true)
  }

  function signOut() {
    user.value = null
    demoMode.value = false
    uni.removeStorageSync(USER_KEY)
    uni.removeStorageSync(DEMO_KEY)
    uni.removeStorageSync('auth-token')
    uni.reLaunch({ url: '/pages/login/index' })
  }

  return { user, demoMode, isAuthenticated, displayName, restore, signIn, enterDemo, signOut }
})
