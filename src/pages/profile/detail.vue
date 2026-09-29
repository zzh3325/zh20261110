<template><view class="page"><StatePanel :state="state" :message="error" @retry="load" /><view v-if="state==='success'" class="card"><view v-for="field in fields" :key="field.key" class="line"><text class="muted">{{ field.label }}</text><text selectable>{{ field.value }}</text></view><view class="notice">资料来自 /userInfo。若后端仅返回角色，姓名、部门和联系方式将显示“未提供”。当前账号名称来自登录会话；角色名称不等同于具体操作权限。</view><button @click="load">刷新账号资料</button></view></view></template>
<script setup lang="ts">
import { computed,ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import { getUserInfo } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import type { LoadState,UserInfo } from '@/types/domain'
const auth=useAuthStore(),state=ref<LoadState>('loading'),error=ref(''),user=ref<UserInfo>()
const fields=computed(()=>[{key:'username',label:'账号'},{key:'realName',label:'姓名'},{key:'department',label:'部门'},{key:'phone',label:'电话'},{key:'role',label:'角色'}].map(f=>({...f,value:Array.isArray(user.value?.[f.key])?(user.value?.[f.key] as string[]).join(' / '):String(user.value?.[f.key]||'未提供')})))
async function load(){state.value='loading';try{user.value=await getUserInfo(auth.user?.username||'');auth.user=user.value;uni.setStorageSync('daqiao-current-user',user.value);state.value='success'}catch(e){error.value=e instanceof Error?e.message:'读取失败';state.value='error'}}
onLoad(load)
</script>
<style scoped>.line{display:flex;justify-content:space-between;gap:20rpx;padding:25rpx 0;border-bottom:1rpx solid #edf3f1;font-size:25rpx}.line>text:last-child{overflow-wrap:anywhere;text-align:right}.notice{margin:25rpx 0;font-size:23rpx;color:#7b8b85;line-height:1.8}</style>
