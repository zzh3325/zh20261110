<template>
  <view class="page execute-page">
    <view class="card">
      <view class="strong">巡检信息</view>
      <input v-model.trim="inspectionItem" placeholder="巡检项目（必填）" />
      <input v-model.trim="checkPosition" placeholder="巡检位置（必填）" />
      <input v-model.trim="inspectionType" placeholder="巡检类型（必填）" />
    </view>
    <view class="check-card card">
      <view class="strong">现场位置打卡</view>
      <view class="location-modes">
        <view :class="{active:locationMode==='auto'}" @click="selectLocationMode('auto')">现场定位</view>
        <view :class="{active:locationMode==='manual'}" @click="selectLocationMode('manual')">手动输入</view>
      </view>
      <view v-if="locationMode==='auto'" class="row between location-panel">
        <view><view class="muted location-text">{{ locationText }}</view><view class="location-tip compact">使用当前设备的定位服务获取经纬度</view></view>
        <view class="locate" :class="{checked:Boolean(draft.checkedAt),loading:locating}" @click="checkIn">{{ locating?'…':draft.checkedAt?'✓':'⌖' }}</view>
      </view>
      <view v-else class="manual-location">
        <view class="manual-fields">
          <view><text>纬度</text><input v-model.trim="manualLatitude" type="digit" placeholder="例如 28.669289" /></view>
          <view><text>经度</text><input v-model.trim="manualLongitude" type="digit" placeholder="例如 102.193071" /></view>
        </view>
        <button class="manual-confirm" @click="applyManualLocation">确认手动位置</button>
        <view class="location-tip compact">位置名称请在上方“巡检位置”填写；手动坐标会随巡检记录提交。</view>
      </view>
      <view v-if="locationError" class="location-error">{{ locationError }}</view>
    </view>
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
const auth=useAuthStore(),draftStore=useInspectionDraftStore(),taskId=ref(''),submitting=ref(false),locating=ref(false),locationMode=ref<'auto'|'manual'>('auto'),locationText=ref('尚未打卡'),locationError=ref(''),manualLatitude=ref(''),manualLongitude=ref(''),draft=reactive<InspectionDraft>({taskId:'',result:'',remark:'',photos:[]})
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
function selectLocationMode(mode:'auto'|'manual'){
  locationMode.value=mode
  locationError.value=''
}
function applyManualLocation(){
  if(!manualLatitude.value.trim()){uni.showToast({title:'请输入纬度',icon:'none'});return}
  if(!manualLongitude.value.trim()){uni.showToast({title:'请输入经度',icon:'none'});return}
  const latitude=Number(manualLatitude.value),longitude=Number(manualLongitude.value)
  if(!Number.isFinite(latitude)||latitude < -90||latitude > 90){uni.showToast({title:'请输入 -90 至 90 的有效纬度',icon:'none'});return}
  if(!Number.isFinite(longitude)||longitude < -180||longitude > 180){uni.showToast({title:'请输入 -180 至 180 的有效经度',icon:'none'});return}
  draft.latitude=latitude;draft.longitude=longitude;draft.checkedAt=new Date().toISOString();coordinate.value=`${latitude},${longitude}`;inspectionTime.value=draft.checkedAt;locationText.value=`已手动录入 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;locationError.value='';saveDraft();uni.showToast({title:'手动位置已确认',icon:'success'})
}
function checkIn(){
  if(locating.value)return
  locationError.value=''
  if(isInsecureH5Location()){
    locationError.value='当前页面使用 HTTP，浏览器禁止自动定位，请手动输入经纬度。'
    uni.showModal({title:'自动定位不可用',content:'当前 IP 地址通过 HTTP 访问，浏览器禁止获取位置。可以改为手动输入经纬度。',showCancel:false,success:()=>{locationMode.value='manual'}})
    return
  }
  locating.value=true
  uni.getLocation({type:'gcj02',isHighAccuracy:true,highAccuracyExpireTime:10000,success:r=>{draft.longitude=r.longitude;draft.latitude=r.latitude;draft.checkedAt=new Date().toISOString();coordinate.value=`${r.latitude},${r.longitude}`;inspectionTime.value=draft.checkedAt;manualLatitude.value=String(r.latitude);manualLongitude.value=String(r.longitude);locationText.value=`已现场定位 ${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`;locationError.value='';saveDraft()},fail:error=>{locationError.value=locationFailureMessage(String(error.errMsg||''));uni.showModal({title:'现场定位失败',content:`${locationError.value}\n也可以切换到“手动输入”。`,confirmText:'手动输入',cancelText:'取消',success:result=>{if(result.confirm)locationMode.value='manual'}})},complete:()=>{locating.value=false}})
}
function choosePhoto(){if(photoCount.value>=6){uni.showToast({title:'最多选择6张照片',icon:'none'});return}uni.chooseImage({count:Math.max(1,6-photoCount.value),sourceType:['camera','album'],success:r=>{draft.photos.push(...r.tempFilePaths);saveDraft()}})}
function removePhoto(i:number){draft.photos.splice(i,1);saveDraft()}
function removeExistingPhoto(i:number){const [removed]=existingPhotos.value.splice(i,1);if(removed?.url)releaseInspectionPhoto(removed.url)}
function previewPhoto(url:string){const urls=[...existingPhotos.value.map(item=>item.url).filter(Boolean),...draft.photos];if(url)uni.previewImage({urls,current:url})}
function saveOnly(){saveDraft();uni.showToast({title:'草稿已保存',icon:'success'})}
async function submit(){if(submitting.value)return;if(!draft.checkedAt&&!coordinate.value){uni.showToast({title:'请先完成位置打卡',icon:'none'});return}if(!draft.result){uni.showToast({title:'请选择巡检结论',icon:'none'});return}if(draft.result==='ABNORMAL'&&!draft.remark.trim()){uni.showToast({title:'异常巡检必须填写说明',icon:'none'});return}submitting.value=true;try{await (taskId.value ? updateInspection : saveInspection)({id:taskId.value,...draft,coordinate:coordinate.value,inspectionTime:inspectionTime.value,inspectionItem:inspectionItem.value,checkPosition:checkPosition.value,inspectionType:inspectionType.value,inspector:auth.displayName,photoPaths:existingPhotos.value.map(item=>item.path),attachmentLocalPaths:draft.photos});draftStore.remove(taskId.value);uni.showToast({title:'巡检提交成功',icon:'success'});setTimeout(()=>uni.switchTab({url:'/pages/inspection/index'}),500)}catch(e){uni.showToast({title:e instanceof Error?e.message:'提交失败，草稿已保留',icon:'none'})}finally{submitting.value=false}}
async function loadExistingPhotos(paths:string[]){let failed=false;for(const path of paths){const photo={path,url:''};existingPhotos.value.push(photo);try{photo.url=await loadInspectionPhoto(path)}catch{failed=true}}if(failed)uni.showToast({title:'部分历史照片加载失败',icon:'none'})}
function draftResult(value:unknown):InspectionDraft['result']{const text=String(value??'').toUpperCase();if(text==='异常'||text==='ABNORMAL')return 'ABNORMAL';if(text==='正常'||text==='NORMAL')return 'NORMAL';return ''}
function fillManualCoordinate(value:string){const match=value.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*$/);if(match){manualLatitude.value=match[1];manualLongitude.value=match[2]}}
onLoad(async o=>{taskId.value=String(o?.id||'');uni.setNavigationBarTitle({title:taskId.value?'编辑巡检记录':'新增巡检记录'});Object.assign(draft,draftStore.get(taskId.value));draft.taskId=taskId.value;if(Number.isFinite(draft.latitude))manualLatitude.value=String(draft.latitude);if(Number.isFinite(draft.longitude))manualLongitude.value=String(draft.longitude);if(draft.checkedAt)locationText.value=`已记录坐标 ${draft.latitude??''}, ${draft.longitude??''}`;if(taskId.value){try{const item=await getInspection(taskId.value);inspectionItem.value=item.title||'';checkPosition.value=item.location||'';inspectionType.value=String(item.inspectionType||'日常巡检');coordinate.value=String(item.coordinate||'');inspectionTime.value=String(item.inspectionTime||item.time||'');if(!draft.result)draft.result=draftResult(item.result);if(!draft.remark)draft.remark=String(item.issueDescription||item.remark||'');if(!draft.checkedAt&&coordinate.value)draft.checkedAt=inspectionTime.value||'已保存';if(coordinate.value){fillManualCoordinate(coordinate.value);locationText.value=`已记录坐标 ${coordinate.value}`}await loadExistingPhotos(Array.isArray(item.photoPaths)?item.photoPaths:[])}catch{uni.showToast({title:'巡检信息加载失败，请返回重试',icon:'none'})}}})
onUnload(()=>existingPhotos.value.forEach(item=>item.url&&releaseInspectionPhoto(item.url)))
</script>
<style scoped>.check-card{border:2rpx solid #d8ebe7}.location-modes{display:grid;grid-template-columns:1fr 1fr;gap:8rpx;margin-top:22rpx;padding:7rpx;border-radius:16rpx;background:#e9f1ef}.location-modes view{padding:15rpx;text-align:center;border-radius:12rpx;color:#687875;font-size:23rpx}.location-modes .active{color:#087f72;background:#fff;font-weight:750;box-shadow:0 4rpx 12rpx rgba(20,92,82,.08)}.location-panel{padding-top:20rpx}.location-text{font-size:22rpx}.location-tip,.location-error{font-size:20rpx;line-height:1.55}.location-tip{color:#71807e}.location-tip.compact{margin-top:8rpx}.location-error{margin-top:18rpx;padding-top:16rpx;border-top:1rpx solid #e4efed;color:#b35c18}.locate{flex:none;width:82rpx;height:82rpx;display:grid;place-items:center;border-radius:50%;font-size:34rpx;color:#087f72;background:#e7f6f3}.locate.checked{color:#fff;background:#087f72}.locate.loading{opacity:.65}.manual-location{padding-top:20rpx}.manual-fields{display:grid;grid-template-columns:1fr 1fr;gap:14rpx}.manual-fields>view{padding:15rpx 18rpx;border:1rpx solid #d9e8e5;border-radius:15rpx;background:#f4f9f8}.manual-fields text{display:block;color:#71807e;font-size:19rpx}.manual-fields input{height:54rpx;margin-top:3rpx;font-size:24rpx}.manual-confirm{height:72rpx;line-height:72rpx;margin-top:14rpx;border-radius:14rpx;color:#fff;background:#087f72;font-size:24rpx}.manual-confirm::after{border:0}.result-options{display:grid;grid-template-columns:1fr 1fr;gap:16rpx}.result-options>view{display:flex;align-items:center;gap:18rpx;padding:24rpx;border:2rpx solid transparent;border-radius:22rpx;background:#fff}.result-options>view>text{width:54rpx;height:54rpx;display:grid;place-items:center;border-radius:16rpx;color:#087f72;background:#e7f6f3}.result-options .active{border-color:#087f72;background:#f1fbf8}.result-options .abnormal>text{color:#c56d16;background:#fff0dc}.result-options .abnormal.active{border-color:#d17a21;background:#fffaf3}.result-options .muted{font-size:20rpx;margin-top:5rpx}.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14rpx}.photo,.add-photo{position:relative;height:190rpx;border-radius:18rpx;overflow:hidden}.photo image{width:100%;height:100%}.photo-unavailable{height:100%;display:grid;place-items:center;color:#84928f;background:#eaf0ef;font-size:20rpx}.photo-tag{position:absolute;left:7rpx;bottom:7rpx;padding:5rpx 9rpx;border-radius:8rpx;color:#fff;background:#087f72d9;font-size:17rpx}.photo-tag.local{background:#b36c18df}.remove{position:absolute;right:8rpx;top:8rpx;width:38rpx;height:38rpx;line-height:35rpx;text-align:center;border-radius:50%;color:#fff;background:rgba(0,0,0,.55)}.add-photo{display:grid;place-content:center;text-align:center;color:#71807e;border:2rpx dashed #b8cfca;background:#f8fbfa}.add-photo view{font-size:50rpx;line-height:1}.add-photo text{font-size:20rpx;margin-top:8rpx}.photo-note{font-size:20rpx;margin-top:12rpx}.textarea-card textarea{width:100%;height:220rpx;font-size:25rpx}.word-count{text-align:right;font-size:20rpx}.actions{display:grid;grid-template-columns:1fr 1.6fr;gap:16rpx;margin-top:30rpx;padding-bottom:25rpx}</style>
