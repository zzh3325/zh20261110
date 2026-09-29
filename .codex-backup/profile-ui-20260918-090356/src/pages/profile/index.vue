<template>
  <view>
    <AppHeader title="个人管理" subtitle="账号、权限与应用设置" />
    <view class="page profile-body">
      <view class="profile-card card row">
        <view class="avatar">{{ initial }}</view>
        <view class="grow"><view class="name">{{ auth.displayName }}</view><view class="muted dept">{{ auth.user?.department || '部门信息未提供' }}</view><view class="pill role">{{ roleText }}</view></view>
      </view>
      <view v-if="auth.demoMode" class="demo-banner">演示模式下不执行真实账号操作</view>
      <view class="section-title">账号与业务</view>
      <DataEntries :keys="['files','locations']" />
      <view class="menu card">
        <view v-for="item in accountMenus" :key="item.label" class="menu-item row" @click="handleMenu(item)"><view class="menu-icon" :class="item.tone">{{ item.icon }}</view><view class="grow"><view>{{ item.label }}</view><view v-if="item.caption" class="muted caption">{{ item.caption }}</view></view><view class="arrow">›</view></view>
      </view>
      <view class="section-title">系统设置</view>
      <view class="menu card">
        <view class="menu-item row"><view class="menu-icon blue">◫</view><view class="grow">消息提醒</view><switch :checked="notifications" color="#087f72" @change="toggleNotifications" /></view>
        <view class="menu-item row" @click="clearCache"><view class="menu-icon orange">⌫</view><view class="grow">清理缓存</view><view class="arrow">›</view></view>
        <view class="menu-item row"><view class="menu-icon">i</view><view class="grow">关于平台</view><view class="muted version">V2.0.0</view></view>
      </view>
      <button class="logout" @click="confirmLogout">退出登录</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import DataEntries from '@/components/DataEntries.vue'
import { computed,ref } from 'vue';import AppHeader from '@/components/AppHeader.vue';import { useAuthStore } from '@/stores/auth'
const auth=useAuthStore(),notifications=ref(Boolean(uni.getStorageSync('notifications-enabled')??true));const initial=computed(()=>auth.displayName.slice(0,1)),roleText=computed(()=>{const r=auth.user?.role;return Array.isArray(r)?r.join(' / '):r||'普通用户'})
const accountMenus=[{label:'个人资料',caption:'查询后端账号资料',icon:'人',tone:'green',action:'profile'},{label:'巡检记录',caption:'查看有权访问的巡检记录',icon:'✓',tone:'blue',action:'inspection'},{label:'预警记录',caption:'查看有权访问的预警记录',icon:'!',tone:'orange',action:'alert'},{label:'账号角色',caption:'查询当前账号角色',icon:'钥',tone:'purple',action:'permission'}]
function handleMenu(i:{action:string}){if(i.action==='inspection')uni.switchTab({url:'/pages/inspection/index'});else if(i.action==='alert')uni.switchTab({url:'/pages/alert/index'});else uni.navigateTo({url:'/pages/profile/detail'})}
function toggleNotifications(e: Event){const value=Boolean((e as Event & {detail?:{value?:boolean}}).detail?.value);notifications.value=value;uni.setStorageSync('notifications-enabled',value)}function clearCache(){uni.showModal({title:'清理缓存',content:'将清理临时数据，但保留登录状态和巡检草稿。',success:r=>{if(r.confirm)uni.showToast({title:'缓存已清理',icon:'success'})}})}function confirmLogout(){uni.showModal({title:'退出登录',content:'确定要退出当前账号吗？',success:r=>{if(r.confirm)auth.signOut()}})}
</script>
<style scoped>.profile-body{margin-top:-24rpx;position:relative}.profile-card{gap:24rpx}.avatar{width:106rpx;height:106rpx;flex:none;border-radius:30rpx;display:grid;place-items:center;font-size:44rpx;font-weight:900;color:#fff;background:linear-gradient(135deg,#11aa94,#066b63)}.name{font-size:34rpx;font-weight:800}.dept{font-size:22rpx;margin:7rpx 0 10rpx}.role{font-size:18rpx;padding:5rpx 12rpx}.demo-banner{margin-top:18rpx;padding:16rpx;text-align:center;border-radius:14rpx;color:#85631e;background:#fff3cc;font-size:21rpx}.menu{padding:0 24rpx}.menu-item{min-height:112rpx;border-bottom:1rpx solid #edf2f1;gap:18rpx;font-size:27rpx}.menu-item:last-child{border:0}.menu-icon{width:60rpx;height:60rpx;display:grid;place-items:center;border-radius:17rpx;color:#087f72;background:#e7f6f3}.menu-icon.blue{color:#276fac;background:#e9f2ff}.menu-icon.orange{color:#c56e18;background:#fff0dc}.menu-icon.purple{color:#7453ad;background:#f0e9ff}.caption{font-size:20rpx;margin-top:5rpx}.arrow{font-size:40rpx;color:#a6b2b0}.version{font-size:22rpx}.logout{margin-top:32rpx;height:86rpx;line-height:86rpx;border-radius:18rpx;color:#bd4b4b;background:#fff;font-size:27rpx}.logout::after{border:0}</style>
