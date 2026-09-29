<template>
 <view class="page">
  <view class="hero card"><view class="section-title">工程综合监测</view><view>按工程部位与监测业务分类</view><view class="sub">选择分类 → 设备 / 测站 → 测点 → 观测记录</view></view>
  <view class="entry card row between" @click="openDataSource('devices')"><view><view class="strong">设备管理</view><view class="muted">设备台账、运行状态与责任信息</view></view><text>›</text></view>
  <view v-for="group in groups" :key="group.title" class="card category">
   <view class="title">{{ group.title }}</view>
   <view v-for="item in group.items" :key="item.key" class="row between item" @click="open(item)"><view>{{ group.items.length===1?'查看设备与监测数据':item.title }}<view v-if="item.kind==='unsupported'" class="muted note">正确数据接口待确认</view></view><text>›</text></view>
  </view>
  <!-- <view class="muted foot">无数据、未知状态与接口异常分开显示，不使用演示值填补。</view> -->
 </view>
</template>
<script setup lang="ts">
import { monitorCategories,type MonitorCategory } from '@/api/monitor-categories'
import { openDataSource } from '@/api/data-sources'
const groups=monitorCategories.reduce<{title:string;items:MonitorCategory[]}[]>((all,c)=>{const title=c.group||c.title;const group=all.find(g=>g.title===title);if(group)group.items.push(c);else all.push({title,items:[c]});return all},[])
function open(c:MonitorCategory){uni.navigateTo({url:c.kind==='video'?'/pages/monitoring/video':'/pages/monitoring/business?category='+c.key})}
</script>
<style scoped>
.hero{background:linear-gradient(120deg,#075f58,#0aa28d);color:white}.hero .section-title{margin-top:0;color:white}.sub{font-size:22rpx;opacity:.8;margin-top:20rpx}.entry,.category{margin-top:20rpx}.entry .muted{font-size:22rpx;margin-top:8rpx}.title{font-weight:800;font-size:29rpx;color:#075f58}.item{padding:24rpx 0 4rpx;font-size:25rpx;gap:16rpx}.item+.item{margin-top:18rpx;border-top:1rpx solid #e6efec}.item>text{font-size:36rpx;color:#087f72}.note,.foot{font-size:22rpx;line-height:1.8}.foot{margin-top:25rpx}
</style>
