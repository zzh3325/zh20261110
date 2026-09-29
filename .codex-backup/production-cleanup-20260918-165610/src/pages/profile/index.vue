<template>
  <view>
    <AppHeader title="个人管理" subtitle="账号、权限与应用设置" />
    <view class="page profile-body">
      <view class="profile-card card row">
        <view class="profile-glow glow-one" /><view class="profile-glow glow-two" />
        <view class="avatar">{{ initial }}</view>
        <view class="grow identity"><view class="name">{{ auth.displayName }}</view><view class="muted dept">{{ auth.user?.department || '部门信息未提供' }}</view><view class="identity-meta"><view class="pill role">{{ roleText }}</view><view class="account-state"><text />账号已登录</view></view></view>
      </view>
      <view v-if="auth.demoMode" class="demo-banner">演示模式下不执行真实账号操作</view>
      <view class="section-heading"><view class="section-title">业务资料</view><view class="section-note">工程档案与资产信息</view></view>
      <view class="business-links"><DataEntries :keys="['files','locations']" /></view>
      <view class="section-heading"><view class="section-title">常用功能</view><view class="section-note">账号信息与业务记录</view></view>
      <view class="menu card">
        <view v-for="item in accountMenus" :key="item.label" class="menu-item row" @click="handleMenu(item)"><view class="menu-icon" :class="item.tone">{{ item.icon }}</view><view class="grow"><view>{{ item.label }}</view><view v-if="item.caption" class="muted caption">{{ item.caption }}</view></view><view class="arrow">›</view></view>
      </view>
      <view class="section-heading"><view class="section-title">系统设置</view><view class="section-note">通知、缓存与版本信息</view></view>
      <view class="menu card">
        <view class="menu-item row"><view class="menu-icon blue">铃</view><view class="grow"><view>消息提醒</view><view class="muted caption">接收告警和巡检状态提醒</view></view><switch class="notify-switch" :checked="notifications" color="#087f72" @change="toggleNotifications" /></view>
        <view class="menu-item row" @click="clearCache"><view class="menu-icon orange">清</view><view class="grow"><view>清理缓存</view><view class="muted caption">保留登录状态与巡检草稿</view></view><view class="arrow">›</view></view>
        <view class="menu-item row"><view class="menu-icon">i</view><view class="grow"><view>关于平台</view><view class="muted caption">大桥水库安全标准化信息平台</view></view><view class="version">V2.0.0</view></view>
      </view>
      <button class="logout" @click="confirmLogout"><text>退出当前账号</text></button>
    </view>
  </view>
