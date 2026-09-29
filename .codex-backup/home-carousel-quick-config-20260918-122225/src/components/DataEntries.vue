<template><view class="entries"><view v-for="source in sources" :key="source.key" class="entry" @click="openDataSource(source.key)"><view class="entry-title">{{ source.title }}</view><view class="entry-sub">{{ source.paged?'分页观测查询':'台账与详情' }} ›</view></view></view></template>
<script setup lang="ts">
import { computed } from 'vue'
import { dataSources,openDataSource } from '@/api/data-sources'
const props=defineProps<{ keys:string[] }>()
const sources=computed(()=>props.keys.map(key=>dataSources.find(s=>s.key===key)).filter((s):s is typeof dataSources[number]=>Boolean(s)))
</script>
<style scoped>.entries{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin:20rpx 0}.entry{padding:24rpx 18rpx;border-radius:18rpx;background:#fff;border:1rpx solid #dcece8}.entry-title{font-size:27rpx;color:#076f65;font-weight:700}.entry-sub{font-size:20rpx;color:#7e8e89;margin-top:10rpx}</style>
