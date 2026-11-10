<template>
  <view class="page execute-page">
    <view class="card">
      <view class="strong">巡检信息</view>
      <input v-model.trim="inspectionItem" placeholder="巡检项目（必填）" />
      <input v-model.trim="checkPosition" placeholder="巡检位置（必填）" />
      <input v-model.trim="inspectionType" placeholder="巡检类型（必填）" />
    </view>
    <view class="check-card card"><view class="row between"><view><view class="strong">现场位置打卡</view><view class="muted location-text">{{ locationText }}</view></view><view class="locate" :class="{checked:Boolean(draft.checkedAt),loading:locating}" @click="checkIn">{{ locating?'…':draft.checkedAt?'✓':'⌖' }}</view></view><view v-if="locationError" class="location-error">{{ locationError }}</view><view v-else-if="!draft.checkedAt" class="location-tip">H5 自动定位需要 HTTPS；localhost 调试不受此限制。</view></view>
    <view class="section-title">巡检结论</view><view class="result-options"><view :class="{active:draft.result==='NORMAL'}" @click="setResult('NORMAL')"><text>✓</text><view><view class="strong">正常</view><view class="muted">未发现异常</view></view></view><view class="abnormal" :class="{active:draft.result==='ABNORMAL'}" @click="setResult('ABNORMAL')"><text>!</text><view><view class="strong">异常</view><view class="muted">发现安全隐患</view></view></view></view>
    <view class="section-title">现场照片</view>
    <view class="photo-grid">
      <view v-for="(photo,index) in existingPhotos" :key="photo.path" class="photo"><image v-if="photo.url" :src="photo.url" mode="aspectFill" @click="previewPhoto(photo.url)"/><view v-else class="photo-unavailable">加载失败</view><view class="photo-tag">已上传</view><view class="remove" @click="removeExistingPhoto(index)">×</view></view>
      <view v-for="(photo,index) in draft.photos" :key="photo" class="photo"><image :src="photo" mode="aspectFill" @click="previewPhoto(photo)"/><view class="photo-tag local">待上传</view><view class="remove" @click="removePhoto(index)">×</view></view>
      <view v-if="photoCount<6" class="add-photo" @click="choosePhoto"><view>＋</view><text>拍照/选择</text></view>
    </view>
    <view class="muted photo-note">最多 6 张；新增照片将先上传，成功后再保存巡检记录。</view>
    <view class="section-title">巡检说明</view><view class="card textarea-card"><textarea v-model="draft.remark" maxlength="500" placeholder="请记录设备状况、异常现象和处理建议" @input="saveDraft"/><view class="muted word-count">{{ draft.remark.length }}/500</view></view>
    <view class="actions"><button class="btn-ghost" @click="saveOnly">保存草稿</button><button class="btn-primary" :loading="submitting" @click="submit">提交巡检</button></view>
  </view>