</template>
<script setup lang="ts">
import DataEntries from '@/components/DataEntries.vue'
import { computed,ref } from 'vue';import AppHeader from '@/components/AppHeader.vue';import { useAuthStore } from '@/stores/auth'
const auth=useAuthStore(),notifications=ref(Boolean(uni.getStorageSync('notifications-enabled')??true));const initial=computed(()=>auth.displayName.slice(0,1)),roleText=computed(()=>{const r=auth.user?.role;return Array.isArray(r)?r.join(' / '):r||'普通用户'})
const accountMenus=[{label:'个人资料',caption:'查看账号、部门与角色信息',icon:'人',tone:'green',action:'profile'},{label:'巡检记录',caption:'查看有权访问的巡检记录',icon:'巡',tone:'blue',action:'inspection'},{label:'预警记录',caption:'查看有权访问的预警记录',icon:'警',tone:'orange',action:'alert'}]
function handleMenu(i:{action:string}){if(i.action==='inspection')uni.switchTab({url:'/pages/inspection/index'});else if(i.action==='alert')uni.switchTab({url:'/pages/alert/index'});else uni.navigateTo({url:'/pages/profile/detail'})}
function toggleNotifications(e: Event){const value=Boolean((e as Event & {detail?:{value?:boolean}}).detail?.value);notifications.value=value;uni.setStorageSync('notifications-enabled',value)}function clearCache(){uni.showModal({title:'清理缓存',content:'将清理临时数据，但保留登录状态和巡检草稿。',success:r=>{if(r.confirm)uni.showToast({title:'缓存已清理',icon:'success'})}})}function confirmLogout(){uni.showModal({title:'退出登录',content:'确定要退出当前账号吗？',success:r=>{if(r.confirm)auth.signOut()}})}
</script>
<style scoped>
.profile-body{margin-top:-24rpx;position:relative;padding-bottom:42rpx}.profile-card{position:relative;overflow:hidden;gap:24rpx;padding:30rpx;border:1rpx solid #dcebe8;background:linear-gradient(135deg,#fff,#f4fbf9)}.profile-card>*:not(.profile-glow){position:relative;z-index:1}.profile-glow{position:absolute;border-radius:50%;background:#13aa9420}.glow-one{width:180rpx;height:180rpx;right:-60rpx;top:-80rpx}.glow-two{width:90rpx;height:90rpx;right:88rpx;bottom:-50rpx}.avatar{width:108rpx;height:108rpx;flex:none;border-radius:32rpx;display:grid;place-items:center;font-size:44rpx;font-weight:900;color:#fff;background:linear-gradient(145deg,#11aa94,#067066);box-shadow:0 12rpx 24rpx #087f7240}.identity{min-width:0}.name{font-size:34rpx;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dept{font-size:22rpx;margin:7rpx 0 12rpx}.identity-meta{display:flex;align-items:center;flex-wrap:wrap;gap:12rpx}.role{font-size:18rpx;padding:5rpx 12rpx}.account-state{display:flex;align-items:center;color:#55716d;font-size:19rpx}.account-state text{width:10rpx;height:10rpx;border-radius:50%;background:#19aa83;margin-right:7rpx;box-shadow:0 0 0 5rpx #19aa8320}.demo-banner{margin-top:18rpx;padding:16rpx;text-align:center;border-radius:14rpx;color:#85631e;background:#fff3cc;font-size:21rpx}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20rpx;margin:30rpx 0 14rpx}.section-heading .section-title{margin:0}.section-note{color:#82918e;font-size:19rpx;text-align:right}.business-links :deep(.entries){margin:0;gap:14rpx}.business-links :deep(.entry){min-height:92rpx;box-sizing:border-box;padding:20rpx;border-radius:18rpx;background:linear-gradient(145deg,#fff,#f5faf9);box-shadow:0 7rpx 18rpx #17463e0b}.business-links :deep(.entry-title){font-size:25rpx}.business-links :deep(.entry-sub){margin-top:7rpx}.menu{padding:0 24rpx;border:1rpx solid #e4eeec}.menu-item{min-height:116rpx;border-bottom:1rpx solid #edf2f1;gap:18rpx;font-size:26rpx}.menu-item:active{background:#f5faf8}.menu-item:last-child{border:0}.menu-icon{width:62rpx;height:62rpx;display:grid;place-items:center;border-radius:19rpx;color:#087f72;background:#e4f5f1;font-size:22rpx;font-weight:800}.menu-icon.blue{color:#276fac;background:#e9f2ff}.menu-icon.orange{color:#c56e18;background:#fff0dc}.caption{font-size:20rpx;margin-top:5rpx;line-height:1.4}.arrow{font-size:40rpx;color:#a6b2b0}.version{flex:none;color:#70817e;font-size:20rpx;padding:7rpx 11rpx;border-radius:999rpx;background:#eef4f2}.notify-switch{flex:none;transform:scale(.82);transform-origin:right center}.logout{margin-top:30rpx;height:88rpx;line-height:88rpx;border-radius:20rpx;color:#bd4b4b;background:#fff;font-size:26rpx;border:1rpx solid #f0dede}.logout::after{border:0}.logout:active{background:#fff5f5}
</style>
