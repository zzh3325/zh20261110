<template>
  <view class="page">
    <StatePanel :state="state" :message="error" @retry="load" />
    <template v-if="state==='success'">
      <view class="card">
        <view class="row between">
          <view class="section-title record-title">{{ task.title||'安全巡检记录' }}</view>
          <view class="pill">{{ task.result||'未填结果' }}</view>
        </view>
        <view v-for="field in fields" :key="field.key" class="detail">
          <text class="muted">{{ field.label }}</text><text selectable>{{ field.value }}</text>
        </view>
      </view>
      <view class="section-title">现场照片</view>
      <view v-if="photos.length" class="photos">
        <view v-for="photo in photos" :key="photo.path" class="photo-item">
          <image v-if="photo.url" :src="photo.url" mode="aspectFill" @click="preview(photo.url)" />
          <view v-else class="photo-failed">照片加载失败</view>
        </view>
      </view>
      <view v-else class="card muted">暂无巡检照片</view>
      <view v-if="photoWarning" class="photo-warning">{{ photoWarning }}</view>
      <view class="action-grid">
        <button class="btn-primary" @click="edit">编辑记录</button>
        <button class="delete-button" :loading="deleting" @click="remove">删除记录</button>
      </view>
      <!-- <view class="note muted">巡检记录与照片均通过新版安全巡检管理接口读取；编辑和删除操作由后端校验账号权限。</view> -->
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed,ref } from 'vue'
import { onLoad,onShow,onUnload } from '@dcloudio/uni-app'
import StatePanel from '@/components/StatePanel.vue'
import { deleteInspection,getInspection } from '@/api/inspection'
import { loadInspectionPhoto,releaseInspectionPhoto } from '@/utils/photos'
import type { Inspection,LoadState } from '@/types/domain'

const state=ref<LoadState>('loading'),error=ref(''),id=ref(''),task=ref<Inspection>({id:''}),photoWarning=ref(''),deleting=ref(false)
const photos=ref<Array<{path:string;url:string}>>([])
const fields=computed(()=>[
  {key:'time',label:'巡检时间'},
  {key:'location',label:'巡检位置'},
  {key:'inspectionType',label:'巡检类型'},
  {key:'assigneeName',label:'巡检人员'},
  {key:'coordinate',label:'打卡坐标'},
  {key:'description',label:'问题说明'}
].map(field=>({...field,value:String(task.value[field.key]??'').trim()||'未提供'})))
let busy=false

function releasePhotos(){photos.value.forEach(photo=>photo.url&&releaseInspectionPhoto(photo.url));photos.value=[]}
async function load(){
  if(!id.value||busy)return
  busy=true;state.value='loading';photoWarning.value='';releasePhotos()
  try{
    task.value=await getInspection(id.value)
    let failed=false
    for(const path of Array.isArray(task.value.photoPaths)?task.value.photoPaths:[]){
      const photo={path,url:''};photos.value.push(photo)
      try{photo.url=await loadInspectionPhoto(path)}catch{failed=true}
    }
    if(failed)photoWarning.value='部分照片加载失败，请检查文件是否仍存在及账号访问权限。'
    state.value='success'
  }catch(e){error.value=e instanceof Error?e.message:'加载失败';state.value='error'}finally{busy=false}
}
function preview(url:string){const urls=photos.value.map(photo=>photo.url).filter(Boolean);if(url)uni.previewImage({urls,current:url})}
function edit(){uni.navigateTo({url:'/pages/inspection/execute?id='+encodeURIComponent(id.value)})}
function remove(){
  if(deleting.value)return
  uni.showModal({title:'删除巡检记录',content:'删除后无法恢复，确认删除这条巡检记录吗？',confirmColor:'#d44747',success:async modal=>{
    if(!modal.confirm)return
    deleting.value=true
    try{await deleteInspection(id.value);uni.showToast({title:'删除成功',icon:'success'});setTimeout(()=>uni.navigateBack(),500)}
    catch(e){uni.showToast({title:e instanceof Error?e.message:'删除失败',icon:'none'})}
    finally{deleting.value=false}
  }})
}
onLoad(options=>{id.value=String(options?.id||'');if(!id.value){state.value='error';error.value='缺少巡检记录 ID'}})
onShow(load)
onUnload(releasePhotos)
</script>

<style scoped>
.record-title{margin:0;min-width:0;overflow-wrap:anywhere}.detail{padding:24rpx 0;border-bottom:1rpx solid #edf3f1;display:flex;gap:24rpx;justify-content:space-between;font-size:25rpx}.detail>text:first-child{flex:none}.detail>text:last-child{text-align:right;overflow-wrap:anywhere}.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx}.photo-item,.photos image,.photo-failed{width:100%;height:180rpx;border-radius:14rpx;overflow:hidden}.photo-failed{display:grid;place-items:center;color:#84928f;background:#e8efee;font-size:20rpx}.photo-warning{margin-top:12rpx;color:#b36c18;font-size:21rpx}.action-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:16rpx;margin-top:25rpx}.delete-button{height:88rpx;line-height:88rpx;border-radius:18rpx;color:#c83f3f;background:#fff;border:2rpx solid #f1caca;font-size:26rpx}.delete-button::after{border:0}.note{font-size:22rpx;line-height:1.8;margin-top:20rpx}
</style>