</template>
<script setup lang="ts">
import { computed,reactive,ref } from 'vue';import { onLoad,onUnload } from '@dcloudio/uni-app';import { useAuthStore } from '@/stores/auth';import { useInspectionDraftStore,type InspectionDraft } from '@/stores/inspectionDraft';import { saveInspection, updateInspection, getInspection } from '@/api/inspection';import { loadInspectionPhoto,releaseInspectionPhoto } from '@/utils/photos'
const auth=useAuthStore(),draftStore=useInspectionDraftStore(),taskId=ref(''),submitting=ref(false),locating=ref(false),locationText=ref('尚未打卡'),locationError=ref(''),draft=reactive<InspectionDraft>({taskId:'',result:'',remark:'',photos:[]})
const inspectionItem=ref(''),checkPosition=ref(''),inspectionType=ref('日常巡检')
const existingPhotos=ref<Array<{path:string;url:string}>>([]),coordinate=ref(''),inspectionTime=ref('')
const photoCount=computed(()=>existingPhotos.value.length+draft.photos.length)
function saveDraft(){draftStore.save({...draft})}
function setResult(v:'NORMAL'|'ABNORMAL'){draft.result=v;saveDraft()}
function isInsecureH5Location(){
  // #ifdef H5
  return typeof window!=='undefined'&&!window.isSecureContext
  // #endif
  return false
}
function locationFailureMessage(message:string){
  const text=message.toLowerCase()
  if(text.includes('permission')||text.includes('denied')||text.includes('auth'))return '浏览器未授予位置权限，请在地址栏的网站权限中允许“位置”后重试。'
  if(text.includes('timeout'))return '定位请求超时，请确认设备定位服务已开启并在室外或信号良好处重试。'
  if(text.includes('unavailable'))return '设备暂时无法取得位置，请检查系统定位服务和网络后重试。'
  return '定位失败，请检查浏览器位置权限和系统定位服务后重试。'
}
function checkIn(){
  if(locating.value)return
  locationError.value=''
  if(isInsecureH5Location()){
    locationError.value='当前页面使用 HTTP，浏览器已禁止获取位置。请改用 HTTPS 地址访问后重试。'
    uni.showModal({title:'当前地址不支持定位',content:'H5 自动定位只能在 HTTPS 或 localhost 中使用。当前局域网 HTTP 地址会被浏览器直接拦截，请为正式站点配置 HTTPS。',showCancel:false})
    return
  }
  locating.value=true
  uni.getLocation({type:'gcj02',isHighAccuracy:true,highAccuracyExpireTime:10000,success:r=>{draft.longitude=r.longitude;draft.latitude=r.latitude;draft.checkedAt=new Date().toISOString();coordinate.value=`${r.latitude},${r.longitude}`;inspectionTime.value=draft.checkedAt;locationText.value=`已定位 ${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`;locationError.value='';saveDraft()},fail:error=>{locationError.value=locationFailureMessage(String(error.errMsg||''));uni.showModal({title:'现场定位失败',content:locationError.value,showCancel:false})},complete:()=>{locating.value=false}})
}
function choosePhoto(){if(photoCount.value>=6){uni.showToast({title:'最多选择6张照片',icon:'none'});return}uni.chooseImage({count:Math.max(1,6-photoCount.value),sourceType:['camera','album'],success:r=>{draft.photos.push(...r.tempFilePaths);saveDraft()}})}
function removePhoto(i:number){draft.photos.splice(i,1);saveDraft()}
function removeExistingPhoto(i:number){const [removed]=existingPhotos.value.splice(i,1);if(removed?.url)releaseInspectionPhoto(removed.url)}
function previewPhoto(url:string){const urls=[...existingPhotos.value.map(item=>item.url).filter(Boolean),...draft.photos];if(url)uni.previewImage({urls,current:url})}
function saveOnly(){saveDraft();uni.showToast({title:'草稿已保存',icon:'success'})}
async function submit(){if(submitting.value)return;if(!draft.checkedAt&&!coordinate.value){uni.showToast({title:'请先完成位置打卡',icon:'none'});return}if(!draft.result){uni.showToast({title:'请选择巡检结论',icon:'none'});return}if(draft.result==='ABNORMAL'&&!draft.remark.trim()){uni.showToast({title:'异常巡检必须填写说明',icon:'none'});return}submitting.value=true;try{await (taskId.value ? updateInspection : saveInspection)({id:taskId.value,...draft,coordinate:coordinate.value,inspectionTime:inspectionTime.value,inspectionItem:inspectionItem.value,checkPosition:checkPosition.value,inspectionType:inspectionType.value,inspector:auth.displayName,photoPaths:existingPhotos.value.map(item=>item.path),attachmentLocalPaths:draft.photos});draftStore.remove(taskId.value);uni.showToast({title:'巡检提交成功',icon:'success'});setTimeout(()=>uni.switchTab({url:'/pages/inspection/index'}),500)}catch(e){uni.showToast({title:e instanceof Error?e.message:'提交失败，草稿已保留',icon:'none'})}finally{submitting.value=false}}
async function loadExistingPhotos(paths:string[]){let failed=false;for(const path of paths){const photo={path,url:''};existingPhotos.value.push(photo);try{photo.url=await loadInspectionPhoto(path)}catch{failed=true}}if(failed)uni.showToast({title:'部分历史照片加载失败',icon:'none'})}
function draftResult(value:unknown):InspectionDraft['result']{const text=String(value??'').toUpperCase();if(text==='异常'||text==='ABNORMAL')return 'ABNORMAL';if(text==='正常'||text==='NORMAL')return 'NORMAL';return ''}
onLoad(async o=>{taskId.value=String(o?.id||'');uni.setNavigationBarTitle({title:taskId.value?'编辑巡检记录':'新增巡检记录'});Object.assign(draft,draftStore.get(taskId.value));draft.taskId=taskId.value;if(draft.checkedAt)locationText.value='已完成现场定位';if(taskId.value){try{const item=await getInspection(taskId.value);inspectionItem.value=item.title||'';checkPosition.value=item.location||'';inspectionType.value=String(item.inspectionType||'日常巡检');coordinate.value=String(item.coordinate||'');inspectionTime.value=String(item.inspectionTime||item.time||'');if(!draft.result)draft.result=draftResult(item.result);if(!draft.remark)draft.remark=String(item.issueDescription||item.remark||'');if(!draft.checkedAt&&coordinate.value)draft.checkedAt=inspectionTime.value||'已保存';if(coordinate.value)locationText.value=`已定位 ${coordinate.value}`;await loadExistingPhotos(Array.isArray(item.photoPaths)?item.photoPaths:[])}catch{uni.showToast({title:'巡检信息加载失败，请返回重试',icon:'none'})}}})
onUnload(()=>existingPhotos.value.forEach(item=>item.url&&releaseInspectionPhoto(item.url)))
</script>
<style scoped>.check-card{border:2rpx solid #d8ebe7}.location-text{font-size:21rpx;margin-top:9rpx}.location-tip,.location-error{margin-top:18rpx;padding-top:16rpx;border-top:1rpx solid #e4efed;font-size:20rpx;line-height:1.55}.location-tip{color:#71807e}.location-error{color:#b35c18}.locate{width:82rpx;height:82rpx;display:grid;place-items:center;border-radius:50%;font-size:34rpx;color:#087f72;background:#e7f6f3}.locate.checked{color:#fff;background:#087f72}.locate.loading{opacity:.65}.result-options{display:grid;grid-template-columns:1fr 1fr;gap:16rpx}.result-options>view{display:flex;align-items:center;gap:18rpx;padding:24rpx;border:2rpx solid transparent;border-radius:22rpx;background:#fff}.result-options>view>text{width:54rpx;height:54rpx;display:grid;place-items:center;border-radius:16rpx;color:#087f72;background:#e7f6f3}.result-options .active{border-color:#087f72;background:#f1fbf8}.result-options .abnormal>text{color:#c56d16;background:#fff0dc}.result-options .abnormal.active{border-color:#d17a21;background:#fffaf3}.result-options .muted{font-size:20rpx;margin-top:5rpx}.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14rpx}.photo,.add-photo{position:relative;height:190rpx;border-radius:18rpx;overflow:hidden}.photo image{width:100%;height:100%}.photo-unavailable{height:100%;display:grid;place-items:center;color:#84928f;background:#eaf0ef;font-size:20rpx}.photo-tag{position:absolute;left:7rpx;bottom:7rpx;padding:5rpx 9rpx;border-radius:8rpx;color:#fff;background:#087f72d9;font-size:17rpx}.photo-tag.local{background:#b36c18df}.remove{position:absolute;right:8rpx;top:8rpx;width:38rpx;height:38rpx;line-height:35rpx;text-align:center;border-radius:50%;color:#fff;background:rgba(0,0,0,.55)}.add-photo{display:grid;place-content:center;text-align:center;color:#71807e;border:2rpx dashed #b8cfca;background:#f8fbfa}.add-photo view{font-size:50rpx;line-height:1}.add-photo text{font-size:20rpx;margin-top:8rpx}.photo-note{font-size:20rpx;margin-top:12rpx}.textarea-card textarea{width:100%;height:220rpx;font-size:25rpx}.word-count{text-align:right;font-size:20rpx}.actions{display:grid;grid-template-columns:1fr 1.6fr;gap:16rpx;margin-top:30rpx;padding-bottom:25rpx}</style>
