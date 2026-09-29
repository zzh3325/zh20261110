<template><view class="page"><StatePanel :state="state" :message="error" @retry="load" /><template v-if="state==='success'"><view class="card"><view class="section-title">{{ task.title||'安全巡检记录' }}</view><view class="pill">{{ task.result||'未填结果' }}</view><view v-for="field in fields" :key="field.key" class="detail"><text class="muted">{{ field.label }}</text><text selectable>{{ field.value }}</text></view></view><view class="section-title">现场照片</view><view class="photos"><image v-for="url in photos" :key="url" :src="url" mode="aspectFill" @click="preview(url)" /></view><view v-if="!photos.length" class="card muted">暂无可访问的照片</view><view v-if="photoWarning" class="muted">{{ photoWarning }}</view><button class="btn-primary edit" @click="edit">编辑巡检记录</button><view class="note muted">此页面展示已保存的巡检记录，不代表后台已派发巡检任务。编辑提交由后端校验权限。</view></template></view></template>
<script setup lang="ts">
import { computed,ref } from 'vue'
import { onLoad,onShow } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import { useAuthStore } from '@/stores/auth'
import { getInspection } from '@/api/inspection'
import { safeResourceUrl } from '@/api/data-browser'
import { demoInspections } from '@/data/demo'
import type { Inspection,LoadState } from '@/types/domain'
const auth=useAuthStore(),state=ref<LoadState>('loading'),error=ref(''),id=ref(''),task=ref<Inspection>({id:''}),photoWarning=ref(''),photos=ref<string[]>([])
const fields=computed(()=>[{key:'time',label:'巡检时间'},{key:'location',label:'巡检位置'},{key:'inspectionType',label:'巡检类型'},{key:'assigneeName',label:'巡检人员'},{key:'coordinate',label:'打卡坐标'},{key:'description',label:'问题说明'}].map(f=>({...f,value:String(task.value[f.key]??'未提供')||'未提供'})))
let busy=false
async function load(){if(!id.value||busy)return;busy=true;state.value='loading';photoWarning.value='';photos.value=[];try{task.value=auth.demoMode?(demoInspections.find(i=>String(i.id)===id.value)||demoInspections[0]):await getInspection(id.value);for(const path of Array.isArray(task.value.photoPaths)?task.value.photoPaths:[]){try{photos.value.push(safeResourceUrl(path))}catch{photoWarning.value='部分照片地址不可访问，请检查后端文件访问策略'}}state.value='success'}catch(e){error.value=e instanceof Error?e.message:'加载失败';state.value='error'}finally{busy=false}}
function preview(url:string){uni.previewImage({urls:photos.value,current:url})}
function edit(){uni.navigateTo({url:'/pages/inspection/execute?id='+encodeURIComponent(id.value)})}
onLoad(o=>{id.value=String(o?.id||'');if(!id.value){state.value='error';error.value='缺少巡检记录 ID'}})
onShow(load)
</script>
<style scoped>.detail{padding:24rpx 0;border-bottom:1rpx solid #edf3f1;display:flex;gap:24rpx;justify-content:space-between;font-size:25rpx}.detail>text:first-child{flex:none}.detail>text:last-child{text-align:right;overflow-wrap:anywhere}.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx}.photos image{width:100%;height:180rpx;border-radius:14rpx}.edit{margin-top:25rpx}.note{font-size:22rpx;line-height:1.8;margin-top:20rpx}</style>
